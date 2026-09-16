import { Navigate } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { AppLayout } from '../components/app-layout';

export function OffersPage() {
    const { user } = useAuth();

    if (!user) return <Navigate to="/" replace />;

    return (
        <AppLayout>
            <section className="flex w-full flex-col gap-5">
                <header>
                    <p className="text-base font-medium text-zinc-500">Cruise Deck</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">Offers</h1>
                </header>

                <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-zinc-500">Offers workspace coming next.</p>
                </section>
            </section>
        </AppLayout>
    );
}
