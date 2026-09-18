import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { HTTPException } from 'hono/http-exception';

import { readEnv } from './api-helper';

let documentClient: DynamoDBDocumentClient | null = null;

// Reuses a single DynamoDB document client across warm Lambda invocations.
export const getDocumentClient = () => {
    documentClient ??= DynamoDBDocumentClient.from(new DynamoDBClient({}));

    return documentClient;
};

// Reads the shared CruiseDeck application table name from the environment.
export const getTableName = () => {
    const tableName = readEnv('CRUISE_DECK_DATA_TABLE_NAME');

    if (!tableName) {
        throw new HTTPException(500, {
            message: 'CruiseDeck data table is not configured.',
        });
    }

    return tableName;
};

// Builds the partition key for all records owned by a Cognito user.
export const userPk = (userSub: string) => `USER#${userSub}`;
