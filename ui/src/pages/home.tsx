import { type SyntheticEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { PasswordVisibilityIcon } from '../components/password-visibility-icon';

type HomeLocationState = {
    message?: string;
};

export function HomePage() {
    const { login, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const locationState = location.state as HomeLocationState | null;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState(typeof locationState?.message === 'string' ? locationState.message : null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (user) return <Navigate to="/app" replace />;

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        setIsSubmitting(true);

        try {
            await login(email, password);
            navigate('/app', { replace: true });
        } catch (requestError) {
            const message = requestError instanceof Error ? requestError.message : 'Unable to sign in.';

            if (message.toLowerCase().includes('verify')) {
                navigate(`/verify?email=${encodeURIComponent(email)}`, { state: { password } });
                return;
            }

            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="grid min-h-svh place-items-center bg-stone-50 px-6 py-10 text-zinc-950">
            <section className="w-full max-w-xs">
                <div className="flex justify-center">
                    <img
                        className="h-auto w-full max-w-72 object-contain"
                        alt="Cruise Deck"
                        src="/CruiseDeck-Banner.png"
                    />
                </div>

                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    <label className="block text-sm font-medium text-zinc-700">
                        Email
                        <input
                            className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
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

                    <div>
                        <label className="block text-sm font-medium text-zinc-700" htmlFor="password">
                            Password
                        </label>
                        <div className="relative mt-2">
                            <input
                                className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 pr-10 text-sm outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                                autoComplete="current-password"
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    setError(null);
                                }}
                            />
                            <button
                                className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25"
                                type="button"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                aria-pressed={showPassword}
                                onClick={() => setShowPassword((current) => !current)}
                            >
                                <PasswordVisibilityIcon isVisible={showPassword} />
                            </button>
                        </div>
                    </div>

                    {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
                    {message ? <p className="text-sm font-medium text-[#0B65CA]">{message}</p> : null}

                    <div className="space-y-3 pt-1 text-center">
                        <button
                            className="h-10 w-full rounded-md bg-[#0B65CA] px-4 text-sm font-semibold text-white transition hover:bg-[#45AEFC] hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSubmitting}
                            type="submit"
                        >
                            {isSubmitting ? 'Signing in...' : 'Sign in'}
                        </button>

                        <Link
                            className="inline-flex text-sm font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950"
                            to="/forgot-password"
                        >
                            Forgot your password?
                        </Link>
                    </div>
                </form>

                <div className="mt-6 space-y-3 text-center">
                    <p className="text-base font-medium text-zinc-600">Don't have an account?</p>
                    <Link
                        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-[#0B65CA] bg-white px-4 text-sm font-semibold text-[#0B65CA] transition hover:border-[#45AEFC] hover:bg-[#45AEFC] hover:text-zinc-950"
                        to="/signup"
                    >
                        Create new account
                    </Link>
                </div>
            </section>
        </main>
    );
}
