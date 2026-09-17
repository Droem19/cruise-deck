import type {
    AuthApp,
    AuthResponse,
    AuthUser,
    MeResponse,
    MessageResponse,
    SignUpRequest,
    SignUpResponse,
    UpdateProfileRequest,
} from 'api';
import { hc } from 'hono/client';

import { apiUrl, authFetch, parseResponse } from './client';

export const client = hc<AuthApp>(apiUrl, {
    fetch: authFetch,
    init: { credentials: 'include' },
});

export const authApi = {
    login: async (email: string, password: string) => {
        const response = await client.auth.login.$post({ json: { email, password } });
        return parseResponse<AuthResponse>(response);
    },
    signUp: async (request: SignUpRequest) => {
        const response = await client.auth.signup.$post({ json: request });
        return parseResponse<SignUpResponse>(response);
    },
    confirmSignUp: async (email: string, code: string) => {
        const response = await client.auth['confirm-signup'].$post({ json: { email, code } });
        return parseResponse<MessageResponse>(response);
    },
    resendCode: async (email: string) => {
        const response = await client.auth['resend-code'].$post({ json: { email } });
        return parseResponse<MessageResponse>(response);
    },
    forgotPassword: async (email: string) => {
        const response = await client.auth['forgot-password'].$post({ json: { email } });
        return parseResponse<MessageResponse>(response);
    },
    confirmForgotPassword: async (email: string, code: string, password: string) => {
        const response = await client.auth['confirm-forgot-password'].$post({ json: { email, code, password } });
        return parseResponse<MessageResponse>(response);
    },
    logout: async () => {
        const response = await client.auth.logout.$post();
        return parseResponse<MessageResponse>(response);
    },
    me: async () => {
        const response = await client.me.$get();
        return parseResponse<MeResponse>(response);
    },
    updateProfile: async (request: UpdateProfileRequest) => {
        const response = await client.me.$put({ json: request });
        return parseResponse<AuthResponse>(response);
    },
};

export type { AuthUser, SignUpRequest, UpdateProfileRequest };
