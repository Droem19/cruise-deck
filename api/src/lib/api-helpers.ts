import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';

import type { MessageResponse } from '../contracts/types';

export const readEnv = (name: string) => {
    const runtime = globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
    };

    return runtime.process?.env?.[name];
};

export const getAllowedOrigins = () => {
    const configuredOrigins = readEnv('ALLOWED_ORIGINS') ?? 'http://localhost:5173';

    return configuredOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
};

export const corsMiddleware = cors({
    origin: getAllowedOrigins(),
    credentials: true,
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
});

export const errorHandler = (error: Error, context: Context) => {
    if (error instanceof HTTPException) {
        return context.json<MessageResponse>({ message: error.message }, error.status);
    }

    console.error(error);
    return context.json<MessageResponse>({ message: 'Internal server error.' }, 500);
};
