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
    }

    return { recordsProcessed: records.length };
};
