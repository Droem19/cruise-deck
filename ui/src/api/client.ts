import type { MessageResponse } from 'api';

export const apiUrl =
    import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8787' : window.location.origin);

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

export const authFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, { ...init, credentials: 'include' });

    if (response.status !== 401 || input.toString().includes('/auth/refresh')) {
        return response;
    }

    const refreshed = await refreshSession();

    if (!refreshed) return response;

    return fetch(input, { ...init, credentials: 'include' });
};

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

export const parseResponse = async <ResponseBody>(response: Response) => {
    if (!response.ok) {
        await throwApiError(response);
    }

    return response.json() as Promise<ResponseBody>;
};
