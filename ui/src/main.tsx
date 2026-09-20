import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { AppDataProvider } from './app-data/app-data-provider';
import { AuthProvider, RequireAuth } from './auth/auth-context';
import { AppPage } from './pages/app';
import { ForgotPasswordPage } from './pages/forgot-password';
import { HomePage } from './pages/home';
import { NotFoundPage } from './pages/not-found';
import { OffersPage } from './pages/offers';
import { SignUpPage } from './pages/sign-up';
import { TravelersPage } from './pages/travelers';
import { VerifyEmailPage } from './pages/verify-email';

import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <AppDataProvider>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/signup" element={<SignUpPage />} />
                        <Route path="/verify" element={<VerifyEmailPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route
                            path="/app"
                            element={
                                <RequireAuth>
                                    <AppPage />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/offers"
                            element={
                                <RequireAuth>
                                    <OffersPage />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/travelers"
                            element={
                                <RequireAuth>
                                    <TravelersPage />
                                </RequireAuth>
                            }
                        />
                        <Route path="/users" element={<Navigate to="/travelers" replace />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </AppDataProvider>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>
);
