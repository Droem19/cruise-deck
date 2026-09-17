import { validator } from 'hono/validator';

import type {
    ConfirmForgotPasswordRequest,
    CreateTravelerRequest,
    EmailCodeRequest,
    EmailPasswordRequest,
    EmailRequest,
    MessageResponse,
    SignUpRequest,
    UpdateProfileRequest,
    UpdateTravelerRequest,
} from './types';

const readStringField = (body: unknown, fieldName: string) => {
    if (!body || typeof body !== 'object' || !(fieldName in body)) return undefined;

    const value = (body as Record<string, unknown>)[fieldName];

    return typeof value === 'string' ? value.trim() : undefined;
};

export const emailPasswordValidator = validator('json', (body, context) => {
    const email = readStringField(body, 'email');
    const password = readStringField(body, 'password');

    if (!email || !password) {
        return context.json<MessageResponse>({ message: 'Email and password are required.' }, 400);
    }

    return { email, password } satisfies EmailPasswordRequest;
});

export const signUpValidator = validator('json', (body, context) => {
    const email = readStringField(body, 'email');
    const password = readStringField(body, 'password');
    const firstName = readStringField(body, 'firstName');
    const lastName = readStringField(body, 'lastName');

    if (!email || !password || !firstName || !lastName) {
        return context.json<MessageResponse>(
            {
                message: 'Email, password, first name, and last name are required.',
            },
            400
        );
    }

    return { email, password, firstName, lastName } satisfies SignUpRequest;
});

export const updateProfileValidator = validator('json', (body, context) => {
    const firstName = readStringField(body, 'firstName');
    const lastName = readStringField(body, 'lastName');

    if (firstName === undefined && lastName === undefined) {
        return context.json<MessageResponse>({ message: 'At least one profile field is required.' }, 400);
    }

    return {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
    } satisfies UpdateProfileRequest;
});

export const createTravelerValidator = validator('json', (body, context) => {
    const firstName = readStringField(body, 'firstName');
    const lastName = readStringField(body, 'lastName');

    if (!firstName || !lastName) {
        return context.json<MessageResponse>({ message: 'First name and last name are required.' }, 400);
    }

    return { firstName, lastName } satisfies CreateTravelerRequest;
});

export const updateTravelerValidator = validator('json', (body, context) => {
    const firstName = readStringField(body, 'firstName');
    const lastName = readStringField(body, 'lastName');

    if (firstName === undefined && lastName === undefined) {
        return context.json<MessageResponse>({ message: 'At least one traveler field is required.' }, 400);
    }

    if (firstName !== undefined && !firstName) {
        return context.json<MessageResponse>({ message: 'First name cannot be empty.' }, 400);
    }

    if (lastName !== undefined && !lastName) {
        return context.json<MessageResponse>({ message: 'Last name cannot be empty.' }, 400);
    }

    return {
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
    } satisfies UpdateTravelerRequest;
});

export const emailCodeValidator = validator('json', (body, context) => {
    const email = readStringField(body, 'email');
    const code = readStringField(body, 'code');

    if (!email || !code) {
        return context.json<MessageResponse>({ message: 'Email and verification code are required.' }, 400);
    }

    return { email, code } satisfies EmailCodeRequest;
});

export const confirmForgotPasswordValidator = validator('json', (body, context) => {
    const email = readStringField(body, 'email');
    const code = readStringField(body, 'code');
    const password = readStringField(body, 'password');

    if (!email || !code || !password) {
        return context.json<MessageResponse>(
            {
                message: 'Email, verification code, and password are required.',
            },
            400
        );
    }

    return { email, code, password } satisfies ConfirmForgotPasswordRequest;
});

export const emailValidator = validator('json', (body, context) => {
    const email = readStringField(body, 'email');

    if (!email) {
        return context.json<MessageResponse>({ message: 'Email is required.' }, 400);
    }

    return { email } satisfies EmailRequest;
});
