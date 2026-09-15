import { type SyntheticEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';

import { useAuth } from '../auth/auth-context';

type VerifyLocationState = {
    password?: string;
};

export function VerifyEmailPage() {
    const { confirmSignUp, login, resendCode, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const locationState = location.state as VerifyLocationState | null;
    const password = typeof locationState?.password === 'string' ? locationState.password : undefined;
    const [email, setEmail] = useState(searchParams.get('email') ?? '');
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);

    if (user) return <Navigate to="/app" replace />;

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
        event.preventDefault();
        setError(null);
        setMessage(null);

        if (!email) {
            setError('Email is required.');
            return;
        }

        if (code.length !== 6) {
            setError('Enter the 6-digit verification code.');
            return;
        }

        setIsSubmitting(true);

        try {
            const responseMessage = await confirmSignUp(email, code);
            if (password) {
                await login(email, password);
                navigate('/app', { replace: true });
                return;
            }

            navigate('/', { replace: true, state: { message: responseMessage } });
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to verify your account.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        setError(null);
        setMessage(null);
        setIsResending(true);

        try {
            const responseMessage = await resendCode(email);
            setMessage(responseMessage);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to resend the verification code.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <main className="grid min-h-svh place-items-center bg-stone-50 px-6 py-10 text-zinc-950">
            <section className="w-full max-w-sm">
                <div className="flex justify-center">
                    <img
                        className="h-auto w-full max-w-72 object-contain"
                        alt="Cruise Deck"
                        src="/CruiseDeck-Banner.png"
                    />
                </div>
                <div className="mt-5 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                    <h1 className="text-center text-xl font-semibold tracking-tight">Verify Account</h1>

                    <form className="mt-5 space-y-5" noValidate onSubmit={handleSubmit}>
                        <label className="block text-sm font-medium text-zinc-700">
                            Email
                            <input
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                                autoComplete="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(event) => {
                                    setEmail(event.target.value);
                                    setError(null);
                                }}
                            />
                        </label>

                        <label className="block text-sm font-medium text-zinc-700">
                            Verification code
                            <input
                                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base tracking-[0.2em] outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                                autoComplete="one-time-code"
                                inputMode="numeric"
                                maxLength={6}
                                name="code"
                                value={code}
                                onChange={(event) => {
                                    setCode(event.target.value);
                                    setError(null);
                                }}
                            />
                        </label>

                        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
                        {message ? <p className="text-sm font-medium text-[#0B65CA]">{message}</p> : null}

                        <button
                            className="h-11 w-full rounded-md bg-[#0B65CA] px-4 text-sm font-semibold text-white transition hover:bg-[#45AEFC] hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSubmitting}
                            type="submit"
                        >
                            {isSubmitting ? 'Verifying...' : 'Verify Account'}
                        </button>
                    </form>

                    <div className="mt-5 flex items-center justify-between text-sm">
                        <button
                            className="font-medium text-zinc-600 underline underline-offset-4 transition hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isResending || !email}
                            type="button"
                            onClick={handleResend}
                        >
                            {isResending ? 'Sending...' : 'Resend code'}
                        </button>
                        <Link
                            className="font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950"
                            to="/"
                        >
                            Back to login
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}
