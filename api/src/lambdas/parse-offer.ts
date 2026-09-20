import { parseAndSaveOfferFromPdf } from '../lib/parsing-service';
import { readFileFromS3 } from '../lib/s3-helper';

type S3ObjectCreatedEvent = {
    Records?: Array<{
        eventName?: string;
        s3?: {
            bucket?: {
                name?: string;
            };
            object?: {
                key?: string;
                size?: number;
            };
        };
    }>;
};

export const handler = async (event: S3ObjectCreatedEvent) => {
    const records = event.Records ?? [];

    for (const record of records) {
        const bucketName = record.s3?.bucket?.name ?? 'unknown-bucket';
        const objectKey = record.s3?.object?.key ? decodeURIComponent(record.s3.object.key.replace(/\+/g, ' ')) : '';
        const objectSize = record.s3?.object?.size ?? 0;

        console.log('Parse offer lambda received S3 object created event', {
            eventName: record.eventName,
            bucketName,
            objectKey,
            objectSize,
        });

        if (!objectKey || bucketName === 'unknown-bucket') continue;

        const keyParts = parseOfferS3Key(objectKey);
        const bytes = await readFileFromS3(bucketName, objectKey);
        const parsedOffer = await parseAndSaveOfferFromPdf({
            userSub: keyParts.userSub,
            offerId: keyParts.offerId,
            sourceS3Key: objectKey,
            bytes,
        });

        console.log('Parsed offer PDF and stored sailing records', {
            offerId: keyParts.offerId,
            offerCode: parsedOffer.offerCode,
            sailingCount: parsedOffer.sailings.length,
            warningCount: parsedOffer.warnings.length,
        });
    }

    return { recordsProcessed: records.length };
};

function parseOfferS3Key(key: string) {
    const match = key.match(/^users\/([^/]+)\/offers\/([^/]+)\/.+$/);

    if (!match) {
        throw new Error(`Unexpected offer S3 key format: ${key}`);
    }

    return {
        userSub: decodeURIComponent(match[1]),
        offerId: match[2],
    };
}
