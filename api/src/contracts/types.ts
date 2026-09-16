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
