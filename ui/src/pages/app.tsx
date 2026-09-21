import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';

import { type Sailing, type SailingListFilters, sailingsApi } from '../api/sailings';
import { useTravelers } from '../app-data/travelers-context';
import { useAuth } from '../auth/auth-context';
import { AppLayout } from '../components/app-layout';
import { SailingTable } from '../components/sailing-table';

const initialSailingFilters = {
    departureEndDate: '',
    departurePorts: [],
    departureStartDate: '',
    guestCounts: [],
    maximumNights: '',
    minimumNights: '',
    roomTypes: [],
    ships: [],
    travelerIds: [],
} satisfies SailingListFilters;

export function AppPage() {
    const { user } = useAuth();
    const { travelers } = useTravelers();
    const [sailings, setSailings] = useState<Sailing[]>([]);
    const [sailingFilters, setSailingFilters] = useState<SailingListFilters>(initialSailingFilters);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadSailings = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await sailingsApi.list(sailingFilters);
                if (!cancelled) setSailings(response.sailings);
            } catch (requestError) {
                if (!cancelled) setError(getRequestErrorMessage(requestError, 'Unable to load sailings.'));
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void loadSailings();

        return () => {
            cancelled = true;
        };
    }, [sailingFilters]);

    if (!user) return <Navigate to="/" replace />;

    return (
        <AppLayout>
            <section className="flex w-full flex-col gap-5">
                <header>
                    <p className="text-base font-medium text-zinc-500">Welcome Back,</p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight">Explore Your Sailings</h1>
                </header>

                {error ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                        {error}
                    </div>
                ) : null}

                <SailingTable
                    filters={sailingFilters}
                    isLoading={isLoading}
                    sailings={sailings}
                    travelers={travelers}
                    onFiltersChange={setSailingFilters}
                />
            </section>
        </AppLayout>
    );
}

function getRequestErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}
