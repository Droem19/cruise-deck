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
    sharedByTravelerIds: [],
    ships: [],
    travelerIds: [],
} satisfies SailingListFilters;
const sailingPageSize = 100;

export function AppPage() {
    const { user } = useAuth();
    const { travelers } = useTravelers();
    const [sailings, setSailings] = useState<Sailing[]>([]);
    const [sailingFilters, setSailingFilters] = useState<SailingListFilters>(initialSailingFilters);
    const [sailingPageIndex, setSailingPageIndex] = useState(0);
    const [totalSailingCount, setTotalSailingCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadSailings = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await sailingsApi.list({
                    ...sailingFilters,
                    limit: sailingPageSize,
                    offset: sailingPageIndex * sailingPageSize,
                });
                if (!cancelled) {
                    setSailings(response.sailings);
                    setTotalSailingCount(response.totalCount);
                }
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
    }, [sailingFilters, sailingPageIndex]);

    const handleSailingFiltersChange = (filters: SailingListFilters) => {
        setSailingFilters(filters);
        setSailingPageIndex(0);
    };

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
                    pageIndex={sailingPageIndex}
                    pageSize={sailingPageSize}
                    sailings={sailings}
                    totalCount={totalSailingCount}
                    travelers={travelers}
                    onFiltersChange={handleSailingFiltersChange}
                    onPageChange={setSailingPageIndex}
                />
            </section>
        </AppLayout>
    );
}

function getRequestErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}
