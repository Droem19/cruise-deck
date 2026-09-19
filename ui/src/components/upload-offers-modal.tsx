import { type DragEvent, type FormEvent, useEffect, useState } from 'react';

import { offersApi } from '../api/offers';
import type { Traveler } from '../api/travelers';
import { AppModal } from './app-modal';

type UploadOffersModalProps = {
    travelers: Traveler[];
    onClose: () => void;
    onUploaded: () => Promise<void>;
};

export function UploadOffersModal({ travelers, onClose, onUploaded }: UploadOffersModalProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [selectedTravelerId, setSelectedTravelerId] = useState(() =>
        travelers.length === 1 ? travelers[0].travelerId : ''
    );
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (travelers.length === 1) setSelectedTravelerId(travelers[0].travelerId);
    }, [travelers]);

    const addFiles = (nextFiles: FileList | File[]) => {
        const selectedFiles = Array.from(nextFiles);

        setFiles((currentFiles) => {
            const filesByKey = new Map(currentFiles.map((file) => [getFileKey(file), file]));

            for (const file of selectedFiles) {
                filesByKey.set(getFileKey(file), file);
            }

            return [...filesByKey.values()];
        });
        setError(null);
    };

    const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setIsDragging(false);

        if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (files.length === 0) {
            setError('Choose at least one offer file.');
            return;
        }

        if (!selectedTravelerId) {
            setError('Choose a traveler for these offers.');
            return;
        }

        setIsUploading(true);

        try {
            await offersApi.upload(selectedTravelerId, files);
            await onUploaded();
        } catch (requestError) {
            setError(getRequestErrorMessage(requestError, 'Unable to upload offers.'));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <AppModal
            title="Upload Offers"
            description="Choose one or more offer files to save privately."
            onClose={onClose}
        >
            <form className="space-y-5" onSubmit={handleSubmit}>
                <label className="block">
                    <span className="text-sm font-semibold text-zinc-700">Traveler</span>
                    <select
                        className="mt-1 block h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
                        disabled={travelers.length === 1 || isUploading}
                        value={selectedTravelerId}
                        onChange={(event) => {
                            setSelectedTravelerId(event.target.value);
                            setError(null);
                        }}
                    >
                        {travelers.length !== 1 ? (
                            <option value="" disabled hidden>
                                Select traveler
                            </option>
                        ) : null}
                        {travelers.map((traveler) => (
                            <option value={traveler.travelerId} key={traveler.travelerId}>
                                {formatTravelerName(traveler)}
                            </option>
                        ))}
                    </select>
                    {!selectedTravelerId ? (
                        <p className="mt-2 text-sm font-medium text-amber-700">
                            Select a traveler before uploading offers.
                        </p>
                    ) : null}
                </label>

                <label
                    className={[
                        'block cursor-pointer rounded-lg border border-dashed p-6 text-center transition',
                        isDragging ? 'border-[#0B65CA] bg-blue-50' : 'border-zinc-300 bg-zinc-50',
                    ].join(' ')}
                    onDragEnter={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                >
                    <input
                        className="sr-only"
                        multiple
                        type="file"
                        onChange={(event) => {
                            if (event.target.files) addFiles(event.target.files);
                            event.currentTarget.value = '';
                        }}
                    />
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0B65CA] text-white">
                        <UploadIcon />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-zinc-950">Drag and drop offer files here</p>
                    <p className="mt-1 text-sm text-zinc-500">or browse from your computer</p>
                    <span className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100">
                        Browse Files
                    </span>
                </label>

                {files.length > 0 ? (
                    <div className="rounded-lg border border-zinc-200">
                        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-950">
                            {files.length} selected
                        </div>
                        <ul className="max-h-44 divide-y divide-zinc-100 overflow-y-auto">
                            {files.map((file) => (
                                <li
                                    className="flex items-center justify-between gap-3 px-4 py-3"
                                    key={getFileKey(file)}
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-zinc-950">{file.name}</p>
                                        <p className="text-xs text-zinc-500">{formatFileSize(file.size)}</p>
                                    </div>
                                    <button
                                        className="text-sm font-semibold text-zinc-500 transition hover:text-red-700"
                                        type="button"
                                        onClick={() =>
                                            setFiles((currentFiles) =>
                                                currentFiles.filter((currentFile) => currentFile !== file)
                                            )
                                        }
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {error ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                        {error}
                    </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-between">
                    <button
                        className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25"
                        type="button"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="inline-flex h-10 items-center justify-center rounded-md bg-[#0B65CA] px-4 text-sm font-semibold text-white transition hover:bg-[#45AEFC] hover:text-zinc-950 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={files.length === 0 || !selectedTravelerId || isUploading}
                        type="submit"
                    >
                        {isUploading ? 'Uploading...' : 'Upload Offers'}
                    </button>
                </div>
            </form>
        </AppModal>
    );
}

function getFileKey(file: File) {
    return `${file.name}-${file.size}-${file.lastModified}`;
}

function formatTravelerName(traveler: Traveler) {
    return [traveler.firstName, traveler.lastName].filter(Boolean).join(' ');
}

function UploadIcon() {
    return (
        <svg className="h-4 w-4" aria-hidden="true" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.5 16a4.5 4.5 0 0 1-.74-8.94 5 5 0 0 1 9.55 1.55A3.75 3.75 0 0 1 14.25 16H12a.75.75 0 0 1 0-1.5h2.25a2.25 2.25 0 0 0 .2-4.49.75.75 0 0 1-.68-.64 3.5 3.5 0 0 0-6.78-.75.75.75 0 0 1-.7.48A3 3 0 0 0 6.5 14.5H8a.75.75 0 0 1 0 1.5H6.5Z" />
            <path d="M10 17.5a.75.75 0 0 1-.75-.75v-5.19l-1.22 1.22a.75.75 0 0 1-1.06-1.06l2.5-2.5a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 1 1-1.06 1.06l-1.22-1.22v5.19a.75.75 0 0 1-.75.75Z" />
        </svg>
    );
}

const fileSizeFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
});

function formatFileSize(sizeBytes: number) {
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${fileSizeFormatter.format(sizeBytes / 1024)} KB`;

    return `${fileSizeFormatter.format(sizeBytes / 1024 / 1024)} MB`;
}

function getRequestErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}
