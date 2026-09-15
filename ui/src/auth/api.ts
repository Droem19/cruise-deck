import type { AuthApp, AuthResponse, AuthUser, MeResponse, MessageResponse, SignUpRequest, SignUpResponse } from 'api';
import { hc } from 'hono/client';

const apiUrl = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8787' : window.location.origin);

let refreshPromise: Promise<boolean> | null = null;

const refreshSession = async () => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
    })
        .then((response) => response.ok)
        .catch(() => false)
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
};

const authFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, { ...init, credentials: 'include' });

    if (response.status !== 401 || input.toString().includes('/auth/refresh')) {
        return response;
    }

    const refreshed = await refreshSession();

    if (!refreshed) return response;

    return fetch(input, { ...init, credentials: 'include' });
};

export const client = hc<AuthApp>(apiUrl, {
    fetch: authFetch,
    init: { credentials: 'include' },
});

const throwApiError = async (response: Response) => {
    const fallbackMessage = response.statusText || 'The request failed.';

    try {
        const data = (await response.json()) as Partial<MessageResponse>;

        throw new Error(typeof data.message === 'string' ? data.message : fallbackMessage);
    } catch (error) {
        if (error instanceof Error) throw error;

        throw new Error(fallbackMessage);
    }
};

const parseResponse = async <ResponseBody>(response: Response) => {
    if (!response.ok) {
        await throwApiError(response);
    }

    return response.json() as Promise<ResponseBody>;
};

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
};

export type { AuthUser, SignUpRequest };
