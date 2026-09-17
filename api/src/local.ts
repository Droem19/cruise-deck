import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
}

const { app: authApp } = await import('./lambdas/auth.js');
const { app: offersApp } = await import('./lambdas/offers.js');
const { app: travelersApp } = await import('./lambdas/travelers.js');
const app = new Hono();

app.route('/', offersApp);
app.route('/', travelersApp);
app.route('/', authApp);

const port = Number.parseInt(process.env.PORT ?? '8787', 10);

serve({
    fetch: app.fetch,
    port,
});

console.log(`API listening on http://localhost:${port}`);
