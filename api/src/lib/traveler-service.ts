import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    TransactWriteCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { HTTPException } from 'hono/http-exception';

import { readEnv } from './api-helpers';
import type { AuthUser, CreateTravelerRequest, Traveler, UpdateTravelerRequest } from '../contracts/types';

type TravelerItem = Traveler & {
    PK: string;
    SK: string;
    entityType: 'TRAVELER';
};

const travelerSkPrefix = 'TRAVELER#';
const accountMetadataSk = 'ACCOUNT#METADATA';

let documentClient: DynamoDBDocumentClient | null = null;

const getDocumentClient = () => {
    documentClient ??= DynamoDBDocumentClient.from(new DynamoDBClient({}));

    return documentClient;
};

const getTableName = () => {
    const tableName = readEnv('CRUISE_DECK_DATA_TABLE_NAME');

    if (!tableName) {
        throw new HTTPException(500, {
            message: 'CruiseDeck data table is not configured.',
        });
    }

    return tableName;
};

const userPk = (userSub: string) => `USER#${userSub}`;
const travelerSk = (travelerId: string) => `${travelerSkPrefix}${travelerId}`;

const isTravelerItem = (item: Record<string, unknown> | undefined): item is TravelerItem => {
    return (
        item?.entityType === 'TRAVELER' &&
        typeof item.travelerId === 'string' &&
        typeof item.firstName === 'string' &&
        typeof item.lastName === 'string' &&
        typeof item.createdAt === 'string'
    );
};

const toTraveler = (item: Record<string, unknown> | undefined) => {
    if (!isTravelerItem(item)) return null;

    return {
        travelerId: item.travelerId,
        firstName: item.firstName,
        lastName: item.lastName,
        createdAt: item.createdAt,
    } satisfies Traveler;
};

const notFound = () => new HTTPException(404, { message: 'Traveler not found.' });

const buildTravelerItem = (userSub: string, traveler: Traveler): TravelerItem => ({
    PK: userPk(userSub),
    SK: travelerSk(traveler.travelerId),
    entityType: 'TRAVELER',
    ...traveler,
});

const getInitialTravelerName = (user: AuthUser) => {
    const firstName = user.givenName?.trim();
    const lastName = user.familyName?.trim();

    if (!firstName || !lastName) {
        throw new HTTPException(400, {
            message: 'First and last name are required before creating travelers.',
        });
    }

    return { firstName, lastName };
};

export const ensureInitialTravelerForUser = async (user: AuthUser) => {
    const tableName = getTableName();
    const ownerPk = userPk(user.sub);
    const now = new Date().toISOString();
    const defaultTravelerId = crypto.randomUUID();
    const traveler = buildTravelerItem(user.sub, {
        travelerId: defaultTravelerId,
        ...getInitialTravelerName(user),
        createdAt: now,
    });

    try {
        await getDocumentClient().send(
            new TransactWriteCommand({
                TransactItems: [
                    {
                        Put: {
                            TableName: tableName,
                            Item: traveler,
                            ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
                        },
                    },
                    {
                        Put: {
                            TableName: tableName,
                            Item: {
                                PK: ownerPk,
                                SK: accountMetadataSk,
                                entityType: 'ACCOUNT_METADATA',
                                defaultTravelerId,
                                initialTravelerSetupCompletedAt: now,
                            },
                            ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
                        },
                    },
                ],
            })
        );
    } catch (error) {
        if (error instanceof ConditionalCheckFailedException) return;

        throw error;
    }
};

export const createTraveler = async (userSub: string, request: CreateTravelerRequest) => {
    const traveler: Traveler = {
        travelerId: crypto.randomUUID(),
        firstName: request.firstName,
        lastName: request.lastName,
        createdAt: new Date().toISOString(),
    };

    await getDocumentClient().send(
        new PutCommand({
            TableName: getTableName(),
            Item: buildTravelerItem(userSub, traveler),
            ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
        })
    );

    return traveler;
};

export const listTravelersForUser = async (user: AuthUser) => {
    await ensureInitialTravelerForUser(user);

    const response = await getDocumentClient().send(
        new QueryCommand({
            TableName: getTableName(),
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: {
                ':pk': userPk(user.sub),
                ':skPrefix': travelerSkPrefix,
            },
        })
    );

    return (response.Items ?? [])
        .map((item) => toTraveler(item))
        .filter((traveler): traveler is Traveler => traveler !== null)
        .sort((first, second) => first.createdAt.localeCompare(second.createdAt));
};

export const getTraveler = async (userSub: string, travelerId: string) => {
    const response = await getDocumentClient().send(
        new GetCommand({
            TableName: getTableName(),
            Key: {
                PK: userPk(userSub),
                SK: travelerSk(travelerId),
            },
        })
    );
    const traveler = toTraveler(response.Item);

    if (!traveler) throw notFound();

    return traveler;
};

export const updateTraveler = async (userSub: string, travelerId: string, request: UpdateTravelerRequest) => {
    const expressionAttributeNames: Record<string, string> = {
        '#entityType': 'entityType',
    };
    const expressionAttributeValues: Record<string, string> = {
        ':entityType': 'TRAVELER',
    };
    const setExpressions: string[] = [];

    if (request.firstName !== undefined) {
        expressionAttributeNames['#firstName'] = 'firstName';
        expressionAttributeValues[':firstName'] = request.firstName;
        setExpressions.push('#firstName = :firstName');
    }

    if (request.lastName !== undefined) {
        expressionAttributeNames['#lastName'] = 'lastName';
        expressionAttributeValues[':lastName'] = request.lastName;
        setExpressions.push('#lastName = :lastName');
    }

    try {
        const response = await getDocumentClient().send(
            new UpdateCommand({
                TableName: getTableName(),
                Key: {
                    PK: userPk(userSub),
                    SK: travelerSk(travelerId),
                },
                UpdateExpression: `SET ${setExpressions.join(', ')}`,
                ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK) AND #entityType = :entityType',
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW',
            })
        );
        const traveler = toTraveler(response.Attributes);

        if (!traveler)
            throw new HTTPException(500, {
                message: 'Traveler update failed.',
            });

        return traveler;
    } catch (error) {
        if (error instanceof ConditionalCheckFailedException) throw notFound();

        throw error;
    }
};

export const deleteTraveler = async (userSub: string, travelerId: string) => {
    try {
        await getDocumentClient().send(
            new DeleteCommand({
                TableName: getTableName(),
                Key: {
                    PK: userPk(userSub),
                    SK: travelerSk(travelerId),
                },
                ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK) AND #entityType = :entityType',
                ExpressionAttributeNames: { '#entityType': 'entityType' },
                ExpressionAttributeValues: { ':entityType': 'TRAVELER' },
            })
        );
    } catch (error) {
        if (error instanceof ConditionalCheckFailedException) throw notFound();

        throw error;
    }
};
