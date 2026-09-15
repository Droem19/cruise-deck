import { Navigate } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { AppLayout } from '../components/app-layout';

export function AppPage() {
    const { user } = useAuth();

    if (!user) return <Navigate to="/" replace />;

    return (
        <AppLayout>
            <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
                <header className="border-b border-zinc-200 pb-6">
                    <p className="text-sm font-medium text-[#0B65CA]">Cruise Deck</p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">App</h1>
                </header>

                <div className="grid gap-4 sm:grid-cols-2">
                    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                        <p className="text-sm font-medium text-zinc-500">Signed in as</p>
                        <p className="mt-2 text-lg font-semibold">{user.email}</p>
                    </section>
                    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                        <p className="text-sm font-medium text-zinc-500">Session source</p>
                        <p className="mt-2 text-lg font-semibold">Cognito cookie session</p>
                    </section>
                </div>
            </section>
        </AppLayout>
    );
}
