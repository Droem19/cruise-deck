import { type ReactNode, useState } from 'react';
import { NavLink } from 'react-router';

import { AppNavbar } from './app-navbar';
import { ProfileModal } from './profile-modal';

type AppLayoutProps = {
    children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <div className="flex min-h-svh bg-stone-50 text-zinc-950">
            <aside className="hidden w-60 shrink-0 border-r border-[#123A6D] bg-[#0B2E5D] p-4 text-white lg:flex lg:flex-col">
                <div className="mx-auto mb-8 block w-44">
                    <img className="h-auto w-full object-contain" alt="Cruise Deck" src="/CruiseDeck-Banner.png" />
                </div>

                <nav className="space-y-2" aria-label="App sections">
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
                        Home
                    </NavLink>
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
                    <NavLink
                        className={({ isActive }) =>
                            [
                                'flex h-11 items-center rounded-md px-3 text-sm font-semibold transition',
                                isActive ? 'bg-[#45AEFC] text-[#061A33]' : 'text-blue-50 hover:bg-white/10',
                            ].join(' ')
                        }
                        to="/travelers"
                    >
                        Travelers
                    </NavLink>
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
                        Home
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
        </div>
    );
}
