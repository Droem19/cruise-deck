import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { cors } from 'hono/cors';

import type { ListSailingsResponse } from '../contracts/types';
import { errorHandler, getAllowedOrigins } from '../lib/api-helper';
import { readUserFromCookies } from '../lib/auth-service';
import { listSailingsForUser, type SailingFilters, type SailingPagination } from '../lib/sailing-service';

const defaultPageSize = 100;

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
    const url = context.req.url;
    const filters = readSailingFilters(url);
    const pagination = readSailingPagination(url);
    const response = await listSailingsForUser(user.sub, filters, pagination);

    return context.json<ListSailingsResponse>(response);
});

export type SailingsApp = typeof routes;

export const handler = handle(app);

const readSailingFilters = (url: string): SailingFilters => {
    const searchParams = new URL(url).searchParams;

    return {
        departureEndDate: readDateFilter(searchParams, 'departureEndDate'),
        departurePorts: searchParams.getAll('departurePort'),
        departureStartDate: readDateFilter(searchParams, 'departureStartDate'),
        guestCounts: searchParams
            .getAll('guestCount')
            .map(Number)
            .filter((guestCount) => guestCount === 1 || guestCount === 2),
        maximumNights: readPositiveIntegerFilter(searchParams, 'maximumNights'),
        minimumNights: readPositiveIntegerFilter(searchParams, 'minimumNights'),
        roomTypes: searchParams.getAll('roomType'),
        ships: searchParams.getAll('ship'),
        travelerIds: searchParams.getAll('travelerId'),
    };
};

const readSailingPagination = (url: string): SailingPagination => {
    const searchParams = new URL(url).searchParams;
    const requestedLimit = readPositiveIntegerFilter(searchParams, 'limit') ?? defaultPageSize;

    return {
        limit: Math.min(requestedLimit, defaultPageSize),
        offset: readNonNegativeIntegerFilter(searchParams, 'offset') ?? 0,
    };
};

const readDateFilter = (searchParams: URLSearchParams, key: string) => {
    const value = searchParams.get(key);

    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
};

const readPositiveIntegerFilter = (searchParams: URLSearchParams, key: string) => {
    const value = searchParams.get(key);
    if (!value) return undefined;

    const integerValue = Number.parseInt(value, 10);

    return Number.isFinite(integerValue) && integerValue > 0 ? integerValue : undefined;
};

const readNonNegativeIntegerFilter = (searchParams: URLSearchParams, key: string) => {
    const value = searchParams.get(key);
    if (!value) return undefined;

    const integerValue = Number.parseInt(value, 10);

    return Number.isFinite(integerValue) && integerValue >= 0 ? integerValue : undefined;
};
