import { createContext, type ReactNode, use, useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import { type AuthUser, authApi, type SignUpRequest } from './api';

type AuthContextValue = {
    user: AuthUser | null;
    login: (email: string, password: string) => Promise<void>;
    signUp: (request: SignUpRequest) => Promise<string>;
    confirmSignUp: (email: string, code: string) => Promise<string>;
    resendCode: (email: string) => Promise<string>;
    forgotPassword: (email: string) => Promise<string>;
    confirmForgotPassword: (email: string, code: string, password: string) => Promise<string>;
    refreshUser: () => Promise<boolean>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);

    const refreshUser = useCallback(async () => {
        try {
            const response = await authApi.me();
            setUser(response.user);
            return true;
        } catch {
            setUser(null);
            return false;
        }
    }, []);

    const value: AuthContextValue = {
        user,
        login: async (email, password) => {
            const response = await authApi.login(email, password);
            setUser(response.user);
        },
        signUp: async (request) => {
            const response = await authApi.signUp(request);
            return response.message;
        },
        confirmSignUp: async (email, code) => {
            const response = await authApi.confirmSignUp(email, code);
            return response.message;
        },
        resendCode: async (email) => {
            const response = await authApi.resendCode(email);
            return response.message;
        },
        forgotPassword: async (email) => {
            const response = await authApi.forgotPassword(email);
            return response.message;
        },
        confirmForgotPassword: async (email, code, password) => {
            const response = await authApi.confirmForgotPassword(email, code, password);
            return response.message;
        },
        refreshUser,
        logout: async () => {
            try {
                await authApi.logout();
            } finally {
                setUser(null);
            }
        },
    };

    return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
    const context = use(AuthContext);

    if (!context) throw new Error('useAuth must be used within AuthProvider');

    return context;
}

export function RequireAuth({ children }: { children: ReactNode }) {
    const { refreshUser, user } = useAuth();
    const location = useLocation();
    const [hasCheckedSession, setHasCheckedSession] = useState(false);

    useEffect(() => {
        if (user || hasCheckedSession) return;

        let cancelled = false;

        refreshUser().finally(() => {
            if (!cancelled) setHasCheckedSession(true);
        });

        return () => {
            cancelled = true;
        };
    }, [hasCheckedSession, refreshUser, user]);

    if (!user && !hasCheckedSession) {
        return (
            <main className="grid min-h-svh place-items-center bg-stone-50 px-6 py-10 text-zinc-950">
                <p className="text-sm font-medium text-zinc-500">Checking your session...</p>
            </main>
        );
    }

    if (!user) {
        return <Navigate to="/" replace state={{ from: location.pathname }} />;
    }

    return children;
}
