import { Navigate } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { AppLayout } from '../components/app-layout';

export function UsersPage() {
    const { user } = useAuth();

    if (!user) return <Navigate to="/" replace />;

    return (
        <AppLayout>
            <section className="flex w-full flex-col gap-5">
                <header>
                    <p className="text-base font-medium text-zinc-500">Cruise Deck</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">Users</h1>
                </header>

                <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-zinc-500">User and traveler management coming next.</p>
                </section>
            </section>
        </AppLayout>
    );
}
