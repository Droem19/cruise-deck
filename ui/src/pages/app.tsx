import { Navigate } from 'react-router';

import { useAuth } from '../auth/auth-context';
import { AppLayout } from '../components/app-layout';
import { SailingTable } from '../components/sailing-table';

export function AppPage() {
    const { user } = useAuth();

    if (!user) return <Navigate to="/" replace />;

    return (
        <AppLayout>
            <section className="flex w-full flex-col gap-5">
                <header>
                    <p className="text-base font-medium text-zinc-500">Welcome Back,</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">Explore Your Sailings</h1>
                </header>

                <SailingTable />
            </section>
        </AppLayout>
    );
}
