import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';

import { AuthProvider, RequireAuth } from './auth/auth-context';
import { AppPage } from './pages/app';
import { ForgotPasswordPage } from './pages/forgot-password';
import { HomePage } from './pages/home';
import { NotFoundPage } from './pages/not-found';
import { SignUpPage } from './pages/sign-up';
import { VerifyEmailPage } from './pages/verify-email';

import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
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
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>
);
