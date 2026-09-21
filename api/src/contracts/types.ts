export type AuthUser = {
    sub: string;
    email: string;
    emailVerified: boolean;
    name?: string;
    givenName?: string;
    familyName?: string;
};

export type AuthResponse = {
    user: AuthUser;
};

export type MeResponse = {
    user: AuthUser;
};

export type MessageResponse = {
    message: string;
};

export type Traveler = {
    travelerId: string;
    firstName: string;
    lastName: string;
    createdAt: string;
};

export type ListTravelersResponse = {
    travelers: Traveler[];
};

export type TravelerResponse = {
    traveler: Traveler;
};

export type CreateTravelerRequest = {
    firstName: string;
    lastName: string;
};

export type UpdateTravelerRequest = {
    firstName?: string;
    lastName?: string;
};

export type UploadedOffer = {
    offerId: string;
    travelerId: string;
    fileName: string;
    sizeBytes: number;
    uploadedAt: string;
};

export type Sailing = {
    sailingId: string;
    offerId: string;
    travelerId: string;
    offerCode: string;
    offerTitle: string;
    ship: string;
    departurePort: string;
    sailDate: string;
    sailDateSort: string;
    itinerary: string;
    roomType: string;
    offerType: string;
    parsedAt: string;
};

export type ListSailingsResponse = {
    sailings: Sailing[];
    totalCount: number;
};

export type ListOffersResponse = {
    offers: UploadedOffer[];
};

export type UploadOffersResponse = {
    offers: UploadedOffer[];
};

export type DownloadOfferResponse = {
    offerId: string;
    fileName: string;
    downloadUrl: string;
    expiresInSeconds: number;
};

export type SignUpResponse = MessageResponse & {
    userConfirmed: boolean;
};

export type EmailPasswordRequest = {
    email: string;
    password: string;
};

export type SignUpRequest = EmailPasswordRequest & {
    firstName: string;
    lastName: string;
};

export type UpdateProfileRequest = {
    firstName?: string;
    lastName?: string;
};

export type EmailCodeRequest = {
    email: string;
    code: string;
};

export type ConfirmForgotPasswordRequest = EmailCodeRequest & {
    password: string;
};

export type EmailRequest = {
    email: string;
};

export type CognitoConfig = {
    userPoolId: string;
    clientId: string;
    region: string;
};
