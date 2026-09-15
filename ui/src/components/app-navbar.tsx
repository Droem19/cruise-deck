import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import type { AuthUser } from '../auth/api';
import { useAuth } from '../auth/auth-context';

const formatFallbackName = (email: string) => {
    const localPart = email.split('@')[0] ?? '';
    const firstPart = localPart.split(/[._-]/)[0] ?? localPart;

    if (!firstPart) return 'Account';

    return `${firstPart.charAt(0).toUpperCase()}${firstPart.slice(1)}`;
};

const getDisplayName = (user: AuthUser) => formatFallbackName(user.email);

export function AppNavbar() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const menuRef = useRef<HTMLDivElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    useEffect(() => {
        if (!isMenuOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMenuOpen]);

    const handleLogout = async () => {
        setIsMenuOpen(false);
        setIsSigningOut(true);

        try {
            await logout();
            navigate('/', { replace: true });
        } finally {
            setIsSigningOut(false);
        }
    };

    if (!user) return null;

    return (
        <header className="border-b border-zinc-200 bg-white shadow-sm">
            <nav
                className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6"
                aria-label="Main"
            >
                <Link className="flex items-center" to="/app">
                    <img
                        className="h-10 w-auto max-w-44 object-contain"
                        alt="Cruise Deck"
                        src="/CruiseDeck-Banner.png"
                    />
                </Link>

                <div className="relative shrink-0" ref={menuRef}>
                    <button
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25"
                        type="button"
                        aria-expanded={isMenuOpen}
                        aria-haspopup="menu"
                        onClick={() => setIsMenuOpen((current) => !current)}
                    >
                        <span>{getDisplayName(user)}</span>
                        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M5.2 7.7a.75.75 0 0 1 1.1 0L10 11.4l3.7-3.7a.75.75 0 1 1 1.1 1.1l-4.2 4.2a.75.75 0 0 1-1.1 0L5.2 8.8a.75.75 0 0 1 0-1.1Z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>

                    {isMenuOpen ? (
                        <div
                            className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
                            role="menu"
                        >
                            <p className="truncate border-b border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-500">
                                {user.email}
                            </p>
                            <button
                                className="block w-full px-4 py-2 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 focus:bg-red-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSigningOut}
                                type="button"
                                role="menuitem"
                                onClick={handleLogout}
                            >
                                {isSigningOut ? 'Signing out...' : 'Sign out'}
                            </button>
                        </div>
                    ) : null}
                </div>
            </nav>
        </header>
    );
}
