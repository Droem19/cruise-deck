import type {
    CreateTravelerRequest,
    ListTravelersResponse,
    MessageResponse,
    Traveler,
    TravelerResponse,
    UpdateTravelerRequest,
} from 'api';

import { apiUrl, authFetch, parseResponse } from './client';

export const travelersApi = {
    list: async () => {
        const response = await authFetch(`${apiUrl}/travelers`);

        return parseResponse<ListTravelersResponse>(response);
    },
    create: async (request: CreateTravelerRequest) => {
        const response = await authFetch(`${apiUrl}/travelers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });

        return parseResponse<TravelerResponse>(response);
    },
    update: async (travelerId: string, request: UpdateTravelerRequest) => {
        const response = await authFetch(`${apiUrl}/travelers/${encodeURIComponent(travelerId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });

        return parseResponse<TravelerResponse>(response);
    },
    delete: async (travelerId: string) => {
        const response = await authFetch(`${apiUrl}/travelers/${encodeURIComponent(travelerId)}`, {
            method: 'DELETE',
        });

        return parseResponse<MessageResponse>(response);
    },
};

export type { Traveler };
