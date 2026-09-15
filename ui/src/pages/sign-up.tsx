import { type SyntheticEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { PasswordVisibilityIcon } from '../components/password-visibility-icon';

export function SignUpPage() {
    const { signUp, user } = useAuth();
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const shouldShowEmailError = email.length > 0 && !hasValidEmail;
    const passwordRequirements = [
        { label: 'Uppercase', isMet: /[A-Z]/.test(password) },
        { label: 'Lowercase', isMet: /[a-z]/.test(password) },
        { label: 'Number', isMet: /\d/.test(password) },
        { label: 'Special character', isMet: /[^A-Za-z0-9]/.test(password) },
        { label: '8+ characters', isMet: password.length >= 8 },
    ];
    const hasValidPassword = passwordRequirements.every((requirement) => requirement.isMet);

    if (user) return <Navigate to="/app" replace />;

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        if (!firstName.trim() || !lastName.trim()) {
            setError('First name and last name are required.');
            setIsSubmitting(false);
            return;
        }

        if (!hasValidEmail) {
            setError('Enter a valid email address.');
            setIsSubmitting(false);
            return;
        }

        if (!hasValidPassword) {
            setError('Password does not meet all requirements.');
            setIsSubmitting(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setIsSubmitting(false);
            return;
        }

        try {
            await signUp({ email, password, firstName: firstName.trim(), lastName: lastName.trim() });
            navigate(`/verify?email=${encodeURIComponent(email)}`, { replace: true, state: { password } });
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Unable to create your account.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="grid min-h-svh place-items-center bg-stone-50 px-6 py-10 text-zinc-950">
            <section className="w-full max-w-sm">
                <div className="flex justify-center">
                    <img className="h-14 w-14 rounded-xl shadow-sm" alt="Cruise Deck" src="/CruiseDeck-Logo.png" />
                </div>
                <div className="mt-5 rounded-lg border border-zinc-200 bg-white px-6 py-5 shadow-sm">
                    <h1 className="text-center text-xl font-semibold tracking-tight">Create Account</h1>

                    <form className="mt-5 space-y-5" noValidate onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block text-sm font-medium text-zinc-700">
                                First Name
                                <input
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                                    autoComplete="given-name"
                                    name="firstName"
                                    type="text"
                                    value={firstName}
                                    onChange={(event) => {
                                        setFirstName(event.target.value);
                                        setError(null);
                                    }}
                                />
                            </label>

                            <label className="block text-sm font-medium text-zinc-700">
                                Last Name
                                <input
                                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                                    autoComplete="family-name"
                                    name="lastName"
                                    type="text"
                                    value={lastName}
                                    onChange={(event) => {
                                        setLastName(event.target.value);
                                        setError(null);
                                    }}
                                />
                            </label>
                        </div>

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
                        {shouldShowEmailError ? (
                            <p className="-mt-2 text-xs font-medium text-red-700">A valid email address is required.</p>
                        ) : null}

                        <div>
                            <label className="block text-sm font-medium text-zinc-700" htmlFor="password">
                                Password
                            </label>
                            <div className="relative mt-2">
                                <input
                                    className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 pr-10 text-base outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                                    autoComplete="new-password"
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
                                    className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25"
                                    type="button"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    aria-pressed={showPassword}
                                    onClick={() => setShowPassword((current) => !current)}
                                >
                                    <PasswordVisibilityIcon isVisible={showPassword} />
                                </button>
                            </div>
                            <ul
                                className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs font-medium"
                                aria-label="Password requirements"
                            >
                                {passwordRequirements.map((requirement) => (
                                    <li
                                        className={
                                            requirement.isMet
                                                ? 'flex items-center gap-2 text-emerald-700'
                                                : 'flex items-center gap-2 text-zinc-500'
                                        }
                                        key={requirement.label}
                                        aria-label={`${requirement.label}: ${requirement.isMet ? 'met' : 'not met'}`}
                                    >
                                        <span
                                            className={
                                                requirement.isMet
                                                    ? 'h-2 w-2 rounded-full bg-emerald-600'
                                                    : 'h-2 w-2 rounded-full bg-zinc-300'
                                            }
                                            aria-hidden="true"
                                        />
                                        {requirement.label}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700" htmlFor="confirmPassword">
                                Confirm password
                            </label>
                            <div className="relative mt-2">
                                <input
                                    className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 pr-10 text-base outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                                    autoComplete="new-password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(event) => {
                                        setConfirmPassword(event.target.value);
                                        setError(null);
                                    }}
                                />
                                <button
                                    className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25"
                                    type="button"
                                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                    aria-pressed={showConfirmPassword}
                                    onClick={() => setShowConfirmPassword((current) => !current)}
                                >
                                    <PasswordVisibilityIcon isVisible={showConfirmPassword} />
                                </button>
                            </div>
                        </div>

                        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

                        <button
                            className="h-11 w-full rounded-md bg-[#0B65CA] px-4 text-sm font-semibold text-white transition hover:bg-[#45AEFC] hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSubmitting}
                            type="submit"
                        >
                            {isSubmitting ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
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
