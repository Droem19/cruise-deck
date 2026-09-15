import type { ReactNode } from 'react';

import { AppFooter } from './app-footer';
import { AppNavbar } from './app-navbar';

type AppLayoutProps = {
    children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col bg-stone-50 text-zinc-950">
            <AppNavbar />

            <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>

            <AppFooter />
        </div>
    );
}
