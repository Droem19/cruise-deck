import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
    BatchWriteCommand,
    type BatchWriteCommandInput,
    DeleteCommand,
    GetCommand,
    PutCommand,
    QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { HTTPException } from 'hono/http-exception';

import { getDocumentClient, getTableName, userPk } from './dynamo-db-helper';
import { deleteFileFromS3, getDownloadableFileFromS3, type UploadedOfferFile, uploadFileToS3 } from './s3-helper';
import { getTraveler } from './traveler-service';
import type { DownloadOfferResponse, UploadedOffer } from '../contracts/types';

type OfferItem = UploadedOffer & {
    PK: string;
    SK: string;
    entityType: 'OFFER';
    sourceS3Key: string;
};

const offerSkPrefix = 'OFFER#';
const offerSk = (offerId: string) => `${offerSkPrefix}${offerId}`;
const sailingSk = (offerId: string) => `SAILING#${offerId}#`;

const notFound = () => new HTTPException(404, { message: 'Offer not found.' });

const isOfferItem = (item: Record<string, unknown> | undefined): item is OfferItem => {
    return (
        item?.entityType === 'OFFER' &&
        typeof item.offerId === 'string' &&
        typeof item.travelerId === 'string' &&
        typeof item.fileName === 'string' &&
        typeof item.sourceS3Key === 'string' &&
        typeof item.sizeBytes === 'number' &&
        typeof item.uploadedAt === 'string'
    );
};

const toUploadedOffer = (item: Record<string, unknown> | undefined) => {
    if (!isOfferItem(item)) return null;

    return {
        offerId: item.offerId,
        travelerId: item.travelerId,
        fileName: item.fileName,
        sizeBytes: item.sizeBytes,
        uploadedAt: item.uploadedAt,
    } satisfies UploadedOffer;
};

// Lists offer metadata records for a single user account.
export const listOffersForUser = async (userSub: string): Promise<UploadedOffer[]> => {
    const response = await getDocumentClient().send(
        new QueryCommand({
            TableName: getTableName(),
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: {
                ':pk': userPk(userSub),
                ':skPrefix': offerSkPrefix,
            },
        })
    );

    return (response.Items ?? [])
        .map((item) => toUploadedOffer(item))
        .filter((offer): offer is UploadedOffer => offer !== null)
        .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
};

// Uploads an offer file and stores its traveler-linked metadata.
export const uploadOfferForUser = async (
    userSub: string,
    travelerId: string,
    file: UploadedOfferFile
): Promise<UploadedOffer> => {
    await getTraveler(userSub, travelerId);

    const storedFile = await uploadFileToS3(userSub, file);
    const offer = {
        offerId: storedFile.offerId,
        travelerId,
        fileName: storedFile.fileName,
        sizeBytes: storedFile.sizeBytes,
        uploadedAt: storedFile.uploadedAt,
    } satisfies UploadedOffer;

    try {
        await getDocumentClient().send(
            new PutCommand({
                TableName: getTableName(),
                Item: {
                    PK: userPk(userSub),
                    SK: offerSk(offer.offerId),
                    entityType: 'OFFER',
                    sourceS3Key: storedFile.sourceS3Key,
                    ...offer,
                } satisfies OfferItem,
                ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
            })
        );
    } catch (error) {
        try {
            await deleteFileFromS3(userSub, storedFile.sourceS3Key);
        } catch (cleanupError) {
            console.error(cleanupError);
        }

        throw error;
    }

    return offer;
};

// Creates a signed download URL for a user's stored offer file.
export const getDownloadableOfferForUser = async (userSub: string, offerId: string): Promise<DownloadOfferResponse> => {
    const offer = await getOfferItemForUser(userSub, offerId);

    return getDownloadableFileFromS3(userSub, offer.offerId, offer.sourceS3Key, offer.fileName);
};

// Deletes an offer's S3 file, parsed sailing rows, and DynamoDB metadata record.
export const deleteOfferForUser = async (userSub: string, offerId: string) => {
    const offer = await getOfferItemForUser(userSub, offerId);

    await deleteFileFromS3(userSub, offer.sourceS3Key);
    await deleteSailingsForOffer(userSub, offerId);

    try {
        await getDocumentClient().send(
            new DeleteCommand({
                TableName: getTableName(),
                Key: {
                    PK: userPk(userSub),
                    SK: offerSk(offerId),
                },
                ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK) AND #entityType = :entityType',
                ExpressionAttributeNames: { '#entityType': 'entityType' },
                ExpressionAttributeValues: { ':entityType': 'OFFER' },
            })
        );
    } catch (error) {
        if (error instanceof ConditionalCheckFailedException) throw notFound();

        throw error;
    }
};

// Loads the full offer metadata item used for download and delete actions.
const getOfferItemForUser = async (userSub: string, offerId: string) => {
    const response = await getDocumentClient().send(
        new GetCommand({
            TableName: getTableName(),
            Key: {
                PK: userPk(userSub),
                SK: offerSk(offerId),
            },
        })
    );

    if (!isOfferItem(response.Item)) throw notFound();

    return response.Item;
};

// Removes all parsed sailing rows created from the uploaded offer.
const deleteSailingsForOffer = async (userSub: string, offerId: string) => {
    const tableName = getTableName();
    const sailingKeys = await listSailingKeysForOffer(userSub, offerId);

    for (let index = 0; index < sailingKeys.length; index += 25) {
        let requestItems: NonNullable<BatchWriteCommandInput['RequestItems']> = {
            [tableName]: sailingKeys.slice(index, index + 25).map((key) => ({
                DeleteRequest: { Key: key },
            })),
        };

        do {
            const response = await getDocumentClient().send(new BatchWriteCommand({ RequestItems: requestItems }));
            requestItems = response.UnprocessedItems ?? {};
        } while ((requestItems[tableName]?.length ?? 0) > 0);
    }
};

// Queries only DynamoDB keys so batch deletes don't read full sailing records.
const listSailingKeysForOffer = async (userSub: string, offerId: string) => {
    const tableName = getTableName();
    const pk = userPk(userSub);
    const keys: Array<{ PK: string; SK: string }> = [];
    let exclusiveStartKey: Record<string, unknown> | undefined;

    do {
        const response = await getDocumentClient().send(
            new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
                ExpressionAttributeValues: {
                    ':pk': pk,
                    ':skPrefix': sailingSk(offerId),
                },
                ProjectionExpression: 'PK, SK',
                ExclusiveStartKey: exclusiveStartKey,
            })
        );

        for (const item of response.Items ?? []) {
            if (typeof item.PK === 'string' && typeof item.SK === 'string') {
                keys.push({ PK: item.PK, SK: item.SK });
            }
        }

        exclusiveStartKey = response.LastEvaluatedKey;
    } while (exclusiveStartKey);

    return keys;
};
