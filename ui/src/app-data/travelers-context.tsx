import { createContext, type ReactNode, use, useCallback, useEffect, useState } from 'react';

import { type Traveler, travelersApi } from '../api/travelers';
import { useAuth } from '../auth/auth-context';

type TravelersContextValue = {
    travelers: Traveler[];
    isLoadingTravelers: boolean;
    travelersError: string | null;
    refreshTravelers: () => Promise<void>;
    addTraveler: (request: { firstName: string; lastName: string }) => Promise<Traveler>;
    updateTraveler: (travelerId: string, request: { firstName: string; lastName: string }) => Promise<Traveler>;
    deleteTraveler: (travelerId: string) => Promise<void>;
};

const TravelersContext = createContext<TravelersContextValue | null>(null);

export function TravelersProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [travelers, setTravelers] = useState<Traveler[]>([]);
    const [isLoadingTravelers, setIsLoadingTravelers] = useState(false);
    const [travelersError, setTravelersError] = useState<string | null>(null);
    const [hasLoadedTravelers, setHasLoadedTravelers] = useState(false);

    const refreshTravelers = useCallback(async () => {
        if (!user) return;

        setIsLoadingTravelers(true);
        setTravelersError(null);

        try {
            const response = await travelersApi.list();
            setTravelers(sortTravelers(response.travelers));
        } catch (requestError) {
            setTravelersError(getRequestErrorMessage(requestError, 'Unable to load travelers.'));
        } finally {
            setHasLoadedTravelers(true);
            setIsLoadingTravelers(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            setTravelers([]);
            setTravelersError(null);
            setHasLoadedTravelers(false);
            setIsLoadingTravelers(false);
            return;
        }

        if (!hasLoadedTravelers && !isLoadingTravelers) void refreshTravelers();
    }, [hasLoadedTravelers, isLoadingTravelers, refreshTravelers, user]);

    const value: TravelersContextValue = {
        travelers,
        isLoadingTravelers,
        travelersError,
        refreshTravelers,
        addTraveler: async (request) => {
            const response = await travelersApi.create(request);
            setTravelers((currentTravelers) => sortTravelers([...currentTravelers, response.traveler]));
            return response.traveler;
        },
        updateTraveler: async (travelerId, request) => {
            const response = await travelersApi.update(travelerId, request);
            setTravelers((currentTravelers) =>
                sortTravelers(
                    currentTravelers.map((traveler) =>
                        traveler.travelerId === travelerId ? response.traveler : traveler
                    )
                )
            );
            return response.traveler;
        },
        deleteTraveler: async (travelerId) => {
            await travelersApi.delete(travelerId);
            setTravelers((currentTravelers) =>
                currentTravelers.filter((traveler) => traveler.travelerId !== travelerId)
            );
        },
    };

    return <TravelersContext value={value}>{children}</TravelersContext>;
}

export function useTravelers() {
    const context = use(TravelersContext);

    if (!context) throw new Error('useTravelers must be used within TravelersProvider');

    return context;
}

function sortTravelers(travelers: Traveler[]) {
    return [...travelers].sort((first, second) => first.createdAt.localeCompare(second.createdAt));
}

function getRequestErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}
