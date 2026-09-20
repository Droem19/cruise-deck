import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { cors } from 'hono/cors';

import type { ListSailingsResponse } from '../contracts/types';
import { errorHandler, getAllowedOrigins } from '../lib/api-helper';
import { readUserFromCookies } from '../lib/auth-service';
import { listSailingsForUser } from '../lib/sailing-service';

export const app = new Hono();

app.use(
    '*',
    cors({
        origin: getAllowedOrigins(),
        credentials: true,
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: ['GET', 'OPTIONS'],
    })
);
app.onError(errorHandler);

const routes = app.get('/sailings', async (context) => {
    const user = await readUserFromCookies(context);
    const sailings = await listSailingsForUser(user.sub);

    return context.json<ListSailingsResponse>({ sailings });
});

export type SailingsApp = typeof routes;

export const handler = handle(app);
