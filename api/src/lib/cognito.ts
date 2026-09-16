import {
    type AttributeType,
    type AuthenticationResultType,
    CodeDeliveryFailureException,
    CodeMismatchException,
    CognitoIdentityProviderClient,
    ExpiredCodeException,
    GetUserCommand,
    InvalidParameterException,
    InvalidPasswordException,
    TooManyRequestsException,
    UpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';

import { readEnv } from './api-helpers';
import type { AuthUser, CognitoConfig, UpdateProfileRequest } from '../contracts/types';

export const cookieNames = {
    accessToken: 'access_token',
    idToken: 'id_token',
    refreshToken: 'refresh_token',
} as const;

let cognitoClient: CognitoIdentityProviderClient | null = null;
let cognitoClientRegion: string | null = null;
let accessTokenVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
let idTokenVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
let verifierKey: string | null = null;

const getCookieSecure = () => {
    const cookieSecure = readEnv('COOKIE_SECURE');
    if (cookieSecure) return cookieSecure === 'true';

    return Boolean(readEnv('AWS_EXECUTION_ENV'));
};

const getCookieSameSite = () => (getCookieSecure() ? 'None' : 'Lax');

export const getCognitoConfig = (): CognitoConfig => {
    const userPoolId = readEnv('USER_POOL_ID');
    const clientId = readEnv('USER_POOL_CLIENT_ID');
    const region = readEnv('USER_POOL_REGION') ?? readEnv('AWS_REGION') ?? readEnv('AWS_DEFAULT_REGION');

    if (!userPoolId || !clientId || !region) {
        throw new HTTPException(500, { message: 'Cognito is not configured.' });
    }

    return { userPoolId, clientId, region };
};

export const getCognitoClient = (region: string) => {
    if (!cognitoClient || cognitoClientRegion !== region) {
        cognitoClient = new CognitoIdentityProviderClient({ region });
        cognitoClientRegion = region;
    }

    return cognitoClient;
};

const getVerifier = (config: CognitoConfig, tokenUse: 'access' | 'id') => {
    const nextVerifierKey = `${config.userPoolId}:${config.clientId}`;

    if (verifierKey !== nextVerifierKey) {
        accessTokenVerifier = null;
        idTokenVerifier = null;
        verifierKey = nextVerifierKey;
    }

    if (tokenUse === 'access') {
        accessTokenVerifier ??= CognitoJwtVerifier.create({
            userPoolId: config.userPoolId,
            clientId: config.clientId,
            tokenUse: 'access',
        });

        return accessTokenVerifier;
    }

    idTokenVerifier ??= CognitoJwtVerifier.create({
        userPoolId: config.userPoolId,
        clientId: config.clientId,
        tokenUse: 'id',
    });

    return idTokenVerifier;
};

const setAuthCookie = (context: Parameters<typeof setCookie>[0], name: string, value: string, maxAge: number) => {
    setCookie(context, name, value, {
        httpOnly: true,
        secure: getCookieSecure(),
        sameSite: getCookieSameSite(),
        path: '/',
        maxAge,
    });
};

const readUserAttribute = (attributes: AttributeType[] | undefined, name: string) =>
    attributes?.find((attribute) => attribute.Name === name)?.Value?.trim();

const userFromCognitoAttributes = (fallbackSub: string, attributes: AttributeType[] | undefined): AuthUser => {
    const sub = readUserAttribute(attributes, 'sub') || fallbackSub;
    const email = readUserAttribute(attributes, 'email');
    const name = readUserAttribute(attributes, 'name');
    const givenName = readUserAttribute(attributes, 'given_name');
    const familyName = readUserAttribute(attributes, 'family_name');

    if (!sub || !email) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }

    return {
        sub,
        email,
        emailVerified: readUserAttribute(attributes, 'email_verified') === 'true',
        ...(name ? { name } : {}),
        ...(givenName ? { givenName } : {}),
        ...(familyName ? { familyName } : {}),
    };
};

export const clearAuthCookies = (context: Parameters<typeof setCookie>[0]) => {
    for (const name of Object.values(cookieNames)) {
        setAuthCookie(context, name, '', 0);
    }
};

const userFromTokens = async (accessToken: string, idToken: string): Promise<AuthUser> => {
    const config = getCognitoConfig();
    const accessPayload = await getVerifier(config, 'access').verify(accessToken);
    const idPayload = await getVerifier(config, 'id').verify(idToken);
    const email = typeof idPayload.email === 'string' ? idPayload.email : undefined;
    const name = typeof idPayload.name === 'string' ? idPayload.name : undefined;
    const givenName = typeof idPayload.given_name === 'string' ? idPayload.given_name : undefined;
    const familyName = typeof idPayload.family_name === 'string' ? idPayload.family_name : undefined;

    if (!accessPayload.sub || !email) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }

    return {
        sub: accessPayload.sub,
        email,
        emailVerified: idPayload.email_verified === true || idPayload.email_verified === 'true',
        ...(name ? { name } : {}),
        ...(givenName ? { givenName } : {}),
        ...(familyName ? { familyName } : {}),
    };
};

export const setAuthenticationResultCookies = (
    context: Parameters<typeof setCookie>[0],
    authenticationResult: AuthenticationResultType
) => {
    const { AccessToken, ExpiresIn, IdToken, RefreshToken } = authenticationResult;

    if (!AccessToken || !ExpiresIn || !IdToken) {
        throw new HTTPException(500, { message: 'Authentication failed.' });
    }

    setAuthCookie(context, cookieNames.accessToken, AccessToken, ExpiresIn);
    setAuthCookie(context, cookieNames.idToken, IdToken, ExpiresIn);

    if (RefreshToken) {
        setAuthCookie(context, cookieNames.refreshToken, RefreshToken, 60 * 60 * 24 * 30);
    }

    return userFromTokens(AccessToken, IdToken);
};

export const readUserFromCookies = async (context: Parameters<typeof getCookie>[0]) => {
    const accessToken = getCookie(context, cookieNames.accessToken);
    const idToken = getCookie(context, cookieNames.idToken);

    if (!accessToken || !idToken) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }

    try {
        return await userFromTokens(accessToken, idToken);
    } catch (error) {
        if (error instanceof HTTPException) throw error;

        throw new HTTPException(401, { message: 'Unauthorized' });
    }
};

export const readUserProfileFromCookies = async (context: Parameters<typeof getCookie>[0]) => {
    const accessToken = getCookie(context, cookieNames.accessToken);

    if (!accessToken) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }

    try {
        const config = getCognitoConfig();
        const accessPayload = await getVerifier(config, 'access').verify(accessToken);
        const response = await getCognitoClient(config.region).send(new GetUserCommand({ AccessToken: accessToken }));

        return userFromCognitoAttributes(accessPayload.sub, response.UserAttributes);
    } catch (error) {
        if (error instanceof HTTPException) throw error;

        throw new HTTPException(401, { message: 'Unauthorized' });
    }
};

export const updateUserProfileFromCookies = async (
    context: Parameters<typeof getCookie>[0],
    request: UpdateProfileRequest
) => {
    const accessToken = getCookie(context, cookieNames.accessToken);

    if (!accessToken) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }

    const config = getCognitoConfig();

    try {
        await getVerifier(config, 'access').verify(accessToken);
        const userAttributes: AttributeType[] = [];

        if (request.firstName !== undefined) userAttributes.push({ Name: 'given_name', Value: request.firstName });
        if (request.lastName !== undefined) userAttributes.push({ Name: 'family_name', Value: request.lastName });

        await getCognitoClient(config.region).send(
            new UpdateUserAttributesCommand({
                AccessToken: accessToken,
                UserAttributes: userAttributes,
            })
        );

        return readUserProfileFromCookies(context);
    } catch (error) {
        if (error instanceof HTTPException) throw error;

        throw friendlyCognitoError(error) ?? error;
    }
};

export const friendlyCognitoError = (error: unknown) => {
    if (error instanceof InvalidPasswordException) {
        return new HTTPException(400, { message: error.message || 'Password does not meet the required policy.' });
    }
    if (error instanceof InvalidParameterException) {
        return new HTTPException(400, { message: error.message || 'Invalid request.' });
    }
    if (error instanceof CodeMismatchException) {
        return new HTTPException(400, { message: 'Invalid verification code.' });
    }
    if (error instanceof ExpiredCodeException) {
        return new HTTPException(400, { message: 'Verification code has expired.' });
    }
    if (error instanceof TooManyRequestsException) {
        return new HTTPException(429, { message: 'Too many requests. Please try again later.' });
    }
    if (error instanceof CodeDeliveryFailureException) {
        return new HTTPException(503, { message: 'Unable to send a verification code right now.' });
    }

    return null;
};
