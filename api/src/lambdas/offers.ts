import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { cors } from 'hono/cors';

import type { ListOffersResponse, MessageResponse, UploadOffersResponse } from '../contracts/types';
import { errorHandler, getAllowedOrigins } from '../lib/api-helper';
import { readUserFromCookies } from '../lib/auth-service';
import {
    deleteOfferForUser,
    getDownloadableOfferForUser,
    listOffersForUser,
    uploadOfferForUser,
} from '../lib/offer-service';
import type { UploadedOfferFile } from '../lib/s3-helper';

export const app = new Hono();

app.use(
    '*',
    cors({
        origin: getAllowedOrigins(),
        credentials: true,
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    })
);
app.onError(errorHandler);

const routes = app
    .get('/offers', async (context) => {
        const user = await readUserFromCookies(context);
        const offers = await listOffersForUser(user.sub);

        return context.json<ListOffersResponse>({ offers });
    })
    .post('/offers', async (context) => {
        const user = await readUserFromCookies(context);
        const formData = await context.req.formData();
        const travelerId = readTravelerId(formData);
        const entries: unknown[] = [...formData.getAll('files'), ...formData.getAll('file')];
        const files = entries.filter(isUploadedOfferFile);

        if (!travelerId) {
            return context.json<MessageResponse>({ message: 'Traveler is required.' }, 400);
        }

        if (files.length === 0) {
            return context.json<MessageResponse>({ message: 'At least one offer file is required.' }, 400);
        }

        const offers = [];

        for (const file of files) {
            offers.push(await uploadOfferForUser(user.sub, travelerId, file));
        }

        return context.json<UploadOffersResponse>({ offers }, 201);
    })
    .get('/offers/:offerId/download', async (context) => {
        const user = await readUserFromCookies(context);
        const offerId = context.req.param('offerId');
        const response = await getDownloadableOfferForUser(user.sub, offerId);

        return context.json(response);
    })
    .delete('/offers/:offerId', async (context) => {
        const user = await readUserFromCookies(context);
        const offerId = context.req.param('offerId');

        await deleteOfferForUser(user.sub, offerId);

        return context.json<MessageResponse>({ message: 'Offer deleted.' });
    });

export type OffersApp = typeof routes;

export const handler = handle(app);

// Narrows multipart form data entries to the File-like object Hono exposes in Node.
const isUploadedOfferFile = (value: unknown): value is UploadedOfferFile => {
    if (!value || typeof value !== 'object') return false;

    return 'name' in value && 'size' in value && 'arrayBuffer' in value;
};

const readTravelerId = (formData: FormData) => {
    const value = formData.get('travelerId');

    return typeof value === 'string' ? value.trim() : undefined;
};
