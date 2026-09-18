import { type FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router';

import { type Traveler, travelersApi } from '../api/travelers';
import { useAuth } from '../auth/auth-context';
import { AppLayout } from '../components/app-layout';

export function TravelersPage() {
    const { user } = useAuth();
    const [travelers, setTravelers] = useState<Traveler[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingTravelerId, setEditingTravelerId] = useState<string | null>(null);
    const [updatingTravelerId, setUpdatingTravelerId] = useState<string | null>(null);
    const [deletingTravelerId, setDeletingTravelerId] = useState<string | null>(null);
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadTravelers = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await travelersApi.list();
                if (!cancelled) setTravelers(sortTravelers(response.travelers));
            } catch (requestError) {
                if (!cancelled) setError(getRequestErrorMessage(requestError, 'Unable to load travelers.'));
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void loadTravelers();

        return () => {
            cancelled = true;
        };
    }, []);

    if (!user) return <Navigate to="/" replace />;

    const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        const firstName = newFirstName.trim();
        const lastName = newLastName.trim();

        if (!firstName || !lastName) {
            setError('First name and last name are required.');
            return;
        }

        setIsCreating(true);

        try {
            const response = await travelersApi.create({ firstName, lastName });
            setTravelers((currentTravelers) => sortTravelers([...currentTravelers, response.traveler]));
            setNewFirstName('');
            setNewLastName('');
        } catch (requestError) {
            setError(getRequestErrorMessage(requestError, 'Unable to add traveler.'));
        } finally {
            setIsCreating(false);
        }
    };

    const startEditing = (traveler: Traveler) => {
        setEditingTravelerId(traveler.travelerId);
        setEditFirstName(traveler.firstName);
        setEditLastName(traveler.lastName);
        setError(null);
    };

    const cancelEditing = () => {
        setEditingTravelerId(null);
        setEditFirstName('');
        setEditLastName('');
    };

    const handleUpdate = async (travelerId: string) => {
        setError(null);

        const firstName = editFirstName.trim();
        const lastName = editLastName.trim();

        if (!firstName || !lastName) {
            setError('First name and last name are required.');
            return;
        }

        setUpdatingTravelerId(travelerId);

        try {
            const response = await travelersApi.update(travelerId, {
                firstName,
                lastName,
            });
            setTravelers((currentTravelers) =>
                sortTravelers(
                    currentTravelers.map((traveler) =>
                        traveler.travelerId === travelerId ? response.traveler : traveler
                    )
                )
            );
            cancelEditing();
        } catch (requestError) {
            setError(getRequestErrorMessage(requestError, 'Unable to update traveler.'));
        } finally {
            setUpdatingTravelerId(null);
        }
    };

    const handleDelete = async (travelerId: string) => {
        if (travelers.length <= 1) {
            setError('At least one traveler is required.');
            return;
        }

        if (!window.confirm('Delete this traveler?')) return;

        setError(null);
        setDeletingTravelerId(travelerId);

        try {
            await travelersApi.delete(travelerId);
            setTravelers((currentTravelers) =>
                currentTravelers.filter((traveler) => traveler.travelerId !== travelerId)
            );
            if (editingTravelerId === travelerId) cancelEditing();
        } catch (requestError) {
            setError(getRequestErrorMessage(requestError, 'Unable to delete traveler.'));
        } finally {
            setDeletingTravelerId(null);
        }
    };

    return (
        <AppLayout>
            <section className="flex w-full flex-col gap-5">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-base font-medium text-zinc-500">Cruise Deck</p>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Travelers</h1>
                    </div>
                </header>

                {error ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                        {error}
                    </div>
                ) : null}

                <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Add Traveler</h2>
                    <form className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={handleCreate}>
                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-700">First Name</span>
                            <input
                                className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                                value={newFirstName}
                                onChange={(event) => setNewFirstName(event.target.value)}
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-semibold text-zinc-700">Last Name</span>
                            <input
                                className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                                value={newLastName}
                                onChange={(event) => setNewLastName(event.target.value)}
                            />
                        </label>
                        <button
                            className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[#0B65CA] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#45AEFC] hover:text-zinc-950 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25 disabled:cursor-not-allowed disabled:opacity-70 sm:mt-auto"
                            disabled={isCreating}
                            type="submit"
                        >
                            {isCreating ? 'Adding...' : 'Add Traveler'}
                        </button>
                    </form>
                </section>

                <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                    <div className="border-b border-zinc-200 px-5 py-4">
                        <h2 className="text-lg font-semibold tracking-tight text-zinc-950">Travelers</h2>
                    </div>

                    {isLoading ? <p className="p-5 text-sm text-zinc-500">Loading travelers...</p> : null}
                    {!isLoading && travelers.length === 0 ? (
                        <p className="p-5 text-sm text-zinc-500">No travelers have been added yet.</p>
                    ) : null}

                    {travelers.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Traveler</th>
                                        <th className="px-5 py-3 font-semibold">First Name</th>
                                        <th className="px-5 py-3 font-semibold">Last Name</th>
                                        <th className="px-5 py-3 font-semibold">Created</th>
                                        <th className="px-5 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200">
                                    {travelers.map((traveler) => {
                                        const isEditing = editingTravelerId === traveler.travelerId;
                                        const isUpdating = updatingTravelerId === traveler.travelerId;
                                        const isDeleting = deletingTravelerId === traveler.travelerId;
                                        const canDeleteTraveler = travelers.length > 1;

                                        return (
                                            <tr className="transition hover:bg-blue-50/50" key={traveler.travelerId}>
                                                <td className="max-w-xs px-5 py-4">
                                                    <p className="truncate font-medium text-zinc-950">
                                                        {formatTravelerName(traveler)}
                                                    </p>
                                                    <p className="mt-1 text-xs text-zinc-500">{traveler.travelerId}</p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {isEditing ? (
                                                        <input
                                                            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                                                            value={editFirstName}
                                                            onChange={(event) => setEditFirstName(event.target.value)}
                                                        />
                                                    ) : (
                                                        <span className="text-zinc-700">{traveler.firstName}</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {isEditing ? (
                                                        <input
                                                            className="h-10 w-full rounded-md border border-zinc-300 px-3 text-sm text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                                                            value={editLastName}
                                                            onChange={(event) => setEditLastName(event.target.value)}
                                                        />
                                                    ) : (
                                                        <span className="text-zinc-700">{traveler.lastName}</span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-4 text-zinc-700">
                                                    {formatDate(traveler.createdAt)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <button
                                                                    className="inline-flex h-9 items-center justify-center rounded-md bg-[#0B65CA] px-3 text-sm font-semibold text-white transition hover:bg-[#45AEFC] hover:text-zinc-950 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25 disabled:cursor-not-allowed disabled:opacity-60"
                                                                    disabled={isUpdating}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        void handleUpdate(traveler.travelerId)
                                                                    }
                                                                >
                                                                    {isUpdating ? 'Saving...' : 'Save'}
                                                                </button>
                                                                <button
                                                                    className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25"
                                                                    type="button"
                                                                    onClick={cancelEditing}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25"
                                                                type="button"
                                                                onClick={() => startEditing(traveler)}
                                                            >
                                                                Edit
                                                            </button>
                                                        )}
                                                        {canDeleteTraveler ? (
                                                            <button
                                                                className="inline-flex h-9 items-center justify-center rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60"
                                                                disabled={isDeleting}
                                                                type="button"
                                                                onClick={() => void handleDelete(traveler.travelerId)}
                                                            >
                                                                {isDeleting ? 'Deleting...' : 'Delete'}
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                </section>
            </section>
        </AppLayout>
    );
}

function formatTravelerName(traveler: Traveler) {
    return [traveler.firstName, traveler.lastName].filter(Boolean).join(' ');
}

function sortTravelers(travelers: Traveler[]) {
    return [...travelers].sort((first, second) => first.createdAt.localeCompare(second.createdAt));
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
}

function getRequestErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}
