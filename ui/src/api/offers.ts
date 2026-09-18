import { apiUrl, authFetch, parseResponse } from './client';

export type UploadedOffer = {
    offerId: string;
    travelerId: string;
    fileName: string;
    sizeBytes: number;
    uploadedAt: string;
};

type ListOffersResponse = {
    offers: UploadedOffer[];
};

type UploadOffersResponse = {
    offers: UploadedOffer[];
};

type DownloadOfferResponse = {
    offerId: string;
    fileName: string;
    downloadUrl: string;
    expiresInSeconds: number;
};

type MessageResponse = {
    message: string;
};

export const offersApi = {
    list: async () => {
        const response = await authFetch(`${apiUrl}/offers`);

        return parseResponse<ListOffersResponse>(response);
    },
    upload: async (travelerId: string, files: File[]) => {
        const formData = new FormData();

        formData.append('travelerId', travelerId);

        for (const file of files) {
            formData.append('files', file);
        }

        const response = await authFetch(`${apiUrl}/offers`, {
            method: 'POST',
            body: formData,
        });

        return parseResponse<UploadOffersResponse>(response);
    },
    download: async (offerId: string) => {
        const response = await authFetch(`${apiUrl}/offers/${encodeURIComponent(offerId)}/download`);

        return parseResponse<DownloadOfferResponse>(response);
    },
    delete: async (offerId: string) => {
        const response = await authFetch(`${apiUrl}/offers/${encodeURIComponent(offerId)}`, {
            method: 'DELETE',
        });

        return parseResponse<MessageResponse>(response);
    },
};
