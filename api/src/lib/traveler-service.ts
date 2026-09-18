import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
    GetCommand,
    PutCommand,
    QueryCommand,
    TransactWriteCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { HTTPException } from 'hono/http-exception';

import { getDocumentClient, getTableName, userPk } from './dynamo-db-helper';
import type { AuthUser, CreateTravelerRequest, Traveler, UpdateTravelerRequest } from '../contracts/types';

type TravelerItem = Traveler & {
    PK: string;
    SK: string;
    entityType: 'TRAVELER';
};

const travelerSkPrefix = 'TRAVELER#';
const accountMetadataSk = 'ACCOUNT#METADATA';
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

// Creates the account metadata row and base traveler during signup.
export const createInitialTravelerForUser = async (user: AuthUser) => {
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

// Adds a traveler to an existing user account.
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

// Lists all travelers owned by the current user.
export const listTravelersForUser = async (user: AuthUser) => {
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

// Loads one traveler owned by the current user.
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

// Updates editable fields on one traveler owned by the current user.
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

// Deletes one traveler while preserving the required final traveler.
export const deleteTraveler = async (userSub: string, travelerId: string) => {
    const travelerCount = await getTravelerCount(userSub);

    if (travelerCount <= 1) {
        throw new HTTPException(400, { message: 'At least one traveler is required.' });
    }

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

// Counts traveler records to enforce account-level traveler invariants.
const getTravelerCount = async (userSub: string) => {
    const response = await getDocumentClient().send(
        new QueryCommand({
            TableName: getTableName(),
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: {
                ':pk': userPk(userSub),
                ':skPrefix': travelerSkPrefix,
            },
            Select: 'COUNT',
        })
    );

    return response.Count ?? 0;
};
