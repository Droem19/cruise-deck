import type { ListSailingsResponse, Sailing } from 'api';

import { apiUrl, authFetch, parseResponse } from './client';

export const sailingsApi = {
    list: async () => {
        const response = await authFetch(`${apiUrl}/sailings`);

        return parseResponse<ListSailingsResponse>(response);
    },
};

export type { Sailing };
