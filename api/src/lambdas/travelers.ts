import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

import type { ListTravelersResponse, MessageResponse, TravelerResponse } from '../contracts/types';
import { createTravelerValidator, updateTravelerValidator } from '../contracts/validators';
import { corsMiddleware, errorHandler } from '../lib/api-helpers';
import { readUserFromCookies, readUserProfileFromCookies } from '../lib/cognito';
import { createTraveler, deleteTraveler, listTravelersForUser, updateTraveler } from '../lib/traveler-service';

export const app = new Hono();

app.use('*', corsMiddleware);
app.onError(errorHandler);

const routes = app
    .get('/travelers', async (context) => {
        const user = await readUserProfileFromCookies(context);
        const travelers = await listTravelersForUser(user);

        return context.json<ListTravelersResponse>({ travelers });
    })
    .post('/travelers', createTravelerValidator, async (context) => {
        const user = await readUserFromCookies(context);
        const traveler = await createTraveler(user.sub, context.req.valid('json'));

        return context.json<TravelerResponse>({ traveler }, 201);
    })
    .put('/travelers/:travelerId', updateTravelerValidator, async (context) => {
        const user = await readUserFromCookies(context);
        const traveler = await updateTraveler(user.sub, context.req.param('travelerId'), context.req.valid('json'));

        return context.json<TravelerResponse>({ traveler });
    })
    .delete('/travelers/:travelerId', async (context) => {
        const user = await readUserFromCookies(context);

        await deleteTraveler(user.sub, context.req.param('travelerId'));

        return context.json<MessageResponse>({ message: 'Traveler deleted.' });
    });

export type TravelersApp = typeof routes;

export const handler = handle(app);
