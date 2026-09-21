import type { ListSailingsResponse, Sailing } from 'api';

import { apiUrl, authFetch, parseResponse } from './client';

export type SailingListFilters = {
    departureEndDate?: string;
    departurePorts?: string[];
    departureStartDate?: string;
    guestCounts?: number[];
    maximumNights?: string;
    minimumNights?: string;
    roomTypes?: string[];
    ships?: string[];
    travelerIds?: string[];
};

export const sailingsApi = {
    list: async (filters: SailingListFilters = {}) => {
        const response = await authFetch(`${apiUrl}/sailings${toSailingFilterQueryString(filters)}`);

        return parseResponse<ListSailingsResponse>(response);
    },
};

function toSailingFilterQueryString(filters: SailingListFilters) {
    const searchParams = new URLSearchParams();

    appendValues(searchParams, 'departurePort', filters.departurePorts);
    appendValues(searchParams, 'guestCount', filters.guestCounts?.map(String));
    appendValues(searchParams, 'roomType', filters.roomTypes);
    appendValues(searchParams, 'ship', filters.ships);
    appendValues(searchParams, 'travelerId', filters.travelerIds);
    appendValue(searchParams, 'departureEndDate', filters.departureEndDate);
    appendValue(searchParams, 'departureStartDate', filters.departureStartDate);
    appendValue(searchParams, 'maximumNights', filters.maximumNights);
    appendValue(searchParams, 'minimumNights', filters.minimumNights);

    const queryString = searchParams.toString();

    return queryString ? `?${queryString}` : '';
}

function appendValue(searchParams: URLSearchParams, key: string, value: string | undefined) {
    if (value) searchParams.append(key, value);
}

function appendValues(searchParams: URLSearchParams, key: string, values: string[] | undefined) {
    for (const value of values ?? []) {
        appendValue(searchParams, key, value);
    }
}

export type { Sailing };
