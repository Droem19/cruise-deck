import { QueryCommand } from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, getTableName, userPk } from './dynamo-db-helper';
import type { Sailing } from '../contracts/types';

type SailingItem = Sailing & {
    PK: string;
    SK: string;
    entityType: 'SAILING';
};

export type SailingFilters = {
    departureEndDate?: string;
    departurePorts?: string[];
    departureStartDate?: string;
    guestCounts?: number[];
    maximumNights?: number;
    minimumNights?: number;
    roomTypes?: string[];
    ships?: string[];
    travelerIds?: string[];
};

const sailingSkPrefix = 'SAILING#';

const isSailingItem = (item: Record<string, unknown> | undefined): item is SailingItem => {
    return (
        item?.entityType === 'SAILING' &&
        typeof item.sailingId === 'string' &&
        typeof item.offerId === 'string' &&
        typeof item.travelerId === 'string' &&
        typeof item.offerCode === 'string' &&
        typeof item.offerTitle === 'string' &&
        typeof item.ship === 'string' &&
        typeof item.departurePort === 'string' &&
        typeof item.sailDate === 'string' &&
        typeof item.sailDateSort === 'string' &&
        typeof item.itinerary === 'string' &&
        typeof item.roomType === 'string' &&
        typeof item.offerType === 'string' &&
        typeof item.parsedAt === 'string'
    );
};

const toSailing = (item: Record<string, unknown> | undefined) => {
    if (!isSailingItem(item)) return null;

    return {
        sailingId: item.sailingId,
        offerId: item.offerId,
        travelerId: item.travelerId,
        offerCode: item.offerCode,
        offerTitle: item.offerTitle,
        ship: item.ship,
        departurePort: item.departurePort,
        sailDate: item.sailDate,
        sailDateSort: item.sailDateSort,
        itinerary: item.itinerary,
        roomType: item.roomType,
        offerType: item.offerType,
        parsedAt: item.parsedAt,
    } satisfies Sailing;
};

// Lists parsed sailing rows for the current user account.
export const listSailingsForUser = async (userSub: string, filters: SailingFilters = {}) => {
    const response = await getDocumentClient().send(
        new QueryCommand({
            TableName: getTableName(),
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: {
                ':pk': userPk(userSub),
                ':skPrefix': sailingSkPrefix,
            },
        })
    );

    return (response.Items ?? [])
        .map((item) => toSailing(item))
        .filter((sailing): sailing is Sailing => sailing !== null)
        .filter((sailing) => matchesSailingFilters(sailing, filters))
        .sort((first, second) => first.sailDateSort.localeCompare(second.sailDateSort));
};

const matchesSailingFilters = (sailing: Sailing, filters: SailingFilters) => {
    const departurePortSet = new Set(
        (filters.departurePorts ?? []).map((departurePort) => normalizeFilterValue(departurePort))
    );
    const guestCount = getOfferGuestCount(sailing.offerType);
    const nightCount = getItineraryNightCount(sailing.itinerary);

    const matchesShip = filters.ships?.length ? filters.ships.includes(sailing.ship) : true;
    const matchesDeparturePort =
        departurePortSet.size > 0 ? departurePortSet.has(normalizeFilterValue(sailing.departurePort)) : true;
    const matchesGuestCount = filters.guestCounts?.length
        ? guestCount !== null && filters.guestCounts.includes(guestCount)
        : true;
    const matchesTraveler = filters.travelerIds?.length ? filters.travelerIds.includes(sailing.travelerId) : true;
    const matchesRoomType = filters.roomTypes?.length ? filters.roomTypes.includes(sailing.roomType) : true;
    const matchesDepartureStartDate = filters.departureStartDate
        ? sailing.sailDateSort >= filters.departureStartDate
        : true;
    const matchesDepartureEndDate = filters.departureEndDate ? sailing.sailDateSort <= filters.departureEndDate : true;
    const matchesMinimumNights =
        filters.minimumNights === undefined ? true : nightCount !== null && nightCount >= filters.minimumNights;
    const matchesMaximumNights =
        filters.maximumNights === undefined ? true : nightCount !== null && nightCount <= filters.maximumNights;

    return (
        matchesShip &&
        matchesDeparturePort &&
        matchesGuestCount &&
        matchesTraveler &&
        matchesRoomType &&
        matchesDepartureStartDate &&
        matchesDepartureEndDate &&
        matchesMinimumNights &&
        matchesMaximumNights
    );
};

const normalizeFilterValue = (value: string) => {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

const getOfferGuestCount = (offerType: string) => {
    const guestMatch = offerType.match(/\b(1|2)\s+guests?\b/i);
    if (!guestMatch) return null;

    return Number.parseInt(guestMatch[1], 10);
};

const getItineraryNightCount = (itinerary: string) => {
    const nightMatch = itinerary.match(/\b(\d+)\s+nights?\b/i);
    if (!nightMatch) return null;

    return Number.parseInt(nightMatch[1], 10);
};
