import { QueryCommand } from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, getTableName, userPk } from './dynamo-db-helper';
import type { Sailing } from '../contracts/types';

type SailingItem = Sailing & {
    PK: string;
    SK: string;
    entityType: 'SAILING';
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
export const listSailingsForUser = async (userSub: string) => {
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
        .sort((first, second) => first.sailDateSort.localeCompare(second.sailDateSort));
};
