import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';

import { offersApi, type UploadedOffer } from '../api/offers';
import { type Traveler, travelersApi } from '../api/travelers';
import { useAuth } from '../auth/auth-context';
import { AppLayout, offersUpdatedEventName, travelersUpdatedEventName } from '../components/app-layout';
import { AppModal } from '../components/app-modal';
import { UploadOffersModal } from '../components/upload-offers-modal';

export function OffersPage() {
    const { user } = useAuth();
    const [offers, setOffers] = useState<UploadedOffer[]>([]);
    const [travelers, setTravelers] = useState<Traveler[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);
    const [offerPendingDelete, setOfferPendingDelete] = useState<UploadedOffer | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadTravelers = async () => {
            try {
                const travelersResponse = await travelersApi.list();
                if (!cancelled) setTravelers(travelersResponse.travelers);
            } catch (requestError) {
                if (!cancelled) setError(getRequestErrorMessage(requestError, 'Unable to load travelers.'));
            }
        };

        const loadOffers = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const [offersResponse, travelersResponse] = await Promise.all([offersApi.list(), travelersApi.list()]);

                if (!cancelled) {
                    setOffers(offersResponse.offers);
                    setTravelers(travelersResponse.travelers);
                }
            } catch (requestError) {
                if (!cancelled) setError(getRequestErrorMessage(requestError, 'Unable to load offers.'));
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void loadOffers();
        window.addEventListener(offersUpdatedEventName, loadOffers);
        window.addEventListener(travelersUpdatedEventName, loadTravelers);

        return () => {
            cancelled = true;
            window.removeEventListener(offersUpdatedEventName, loadOffers);
            window.removeEventListener(travelersUpdatedEventName, loadTravelers);
        };
    }, []);

    if (!user) return <Navigate to="/" replace />;

    const refreshOffers = async () => {
        const response = await offersApi.list();
        setOffers(response.offers);
    };

    const handleDownload = async (offerId: string) => {
        setError(null);

        try {
            const response = await offersApi.download(offerId);
            window.location.assign(response.downloadUrl);
        } catch (requestError) {
            setError(getRequestErrorMessage(requestError, 'Unable to download offer.'));
        }
    };

    const handleDelete = async (offer: UploadedOffer) => {
        const offerId = offer.offerId;

        setError(null);
        setDeletingOfferId(offerId);

        try {
            await offersApi.delete(offerId);
            setOffers((currentOffers) => currentOffers.filter((offer) => offer.offerId !== offerId));
            setOfferPendingDelete(null);
        } catch (requestError) {
            setError(getRequestErrorMessage(requestError, 'Unable to delete offer.'));
        } finally {
            setDeletingOfferId(null);
        }
    };

    return (
        <AppLayout>
            <section className="flex w-full flex-col gap-5">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-base font-medium text-zinc-500">Cruise Deck</p>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Offers</h1>
                    </div>
                    <button
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0B65CA] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#45AEFC] hover:text-zinc-950 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25"
                        disabled={travelers.length === 0}
                        type="button"
                        onClick={() => setIsUploadOpen(true)}
                    >
                        <UploadIcon />
                        Upload Offers
                    </button>
                </header>

                {error ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                        {error}
                    </div>
                ) : null}

                <OffersTable
                    deletingOfferId={deletingOfferId}
                    isLoading={isLoading}
                    offers={offers}
                    travelers={travelers}
                    onDelete={setOfferPendingDelete}
                    onDownload={handleDownload}
                />

                {isUploadOpen ? (
                    <UploadOffersModal
                        travelers={travelers}
                        onClose={() => setIsUploadOpen(false)}
                        onUploaded={async () => {
                            await refreshOffers();
                            setIsUploadOpen(false);
                        }}
                    />
                ) : null}

                {offerPendingDelete ? (
                    <DeleteOfferModal
                        isDeleting={deletingOfferId === offerPendingDelete.offerId}
                        offer={offerPendingDelete}
                        onCancel={() => setOfferPendingDelete(null)}
                        onConfirm={() => void handleDelete(offerPendingDelete)}
                    />
                ) : null}
            </section>
        </AppLayout>
    );
}

function DeleteOfferModal({
    offer,
    isDeleting,
    onCancel,
    onConfirm,
}: {
    offer: UploadedOffer;
    isDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <AppModal
            title="Delete Offer"
            description="This will remove the uploaded file and its offer records."
            showCloseButton={!isDeleting}
            onClose={isDeleting ? () => {} : onCancel}
        >
            <div className="space-y-5">
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                    <p className="text-sm font-semibold text-rose-900">{offer.fileName}</p>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-end">
                    <button
                        className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isDeleting}
                        type="button"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className="inline-flex h-10 items-center justify-center rounded-md border border-rose-200 bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isDeleting}
                        type="button"
                        onClick={onConfirm}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete Offer'}
                    </button>
                </div>
            </div>
        </AppModal>
    );
}

function OffersTable({
    deletingOfferId,
    isLoading,
    offers,
    travelers,
    onDelete,
    onDownload,
}: {
    deletingOfferId: string | null;
    isLoading: boolean;
    offers: UploadedOffer[];
    travelers: Traveler[];
    onDelete: (offer: UploadedOffer) => void;
    onDownload: (offerId: string) => void;
}) {
    const travelerById = new Map(travelers.map((traveler) => [traveler.travelerId, traveler]));

    return (
        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Uploaded Offers</h2>
            </div>

            {isLoading ? <p className="p-5 text-sm text-zinc-500">Loading offers...</p> : null}
            {!isLoading && offers.length === 0 ? (
                <p className="p-5 text-sm text-zinc-500">
                    No offers uploaded yet. Upload your first offer to get started.
                </p>
            ) : null}

            {offers.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[840px] border-collapse text-left text-sm">
                        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                            <tr>
                                <th className="px-5 py-3 font-semibold">File Name</th>
                                <th className="px-5 py-3 font-semibold">Traveler</th>
                                <th className="px-5 py-3 font-semibold">Uploaded</th>
                                <th className="px-5 py-3 font-semibold">Size</th>
                                <th className="px-5 py-3 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                            {offers.map((offer) => (
                                <tr className="transition hover:bg-blue-50/50" key={offer.offerId}>
                                    <td className="max-w-md px-5 py-4">
                                        <p className="truncate font-medium text-zinc-950">{offer.fileName}</p>
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-zinc-700">
                                        {formatOfferTravelerName(offer, travelerById)}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-zinc-700">
                                        {formatDateTime(offer.uploadedAt)}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-zinc-700">
                                        {formatFileSize(offer.sizeBytes)}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25"
                                                type="button"
                                                onClick={() => onDownload(offer.offerId)}
                                            >
                                                Download
                                            </button>
                                            <button
                                                className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                                                disabled={deletingOfferId === offer.offerId}
                                                type="button"
                                                onClick={() => onDelete(offer)}
                                            >
                                                {deletingOfferId === offer.offerId ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : null}
        </section>
    );
}

function formatTravelerName(traveler: Traveler) {
    return [traveler.firstName, traveler.lastName].filter(Boolean).join(' ');
}

function formatOfferTravelerName(offer: UploadedOffer, travelerById: Map<string, Traveler>) {
    const traveler = travelerById.get(offer.travelerId);

    return traveler ? formatTravelerName(traveler) : 'Unknown traveler';
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

function formatDateTime(value: string) {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function getRequestErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}
