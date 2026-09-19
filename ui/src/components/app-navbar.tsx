import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import type { AuthUser } from '../api/auth';
import { useAuth } from '../auth/auth-context';

const getNameParts = (user: AuthUser) => {
    const fallback = formatFallbackName(user.email);
    const nameParts = user.name?.trim().split(/\s+/) ?? [];

    return {
        firstName: user.givenName?.trim() || nameParts[0] || fallback,
        lastName: user.familyName?.trim() || nameParts.slice(1).join(' '),
    };
};

const formatFallbackName = (email: string) => {
    const localPart = email.split('@')[0] ?? '';
    const firstPart = localPart.split(/[._-]/)[0] ?? localPart;

    if (!firstPart) return 'Account';

    return `${firstPart.charAt(0).toUpperCase()}${firstPart.slice(1)}`;
};

const getDisplayName = (user: AuthUser) => {
    const { firstName, lastName } = getNameParts(user);

    return [firstName, lastName].filter(Boolean).join(' ');
};

const getInitials = (user: AuthUser) => {
    const { firstName, lastName } = getNameParts(user);
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();

    return initials.toUpperCase() || 'CD';
};

type AppNavbarProps = {
    onProfileSelect?: () => void;
};

export function AppNavbar({ onProfileSelect }: AppNavbarProps) {
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

    const handleProfileClick = () => {
        setIsMenuOpen(false);
        onProfileSelect?.();
    };

    if (!user) return null;

    const displayName = getDisplayName(user);
    const initials = getInitials(user);

    return (
        <header className="bg-white shadow-sm">
            <nav className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8" aria-label="Main">
                <div />

                <div className="relative shrink-0" ref={menuRef}>
                    <button
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-transparent px-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none"
                        type="button"
                        aria-expanded={isMenuOpen}
                        aria-haspopup="menu"
                        onClick={() => setIsMenuOpen((current) => !current)}
                    >
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0B65CA] text-xs font-bold text-white">
                            {initials}
                        </span>
                        <span>{displayName}</span>
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
                            className="absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
                            role="menu"
                        >
                            <button
                                className="block w-full px-4 py-2 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 focus:bg-zinc-100 focus:outline-none"
                                type="button"
                                role="menuitem"
                                onClick={handleProfileClick}
                            >
                                Profile
                            </button>
                            <button
                                className="block w-full px-4 py-2 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 focus:bg-red-50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSigningOut}
                                type="button"
                                role="menuitem"
                                onClick={handleLogout}
                            >
                                {isSigningOut ? 'Logging out...' : 'Log Out'}
                            </button>
                        </div>
                    ) : null}
                </div>
            </nav>
        </header>
    );
}
