import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HTTPException } from 'hono/http-exception';

import { randomUUID } from 'node:crypto';

import { readEnv } from './api-helper';
import type { DownloadOfferResponse } from '../contracts/types';

export type UploadedOfferFile = {
    name: string;
    size: number;
    type?: string;
    arrayBuffer: () => Promise<ArrayBuffer>;
};

export type StoredOfferFile = {
    offerId: string;
    fileName: string;
    sourceS3Key: string;
    sizeBytes: number;
    uploadedAt: string;
};

const downloadUrlExpirationSeconds = 60 * 5;

let s3Client: S3Client | null = null;

// Uploads a single offer file to the user's private S3 offer folder.
export const uploadFileToS3 = async (userSub: string, file: UploadedOfferFile): Promise<StoredOfferFile> => {
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
        sourceS3Key: key,
        sizeBytes: file.size || bytes.byteLength,
        uploadedAt,
    };
};

// Creates a short-lived signed download URL for one of the user's uploaded offer files.
export const getDownloadableFileFromS3 = async (
    userSub: string,
    offerId: string,
    sourceS3Key: string,
    fileName: string
): Promise<DownloadOfferResponse> => {
    const bucketName = getOffersS3BucketName();
    const key = validateOfferS3Key(userSub, sourceS3Key);
    const downloadUrl = await getSignedUrl(
        getS3Client(),
        new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
            ResponseContentDisposition: `attachment; filename="${sanitizeAttachmentFileName(fileName)}"`,
        }),
        { expiresIn: downloadUrlExpirationSeconds }
    );

    return {
        offerId,
        fileName,
        downloadUrl,
        expiresInSeconds: downloadUrlExpirationSeconds,
    };
};

// Deletes one uploaded offer file from the user's private S3 offer folder.
export const deleteFileFromS3 = async (userSub: string, sourceS3Key: string) => {
    const bucketName = getOffersS3BucketName();
    const key = validateOfferS3Key(userSub, sourceS3Key);

    await getS3Client().send(
        new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        })
    );
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

// Ensures stored S3 keys cannot escape the current user's private prefix.
const validateOfferS3Key = (userSub: string, key: string) => {
    const prefix = getUsersOfferPrefix(userSub);
    if (!key.startsWith(prefix)) throw new HTTPException(404, { message: 'Offer not found.' });

    return key;
};

// Removes characters that are unsafe in a Content-Disposition filename.
const sanitizeAttachmentFileName = (fileName: string) => fileName.replace(/["\\\r\n]/g, '_');
