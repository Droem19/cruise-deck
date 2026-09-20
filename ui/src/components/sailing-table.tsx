import { useState } from 'react';

import type { Sailing } from '../api/sailings';
import type { Traveler } from '../api/travelers';

type SailingTableProps = {
    isLoading: boolean;
    sailings: Sailing[];
    travelers: Traveler[];
};

export function SailingTable({ isLoading, sailings, travelers }: SailingTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedShip, setSelectedShip] = useState('');
    const [selectedDeparturePort, setSelectedDeparturePort] = useState('');
    const travelerById = new Map(travelers.map((traveler) => [traveler.travelerId, traveler]));

    const shipOptions = getUniqueOptions(sailings.map((sailing) => sailing.ship));
    const departurePortOptions = getUniqueOptions(sailings.map((sailing) => sailing.departurePort));
    const filteredSailings = sailings.filter((sailing) => {
        const normalizedSearchTerm = searchTerm.trim().toLowerCase();
        const matchesSearch = normalizedSearchTerm
            ? [
                  sailing.ship,
                  sailing.departurePort,
                  sailing.itinerary,
                  sailing.roomType,
                  sailing.offerType,
                  sailing.offerCode,
                  getTravelerName(sailing.travelerId, travelerById),
              ]
                  .join(' ')
                  .toLowerCase()
                  .includes(normalizedSearchTerm)
            : true;
        const matchesShip = selectedShip ? sailing.ship === selectedShip : true;
        const matchesDeparturePort = selectedDeparturePort ? sailing.departurePort === selectedDeparturePort : true;

        return matchesSearch && matchesShip && matchesDeparturePort;
    });

    return (
        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-4">
                <div className="grid gap-3 md:grid-cols-3">
                    <label className="block text-xs font-semibold uppercase text-zinc-500">
                        Search
                        <input
                            className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                            placeholder="Ship, port, itinerary..."
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </label>
                    <label className="block text-xs font-semibold uppercase text-zinc-500">
                        Ship
                        <select
                            className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                            value={selectedShip}
                            onChange={(event) => setSelectedShip(event.target.value)}
                        >
                            <option value="">All Ships</option>
                            {shipOptions.map((ship) => (
                                <option value={ship} key={ship}>
                                    {ship}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-xs font-semibold uppercase text-zinc-500">
                        Departure Port
                        <select
                            className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                            value={selectedDeparturePort}
                            onChange={(event) => setSelectedDeparturePort(event.target.value)}
                        >
                            <option value="">All Ports</option>
                            {departurePortOptions.map((departurePort) => (
                                <option value={departurePort} key={departurePort}>
                                    {departurePort}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="mt-3 flex justify-end">
                    <button
                        className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedShip('');
                            setSelectedDeparturePort('');
                        }}
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Sail Date</th>
                            <th className="px-4 py-3 font-semibold">Traveler</th>
                            <th className="px-4 py-3 font-semibold">Ship</th>
                            <th className="px-4 py-3 font-semibold">Departure Port</th>
                            <th className="px-4 py-3 font-semibold">Itinerary</th>
                            <th className="px-4 py-3 font-semibold">Room Type</th>
                            <th className="px-4 py-3 font-semibold">Offer Type</th>
                            <th className="px-4 py-3 font-semibold">Offer</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {isLoading ? (
                            <tr>
                                <td className="px-4 py-5 text-zinc-500" colSpan={8}>
                                    Loading sailings...
                                </td>
                            </tr>
                        ) : null}

                        {!isLoading && filteredSailings.length === 0 ? (
                            <tr>
                                <td className="px-4 py-5 text-zinc-500" colSpan={8}>
                                    No sailings found.
                                </td>
                            </tr>
                        ) : null}

                        {!isLoading
                            ? filteredSailings.map((sailing) => (
                                  <tr className="transition hover:bg-blue-50/50" key={sailing.sailingId}>
                                      <td className="whitespace-nowrap px-4 py-4 font-medium text-zinc-950">
                                          {formatDate(sailing.sailDateSort)}
                                      </td>
                                      <td className="whitespace-nowrap px-4 py-4 text-zinc-700">
                                          {getTravelerName(sailing.travelerId, travelerById)}
                                      </td>
                                      <td className="px-4 py-4 text-zinc-700">{sailing.ship}</td>
                                      <td className="px-4 py-4 text-zinc-700">{sailing.departurePort}</td>
                                      <td className="px-4 py-4 text-zinc-700">{sailing.itinerary}</td>
                                      <td className="px-4 py-4 text-zinc-700">{sailing.roomType}</td>
                                      <td className="px-4 py-4 text-zinc-700">{sailing.offerType}</td>
                                      <td className="px-4 py-4 text-zinc-700">{sailing.offerCode}</td>
                                  </tr>
                              ))
                            : null}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500">
                Showing {filteredSailings.length} of {sailings.length} sailings
            </div>
        </section>
    );
}

function getUniqueOptions(values: string[]) {
    return [...new Set(values)].sort((first, second) => first.localeCompare(second));
}

function getTravelerName(travelerId: string, travelerById: Map<string, Traveler>) {
    const traveler = travelerById.get(travelerId);

    return traveler ? [traveler.firstName, traveler.lastName].filter(Boolean).join(' ') : 'Unknown traveler';
}

function formatDate(value: string) {
    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}
