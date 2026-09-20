import { BatchWriteCommand, type BatchWriteCommandInput, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api.js';

import { join } from 'node:path';

import { getDocumentClient, getTableName, userPk } from './dynamo-db-helper';

export type ParsedOffer = {
    offerCode: string;
    offerTitle: string;
    sailings: ParsedSailing[];
    warnings: string[];
};

export type ParsedSailing = {
    ship: string;
    departurePort: string;
    sailDate: string;
    itinerary: string;
    roomType: string;
    offerType: string;
};

export type ParseAndSaveOfferInput = {
    userSub: string;
    offerId: string;
    sourceS3Key: string;
    bytes: Uint8Array;
};

type OfferMetadataItem = {
    PK: string;
    SK: string;
    entityType: 'OFFER';
    offerId: string;
    travelerId: string;
    sourceS3Key: string;
};

type SailingItem = ParsedSailing & {
    PK: string;
    SK: string;
    entityType: 'SAILING';
    sailingId: string;
    offerId: string;
    travelerId: string;
    offerCode: string;
    offerTitle: string;
    sailDateSort: string;
    parsedAt: string;
};

const offerTitlePattern = /^([A-Z0-9]+)\s+-\s+(.+)$/;
const sailingTableHeader = 'Ship Departure Port Sail Date Itinerary Room Type Offer Type Sailing Perks';
const datePattern =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/;
const offerTypePattern = /\bCruise Fare For \d+ Guests?$/;
const roomTypePattern =
    /\b(Interior|Interior - GTY|Ocean View|Ocean View - GTY|Oceanview|Oceanview - GTY|Balcony|Balcony - GTY)$/;
const shipAndPortPattern = /^(.+? of the Seas)\s+(.+)$/;
const offerSk = (offerId: string) => `OFFER#${offerId}`;
const sailingSk = (offerId: string, index: number) => `SAILING#${offerId}#${String(index + 1).padStart(5, '0')}`;
const lambdaTaskRoot = process.env.LAMBDA_TASK_ROOT;

if (lambdaTaskRoot) {
    GlobalWorkerOptions.workerSrc = `file://${join(lambdaTaskRoot, 'pdf.worker.mjs').replace(/\\/g, '/')}`;
}

// Reads a PDF, parses the supported offer table, and stores one DynamoDB sailing record per row.
export async function parseAndSaveOfferFromPdf(input: ParseAndSaveOfferInput) {
    const offer = await getOfferMetadata(input.userSub, input.offerId);

    if (offer.sourceS3Key !== input.sourceS3Key) {
        throw new Error('Uploaded S3 object does not match the stored offer metadata.');
    }

    const parsedOffer = await parseOfferPdf(input.bytes);
    await saveParsedSailings(input.userSub, offer, parsedOffer);

    return parsedOffer;
}

export async function parseOfferPdf(bytes: Uint8Array) {
    const text = await extractTextFromPdf(bytes);

    return parseExtractedOfferText(text);
}

// Parses the supported Club Royale offer text into normalized sailing rows.
export function parseExtractedOfferText(text: string): ParsedOffer {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const { offerCode, offerTitle } = parseOfferTitle(lines);
    const warnings: string[] = [];
    const sailings: ParsedSailing[] = [];

    for (const line of lines) {
        if (!isPotentialSailingLine(line)) continue;

        const sailing = parseSailingLine(line);
        if (sailing) {
            sailings.push(sailing);
        } else {
            warnings.push(`Skipped unparseable sailing line: ${line}`);
        }
    }

    return {
        offerCode,
        offerTitle,
        sailings,
        warnings,
    };
}

function parseOfferTitle(lines: string[]) {
    const titleLine = lines.find((line) => offerTitlePattern.test(line));
    if (!titleLine) {
        throw new Error('Unable to find offer code/title line.');
    }

    const titleMatch = titleLine.match(offerTitlePattern);
    if (!titleMatch) {
        throw new Error('Unable to parse offer code/title line.');
    }

    return {
        offerCode: titleMatch[1],
        offerTitle: titleMatch[2],
    };
}

// Keeps footer/legal text out by requiring a date and the known offer type ending.
function isPotentialSailingLine(line: string) {
    return line !== sailingTableHeader && datePattern.test(line) && offerTypePattern.test(line);
}

// Parses from the stable right side first, then splits ship and departure port on the ship-name suffix.
function parseSailingLine(line: string): ParsedSailing | null {
    const offerTypeMatch = line.match(offerTypePattern);
    if (offerTypeMatch?.index === undefined) return null;

    const offerType = offerTypeMatch[0];
    const lineBeforeOfferType = line.slice(0, offerTypeMatch.index).trim();
    const roomTypeMatch = lineBeforeOfferType.match(roomTypePattern);
    if (roomTypeMatch?.index === undefined) return null;

    const roomType = normalizeRoomType(roomTypeMatch[0]);
    const lineBeforeRoomType = lineBeforeOfferType.slice(0, roomTypeMatch.index).trim();
    const dateMatch = lineBeforeRoomType.match(datePattern);
    if (dateMatch?.index === undefined) return null;

    const sailDate = dateMatch[0];
    const shipAndPort = lineBeforeRoomType.slice(0, dateMatch.index).trim();
    const itinerary = lineBeforeRoomType.slice(dateMatch.index + sailDate.length).trim();
    const shipAndPortMatch = shipAndPort.match(shipAndPortPattern);
    if (!shipAndPortMatch || !itinerary) return null;

    return {
        ship: shipAndPortMatch[1],
        departurePort: shipAndPortMatch[2],
        sailDate,
        itinerary,
        roomType,
        offerType,
    };
}

function normalizeRoomType(roomType: string) {
    return roomType.replace(/^Oceanview/, 'Ocean View');
}

async function extractTextFromPdf(bytes: Uint8Array) {
    const loadingTask = getDocument({ data: bytes });
    const document = await loadingTask.promise;

    try {
        const pageLines: string[] = [];

        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
            const page = await document.getPage(pageNumber);
            const textContent = await page.getTextContent();
            pageLines.push(...groupTextItemsIntoLines(textContent.items));
        }

        return pageLines.join('\n');
    } finally {
        await loadingTask.destroy();
    }
}

function groupTextItemsIntoLines(items: Array<TextItem | TextMarkedContent>) {
    const textItems = items.filter(isTextItem).filter((item) => item.str.trim().length > 0);
    const rows = new Map<number, TextItem[]>();

    for (const item of textItems) {
        const y = Math.round(item.transform[5]);
        const row = rows.get(y) ?? [];
        row.push(item);
        rows.set(y, row);
    }

    return [...rows.entries()]
        .sort(([firstY], [secondY]) => secondY - firstY)
        .map(([, row]) =>
            row
                .sort((first, second) => first.transform[4] - second.transform[4])
                .map((item) => item.str.trim())
                .filter(Boolean)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim()
        )
        .filter(Boolean);
}

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
    return 'str' in item;
}

async function getOfferMetadata(userSub: string, offerId: string) {
    const response = await getDocumentClient().send(
        new GetCommand({
            TableName: getTableName(),
            Key: {
                PK: userPk(userSub),
                SK: offerSk(offerId),
            },
        })
    );

    if (!isOfferMetadataItem(response.Item)) {
        throw new Error('Unable to find offer metadata for uploaded file.');
    }

    return response.Item;
}

function isOfferMetadataItem(item: Record<string, unknown> | undefined): item is OfferMetadataItem {
    return (
        item?.entityType === 'OFFER' &&
        typeof item.offerId === 'string' &&
        typeof item.travelerId === 'string' &&
        typeof item.sourceS3Key === 'string'
    );
}

async function saveParsedSailings(userSub: string, offer: OfferMetadataItem, parsedOffer: ParsedOffer) {
    const tableName = getTableName();
    const parsedAt = new Date().toISOString();
    const sailingItems = parsedOffer.sailings.map((sailing, index) => {
        const sailingId = `${offer.offerId}#${String(index + 1).padStart(5, '0')}`;

        return {
            PK: userPk(userSub),
            SK: sailingSk(offer.offerId, index),
            entityType: 'SAILING',
            sailingId,
            offerId: offer.offerId,
            travelerId: offer.travelerId,
            offerCode: parsedOffer.offerCode,
            offerTitle: parsedOffer.offerTitle,
            sailDateSort: toSailDateSort(sailing.sailDate),
            parsedAt,
            ...sailing,
        } satisfies SailingItem;
    });

    await writeSailingItems(tableName, sailingItems);

    await getDocumentClient().send(
        new UpdateCommand({
            TableName: tableName,
            Key: {
                PK: userPk(userSub),
                SK: offerSk(offer.offerId),
            },
            UpdateExpression:
                'SET parseStatus = :parseStatus, parsedAt = :parsedAt, parsedSailingCount = :parsedSailingCount, parseWarnings = :parseWarnings',
            ExpressionAttributeValues: {
                ':parseStatus': 'PARSED',
                ':parsedAt': parsedAt,
                ':parsedSailingCount': sailingItems.length,
                ':parseWarnings': parsedOffer.warnings,
            },
        })
    );
}

async function writeSailingItems(tableName: string, sailingItems: SailingItem[]) {
    for (let index = 0; index < sailingItems.length; index += 25) {
        let requestItems: NonNullable<BatchWriteCommandInput['RequestItems']> = {
            [tableName]: sailingItems.slice(index, index + 25).map((item) => ({
                PutRequest: { Item: item },
            })),
        };

        do {
            const response = await getDocumentClient().send(new BatchWriteCommand({ RequestItems: requestItems }));
            requestItems = response.UnprocessedItems ?? {};
        } while ((requestItems[tableName]?.length ?? 0) > 0);
    }
}

function toSailDateSort(sailDate: string) {
    const timestamp = Date.parse(sailDate);

    if (Number.isNaN(timestamp)) return sailDate;

    return new Date(timestamp).toISOString().slice(0, 10);
}
