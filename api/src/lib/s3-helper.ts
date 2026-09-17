import {
    DeleteObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HTTPException } from 'hono/http-exception';

import { randomUUID } from 'node:crypto';

import { readEnv } from './api-helpers';
import type { DownloadOfferResponse, UploadedOffer } from '../contracts/types';

export type UploadedOfferFile = {
    name: string;
    size: number;
    type?: string;
    arrayBuffer: () => Promise<ArrayBuffer>;
};

const downloadUrlExpirationSeconds = 60 * 5;

let s3Client: S3Client | null = null;

// Lists every uploaded offer file stored under a user's private S3 prefix.
export const listOffersForUser = async (userSub: string): Promise<UploadedOffer[]> => {
    const bucketName = getOffersS3BucketName();
    const prefix = getUsersOfferPrefix(userSub);
    const objects = [];
    let continuationToken: string | undefined;

    do {
        const response = await getS3Client().send(
            new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            })
        );

        objects.push(...(response.Contents ?? []));
        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return objects
        .map((object) => {
            if (!object.Key) return null;

            const parsedKey = parseOfferS3Key(userSub, object.Key);
            if (!parsedKey) return null;

            return {
                offerId: parsedKey.offerId,
                fileName: parsedKey.fileName,
                sizeBytes: object.Size ?? 0,
                uploadedAt: object.LastModified?.toISOString() ?? new Date(0).toISOString(),
            } satisfies UploadedOffer;
        })
        .filter((offer): offer is UploadedOffer => offer !== null)
        .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
};

// Uploads a single offer file to the user's private S3 offer folder.
export const uploadFileToS3 = async (userSub: string, file: UploadedOfferFile): Promise<UploadedOffer> => {
    const bucketName = getOffersS3BucketName();
    const offerId = randomUUID();
    const key = getOfferS3Key(userSub, offerId, file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const uploadedAt = new Date().toISOString();

    await getS3Client().send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: bytes,
            ContentType: file.type || 'application/octet-stream',
            Metadata: {
                sourcefilename: encodeURIComponent(file.name),
            },
        })
    );

    return {
        offerId,
        fileName: file.name,
        sizeBytes: file.size || bytes.byteLength,
        uploadedAt,
    };
};

// Creates a short-lived signed download URL for one of the user's uploaded offer files.
export const getDownloadableFileFromS3 = async (userSub: string, offerId: string): Promise<DownloadOfferResponse> => {
    const bucketName = getOffersS3BucketName();
    const offerObject = await getS3KeyForOffer(userSub, offerId);
    const downloadUrl = await getSignedUrl(
        getS3Client(),
        new GetObjectCommand({
            Bucket: bucketName,
            Key: offerObject.key,
            ResponseContentDisposition: `attachment; filename="${sanitizeAttachmentFileName(offerObject.fileName)}"`,
        }),
        { expiresIn: downloadUrlExpirationSeconds }
    );

    return {
        offerId,
        fileName: offerObject.fileName,
        downloadUrl,
        expiresInSeconds: downloadUrlExpirationSeconds,
    };
};

// Deletes one uploaded offer file from the user's private S3 offer folder.
export const deleteFileFromS3 = async (userSub: string, offerId: string) => {
    const bucketName = getOffersS3BucketName();
    const offerObject = await getS3KeyForOffer(userSub, offerId);

    await getS3Client().send(
        new DeleteObjectCommand({
            Bucket: bucketName,
            Key: offerObject.key,
        })
    );
};

// Finds the stored S3 key and original file name for a user-owned offer ID.
const getS3KeyForOffer = async (userSub: string, offerId: string) => {
    const bucketName = getOffersS3BucketName();
    const prefix = `${getUsersOfferPrefix(userSub)}${offerId}/`;
    const response = await getS3Client().send(
        new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
            MaxKeys: 1,
        })
    );
    const key = response.Contents?.[0]?.Key;

    if (!key) {
        throw new HTTPException(404, { message: 'Offer not found.' });
    }

    const parsedKey = parseOfferS3Key(userSub, key);
    if (!parsedKey) {
        throw new HTTPException(404, { message: 'Offer not found.' });
    }

    return { key, fileName: parsedKey.fileName };
};

// Reads the configured private offers bucket name from the Lambda environment.
const getOffersS3BucketName = () => {
    const bucketName = readEnv('OFFERS_BUCKET_NAME');

    if (!bucketName) {
        throw new HTTPException(500, { message: 'Offer storage is not configured.' });
    }

    return bucketName;
};

// Reuses a singleton S3 client across warm Lambda invocations.
const getS3Client = () => {
    s3Client ??= new S3Client({});

    return s3Client;
};

// Builds the S3 prefix that contains all offer files for a single user.
const getUsersOfferPrefix = (userSub: string) => `users/${encodeURIComponent(userSub)}/offers/`;

// Builds the full S3 object key for one uploaded offer file.
const getOfferS3Key = (userSub: string, offerId: string, fileName: string) =>
    `${getUsersOfferPrefix(userSub)}${offerId}/${encodeURIComponent(fileName)}`;

// Parses an uploaded offer object key back into its offer ID and file name.
const parseOfferS3Key = (userSub: string, key: string) => {
    const prefix = getUsersOfferPrefix(userSub);
    if (!key.startsWith(prefix)) return null;

    const [offerId, ...fileNameParts] = key.slice(prefix.length).split('/');
    const encodedFileName = fileNameParts.join('/');
    if (!offerId || !encodedFileName) return null;

    try {
        return { offerId, fileName: decodeURIComponent(encodedFileName) };
    } catch {
        return { offerId, fileName: encodedFileName };
    }
};

// Removes characters that are unsafe in a Content-Disposition filename.
const sanitizeAttachmentFileName = (fileName: string) => fileName.replace(/["\\\r\n]/g, '_');
