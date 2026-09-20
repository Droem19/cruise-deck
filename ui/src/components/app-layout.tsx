import { type FormEvent, type ReactNode, useState } from 'react';
import { Link, NavLink } from 'react-router';

import { AppNavbar } from './app-navbar';
import { ProfileModal } from './profile-modal';
import { UploadOffersModal } from './upload-offers-modal';
import type { Traveler } from '../api/travelers';
import { useTravelers } from '../app-data/travelers-context';

type AppLayoutProps = {
    children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { addTraveler, isLoadingTravelers, travelers, travelersError } = useTravelers();
    const [isUploadOffersOpen, setIsUploadOffersOpen] = useState(false);
    const [isTravelersOpen, setIsTravelersOpen] = useState(true);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [isCreatingTraveler, setIsCreatingTraveler] = useState(false);
    const [newTravelerFirstName, setNewTravelerFirstName] = useState('');
    const [newTravelerLastName, setNewTravelerLastName] = useState('');
    const [quickAddError, setQuickAddError] = useState<string | null>(null);

    const handleQuickAddTraveler = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setQuickAddError(null);

        const firstName = newTravelerFirstName.trim();
        const lastName = newTravelerLastName.trim();

        if (!firstName || !lastName) {
            setQuickAddError('First and last name are required.');
            return;
        }

        setIsCreatingTraveler(true);

        try {
            await addTraveler({ firstName, lastName });
            setNewTravelerFirstName('');
            setNewTravelerLastName('');
            setIsQuickAddOpen(false);
        } catch (requestError) {
            setQuickAddError(getRequestErrorMessage(requestError, 'Unable to add traveler.'));
        } finally {
            setIsCreatingTraveler(false);
        }
    };

    return (
        <div className="flex min-h-svh bg-stone-50 text-zinc-950">
            <aside className="hidden w-60 shrink-0 border-r border-[#123A6D] bg-[#0B2E5D] text-white lg:flex lg:flex-col">
                <div className="flex h-16 items-center justify-center px-4">
                    <Link className="inline-flex focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/30" to="/app">
                        <img className="h-12 w-auto object-contain" alt="Cruise Deck" src="/CruiseDeck-Banner.png" />
                    </Link>
                </div>

                <nav className="space-y-2 p-4" aria-label="App sections">
                    <NavLink
                        className={({ isActive }) =>
                            [
                                'flex h-11 items-center rounded-md px-3 text-sm font-semibold transition',
                                isActive ? 'bg-[#45AEFC] text-[#061A33]' : 'text-blue-50 hover:bg-white/10',
                            ].join(' ')
                        }
                        to="/app"
                        end
                    >
                        Sailings Dashboard
                    </NavLink>
                    <div>
                        <NavLink
                            className={({ isActive }) =>
                                [
                                    'flex h-11 items-center rounded-md px-3 text-sm font-semibold transition',
                                    isActive ? 'bg-[#45AEFC] text-[#061A33]' : 'text-blue-50 hover:bg-white/10',
                                ].join(' ')
                            }
                            to="/offers"
                        >
                            Offers
                        </NavLink>

                        <div className="mt-2 space-y-3 pl-3">
                            <button
                                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-white/20 px-3 text-sm font-semibold text-blue-50 transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/20 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={travelers.length === 0 || isLoadingTravelers}
                                type="button"
                                onClick={() => setIsUploadOffersOpen(true)}
                            >
                                <span className="text-lg leading-none">+</span>
                                Upload Offers
                            </button>
                        </div>
                    </div>
                    <div>
                        <div className="flex gap-1">
                            <NavLink
                                className={({ isActive }) =>
                                    [
                                        'flex h-11 flex-1 items-center rounded-md px-3 text-sm font-semibold transition',
                                        isActive ? 'bg-[#45AEFC] text-[#061A33]' : 'text-blue-50 hover:bg-white/10',
                                    ].join(' ')
                                }
                                to="/travelers"
                            >
                                Travelers
                            </NavLink>
                            <button
                                className="inline-flex h-11 w-9 items-center justify-center rounded-md text-blue-100 transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/20"
                                type="button"
                                aria-label={isTravelersOpen ? 'Hide traveler list' : 'Show traveler list'}
                                aria-expanded={isTravelersOpen}
                                onClick={() => setIsTravelersOpen((current) => !current)}
                            >
                                <ChevronIcon isOpen={isTravelersOpen} />
                            </button>
                        </div>

                        {isTravelersOpen ? (
                            <div className="mt-2 space-y-3 pl-3">
                                {isLoadingTravelers ? (
                                    <p className="px-3 text-sm text-blue-100">Loading travelers...</p>
                                ) : null}

                                {!isLoadingTravelers && travelers.length > 0 ? (
                                    <div className="space-y-1">
                                        {travelers.map((traveler) => (
                                            <div
                                                className="rounded-md bg-white/5 px-3 py-2 text-sm text-blue-50"
                                                key={traveler.travelerId}
                                            >
                                                {formatTravelerName(traveler)}
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                {!isLoadingTravelers && travelers.length === 0 ? (
                                    <p className="px-3 text-sm text-blue-100">No travelers yet.</p>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="mt-3 pl-3">
                            {travelersError || quickAddError ? (
                                <p className="mb-3 px-3 text-xs font-semibold text-red-100">
                                    {quickAddError ?? travelersError}
                                </p>
                            ) : null}

                            {isQuickAddOpen ? (
                                <form
                                    className="space-y-2 rounded-md bg-white/10 p-3"
                                    onSubmit={handleQuickAddTraveler}
                                >
                                    <input
                                        className="h-9 w-full rounded-md border border-white/20 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#45AEFC] focus:ring-4 focus:ring-[#45AEFC]/25"
                                        value={newTravelerFirstName}
                                        placeholder="First name"
                                        onChange={(event) => setNewTravelerFirstName(event.target.value)}
                                    />
                                    <input
                                        className="h-9 w-full rounded-md border border-white/20 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#45AEFC] focus:ring-4 focus:ring-[#45AEFC]/25"
                                        value={newTravelerLastName}
                                        placeholder="Last name"
                                        onChange={(event) => setNewTravelerLastName(event.target.value)}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            className="inline-flex h-9 items-center justify-center rounded-md bg-[#45AEFC] px-3 text-sm font-semibold text-[#061A33] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25 disabled:cursor-not-allowed disabled:opacity-60"
                                            disabled={isCreatingTraveler}
                                            type="submit"
                                        >
                                            {isCreatingTraveler ? 'Adding...' : 'Add'}
                                        </button>
                                        <button
                                            className="inline-flex h-9 items-center justify-center rounded-md border border-white/20 px-3 text-sm font-semibold text-blue-50 transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/20"
                                            type="button"
                                            onClick={() => setIsQuickAddOpen(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <button
                                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-white/20 px-3 text-sm font-semibold text-blue-50 transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/20"
                                    type="button"
                                    onClick={() => setIsQuickAddOpen(true)}
                                >
                                    <span className="text-lg leading-none">+</span>
                                    Add Traveler
                                </button>
                            )}
                        </div>
                    </div>
                </nav>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <AppNavbar onProfileSelect={() => setIsProfileOpen(true)} />

                <nav
                    className="flex gap-2 border-b border-zinc-200 bg-white px-4 py-3 lg:hidden"
                    aria-label="App sections"
                >
                    <NavLink
                        className={({ isActive }) =>
                            [
                                'inline-flex h-9 flex-1 items-center justify-center rounded-md px-3 text-sm font-semibold transition',
                                isActive ? 'bg-[#0B65CA] text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
                            ].join(' ')
                        }
                        to="/app"
                        end
                    >
                        Sailings Dashboard
                    </NavLink>
                    <NavLink
                        className={({ isActive }) =>
                            [
                                'inline-flex h-9 flex-1 items-center justify-center rounded-md px-3 text-sm font-semibold transition',
                                isActive ? 'bg-[#0B65CA] text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
                            ].join(' ')
                        }
                        to="/offers"
                    >
                        Offers
                    </NavLink>
                    <NavLink
                        className={({ isActive }) =>
                            [
                                'inline-flex h-9 flex-1 items-center justify-center rounded-md px-3 text-sm font-semibold transition',
                                isActive ? 'bg-[#0B65CA] text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
                            ].join(' ')
                        }
                        to="/travelers"
                    >
                        Travelers
                    </NavLink>
                </nav>

                <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
            </div>

            {isProfileOpen ? <ProfileModal onClose={() => setIsProfileOpen(false)} /> : null}
            {isUploadOffersOpen ? (
                <UploadOffersModal
                    travelers={travelers}
                    onClose={() => setIsUploadOffersOpen(false)}
                    onUploaded={async () => {
                        setIsUploadOffersOpen(false);
                        window.dispatchEvent(new Event(offersUpdatedEventName));
                    }}
                />
            ) : null}
        </div>
    );
}

export const offersUpdatedEventName = 'cruise-deck:offers-updated';

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
    return (
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
                fillRule="evenodd"
                d={
                    isOpen
                        ? 'M14.8 12.3a.75.75 0 0 1-1.1 0L10 8.6l-3.7 3.7a.75.75 0 1 1-1.1-1.1L9.5 7a.75.75 0 0 1 1.1 0l4.2 4.2a.75.75 0 0 1 0 1.1Z'
                        : 'M5.2 7.7a.75.75 0 0 1 1.1 0L10 11.4l3.7-3.7a.75.75 0 1 1 1.1 1.1l-4.2 4.2a.75.75 0 0 1-1.1 0L5.2 8.8a.75.75 0 0 1 0-1.1Z'
                }
                clipRule="evenodd"
            />
        </svg>
    );
}

function formatTravelerName(traveler: Traveler) {
    return [traveler.firstName, traveler.lastName].filter(Boolean).join(' ');
}

function getRequestErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}
