import { type FormEvent, useEffect, useState } from 'react';

import { useAuth } from '../auth/auth-context';
import { AppModal } from './app-modal';

type ProfileModalProps = {
    onClose: () => void;
};

const getProfileNameParts = (name?: string, givenName?: string, familyName?: string) => {
    const nameParts = name?.trim().split(/\s+/) ?? [];

    return {
        firstName: givenName?.trim() || nameParts[0] || '',
        lastName: familyName?.trim() || nameParts.slice(1).join(' '),
    };
};

export function ProfileModal({ onClose }: ProfileModalProps) {
    const { refreshUser, updateProfile, user } = useAuth();
    const profileNameParts = getProfileNameParts(user?.name, user?.givenName, user?.familyName);
    const [firstName, setFirstName] = useState(profileNameParts.firstName);
    const [lastName, setLastName] = useState(profileNameParts.lastName);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        void refreshUser();
    }, [refreshUser]);

    useEffect(() => {
        const nextNameParts = getProfileNameParts(user?.name, user?.givenName, user?.familyName);

        setFirstName(nextNameParts.firstName);
        setLastName(nextNameParts.lastName);
    }, [user]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');

        if (!firstName.trim() || !lastName.trim()) {
            setError('First and last name are required.');
            return;
        }

        setIsSaving(true);

        try {
            await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
            onClose();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AppModal
            title="Profile"
            description="Update the profile details Cruise Deck will use across the app."
            showCloseButton={false}
            onClose={onClose}
        >
            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-zinc-700">
                        First Name
                        <input
                            className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                            autoComplete="given-name"
                            name="firstName"
                            type="text"
                            value={firstName}
                            required
                            onChange={(event) => setFirstName(event.target.value)}
                        />
                    </label>

                    <label className="block text-sm font-semibold text-zinc-700">
                        Last Name
                        <input
                            className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                            autoComplete="family-name"
                            name="lastName"
                            type="text"
                            value={lastName}
                            required
                            onChange={(event) => setLastName(event.target.value)}
                        />
                    </label>
                </div>

                {error ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                        {error}
                    </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:justify-between">
                    <button
                        className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25"
                        type="button"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="inline-flex h-10 items-center justify-center rounded-md bg-[#0B65CA] px-4 text-sm font-semibold text-white transition hover:bg-[#45AEFC] hover:text-zinc-950 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25 disabled:cursor-not-allowed disabled:opacity-70"
                        type="submit"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </AppModal>
    );
}
