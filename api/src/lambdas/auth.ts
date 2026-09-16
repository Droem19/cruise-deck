import {
    ConfirmForgotPasswordCommand,
    ConfirmSignUpCommand,
    ForgotPasswordCommand,
    GlobalSignOutCommand,
    InitiateAuthCommand,
    NotAuthorizedException,
    ResendConfirmationCodeCommand,
    SignUpCommand,
    UserNotConfirmedException,
    UserNotFoundException,
    UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { getCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';

import type { AuthResponse, MeResponse, MessageResponse, SignUpResponse } from '../contracts/types';
import {
    confirmForgotPasswordValidator,
    emailCodeValidator,
    emailPasswordValidator,
    emailValidator,
    signUpValidator,
    updateProfileValidator,
} from '../contracts/validators';
import { corsMiddleware, errorHandler } from '../lib/api-helpers';
import {
    clearAuthCookies,
    cookieNames,
    friendlyCognitoError,
    getCognitoClient,
    getCognitoConfig,
    readUserProfileFromCookies,
    setAuthenticationResultCookies,
    updateUserProfileFromCookies,
} from '../lib/cognito';

export const app = new Hono();

app.use('*', corsMiddleware);
app.onError(errorHandler);

const routes = app
    .get('/health', (context) => {
        return context.json({ ok: true });
    })
    .post('/auth/signup', signUpValidator, async (context) => {
        const { email, firstName, lastName, password } = context.req.valid('json');
        const config = getCognitoConfig();
        const client = getCognitoClient(config.region);

        try {
            const response = await client.send(
                new SignUpCommand({
                    ClientId: config.clientId,
                    Username: email,
                    Password: password,
                    UserAttributes: [
                        { Name: 'email', Value: email },
                        { Name: 'given_name', Value: firstName },
                        { Name: 'family_name', Value: lastName },
                    ],
                })
            );

            return context.json<SignUpResponse>({
                userConfirmed: response.UserConfirmed ?? false,
                message: response.UserConfirmed
                    ? 'Account created. You can sign in now.'
                    : 'Account created. Check your email for a verification code.',
            });
        } catch (error) {
            if (error instanceof UsernameExistsException) {
                throw new HTTPException(409, { message: 'An account with this email already exists.' });
            }

            throw friendlyCognitoError(error) ?? error;
        }
    })
    .post('/auth/confirm-signup', emailCodeValidator, async (context) => {
        const { email, code } = context.req.valid('json');
        const config = getCognitoConfig();
        const client = getCognitoClient(config.region);

        try {
            await client.send(
                new ConfirmSignUpCommand({
                    ClientId: config.clientId,
                    Username: email,
                    ConfirmationCode: code,
                })
            );

            return context.json<MessageResponse>({ message: 'Account verified. You can sign in now.' });
        } catch (error) {
            if (error instanceof UserNotFoundException) {
                throw new HTTPException(404, { message: 'User not found.' });
            }

            throw friendlyCognitoError(error) ?? error;
        }
    })
    .post('/auth/resend-code', emailValidator, async (context) => {
        const { email } = context.req.valid('json');
        const config = getCognitoConfig();
        const client = getCognitoClient(config.region);

        try {
            await client.send(
                new ResendConfirmationCodeCommand({
                    ClientId: config.clientId,
                    Username: email,
                })
            );

            return context.json<MessageResponse>({ message: 'Verification code sent.' });
        } catch (error) {
            if (error instanceof UserNotFoundException) {
                throw new HTTPException(404, { message: 'User not found.' });
            }

            throw friendlyCognitoError(error) ?? error;
        }
    })
    .post('/auth/login', emailPasswordValidator, async (context) => {
        const { email, password } = context.req.valid('json');
        const config = getCognitoConfig();
        const client = getCognitoClient(config.region);

        try {
            const result = await client.send(
                new InitiateAuthCommand({
                    AuthFlow: 'USER_PASSWORD_AUTH',
                    ClientId: config.clientId,
                    AuthParameters: {
                        USERNAME: email,
                        PASSWORD: password,
                    },
                })
            );

            if (result.ChallengeName) {
                throw new HTTPException(400, {
                    message: `Unsupported authentication challenge: ${result.ChallengeName}.`,
                });
            }

            if (!result.AuthenticationResult) {
                throw new HTTPException(500, { message: 'Authentication failed.' });
            }

            const user = await setAuthenticationResultCookies(context, result.AuthenticationResult);

            return context.json<AuthResponse>({ user });
        } catch (error) {
            if (error instanceof HTTPException) throw error;
            if (error instanceof NotAuthorizedException || error instanceof UserNotFoundException) {
                throw new HTTPException(401, { message: 'Invalid email or password.' });
            }
            if (error instanceof UserNotConfirmedException) {
                throw new HTTPException(403, { message: 'Please verify your email before signing in.' });
            }

            throw friendlyCognitoError(error) ?? error;
        }
    })
    .post('/auth/refresh', async (context) => {
        const refreshToken = getCookie(context, cookieNames.refreshToken);

        if (!refreshToken) {
            throw new HTTPException(401, { message: 'Unauthorized' });
        }

        const config = getCognitoConfig();
        const client = getCognitoClient(config.region);

        try {
            const result = await client.send(
                new InitiateAuthCommand({
                    AuthFlow: 'REFRESH_TOKEN_AUTH',
                    ClientId: config.clientId,
                    AuthParameters: {
                        REFRESH_TOKEN: refreshToken,
                    },
                })
            );

            if (!result.AuthenticationResult) {
                throw new HTTPException(500, { message: 'Refresh failed.' });
            }

            const user = await setAuthenticationResultCookies(context, result.AuthenticationResult);

            return context.json<AuthResponse>({ user });
        } catch (error) {
            if (error instanceof HTTPException) throw error;
            if (error instanceof NotAuthorizedException) {
                clearAuthCookies(context);
                throw new HTTPException(401, { message: 'Unauthorized' });
            }

            throw friendlyCognitoError(error) ?? error;
        }
    })
    .post('/auth/forgot-password', emailValidator, async (context) => {
        const { email } = context.req.valid('json');
        const config = getCognitoConfig();
        const client = getCognitoClient(config.region);

        try {
            await client.send(
                new ForgotPasswordCommand({
                    ClientId: config.clientId,
                    Username: email,
                })
            );
        } catch (error) {
            if (!(error instanceof UserNotFoundException)) {
                throw friendlyCognitoError(error) ?? error;
            }
        }

        return context.json<MessageResponse>({ message: 'If the account exists, a password reset code was sent.' });
    })
    .post('/auth/confirm-forgot-password', confirmForgotPasswordValidator, async (context) => {
        const { email, code, password } = context.req.valid('json');
        const config = getCognitoConfig();
        const client = getCognitoClient(config.region);

        try {
            await client.send(
                new ConfirmForgotPasswordCommand({
                    ClientId: config.clientId,
                    Username: email,
                    ConfirmationCode: code,
                    Password: password,
                })
            );

            return context.json<MessageResponse>({ message: 'Password updated. You can sign in now.' });
        } catch (error) {
            if (error instanceof UserNotFoundException) {
                throw new HTTPException(404, { message: 'User not found.' });
            }

            throw friendlyCognitoError(error) ?? error;
        }
    })
    .post('/auth/logout', async (context) => {
        const accessToken = getCookie(context, cookieNames.accessToken);

        if (accessToken) {
            const config = getCognitoConfig();
            const client = getCognitoClient(config.region);

            try {
                await client.send(new GlobalSignOutCommand({ AccessToken: accessToken }));
            } catch {
                // Always clear local cookies even if the token is already expired or revoked.
            }
        }

        clearAuthCookies(context);

        return context.json<MessageResponse>({ message: 'Signed out.' });
    })
    .get('/me', async (context) => {
        const user = await readUserProfileFromCookies(context);

        return context.json<MeResponse>({ user });
    })
    .put('/me', updateProfileValidator, async (context) => {
        const request = context.req.valid('json');
        const user = await updateUserProfileFromCookies(context, request);

        return context.json<AuthResponse>({ user });
    });

export type AuthApp = typeof routes;
export type {
    AuthResponse,
    AuthUser,
    ConfirmForgotPasswordRequest,
    EmailCodeRequest,
    EmailPasswordRequest,
    EmailRequest,
    MeResponse,
    MessageResponse,
    SignUpRequest,
    SignUpResponse,
    UpdateProfileRequest,
} from '../contracts/types';

export const handler = handle(app);
