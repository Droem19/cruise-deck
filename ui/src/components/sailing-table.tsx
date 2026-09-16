const sailingRecords = [
    {
        id: 'CD-001',
        sailDate: 'Oct 4, 2026',
        ship: 'Norwegian Viva',
        departurePort: 'Miami, FL',
        nights: 7,
        itinerary: 'Eastern Caribbean',
        roomType: 'Balcony',
        offerType: 'Free At Sea',
        onboardCredit: '$100',
    },
    {
        id: 'CD-002',
        sailDate: 'Oct 11, 2026',
        ship: 'Celebrity Ascent',
        departurePort: 'Ft. Lauderdale, FL',
        nights: 6,
        itinerary: 'Western Caribbean',
        roomType: 'Suite',
        offerType: 'Bonus Savings',
        onboardCredit: '$250',
    },
    {
        id: 'CD-003',
        sailDate: 'Oct 18, 2026',
        ship: 'MSC Seascape',
        departurePort: 'Port Canaveral, FL',
        nights: 4,
        itinerary: 'Bahamas',
        roomType: 'Oceanview',
        offerType: 'Reduced Rate',
        onboardCredit: '$50',
    },
    {
        id: 'CD-004',
        sailDate: 'Oct 25, 2026',
        ship: 'Royal Caribbean Icon',
        departurePort: 'Miami, FL',
        nights: 7,
        itinerary: 'Perfect Day & Mexico',
        roomType: 'Interior',
        offerType: 'BOGO',
        onboardCredit: '$0',
    },
    {
        id: 'CD-005',
        sailDate: 'Nov 1, 2026',
        ship: 'Disney Wish',
        departurePort: 'Port Canaveral, FL',
        nights: 3,
        itinerary: 'Bahamas',
        roomType: 'Verandah',
        offerType: 'Special Offer',
        onboardCredit: '$150',
    },
];

export function SailingTable() {
    return (
        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-4">
                <div className="grid gap-3 md:grid-cols-4">
                    <label className="block text-xs font-semibold uppercase text-zinc-500">
                        Search
                        <input
                            className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                            placeholder="Ship, port, itinerary..."
                            type="search"
                        />
                    </label>
                    <label className="block text-xs font-semibold uppercase text-zinc-500">
                        Sail Date Range
                        <input
                            className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                            defaultValue="Oct 2026 - Nov 2026"
                            type="text"
                        />
                    </label>
                    <label className="block text-xs font-semibold uppercase text-zinc-500">
                        Ship
                        <select className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25">
                            <option>All Ships</option>
                        </select>
                    </label>
                    <label className="block text-xs font-semibold uppercase text-zinc-500">
                        Departure Port
                        <select className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25">
                            <option>All Ports</option>
                        </select>
                    </label>
                </div>
                <div className="mt-3 flex justify-end">
                    <button
                        className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                        type="button"
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full border-collapse text-left text-sm">
                    <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Sail Date</th>
                            <th className="px-4 py-3 font-semibold">Ship</th>
                            <th className="px-4 py-3 font-semibold">Departure Port</th>
                            <th className="px-4 py-3 font-semibold">Nights</th>
                            <th className="px-4 py-3 font-semibold">Itinerary</th>
                            <th className="px-4 py-3 font-semibold">Room Type</th>
                            <th className="px-4 py-3 font-semibold">Offer Type</th>
                            <th className="px-4 py-3 font-semibold">OBC</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {sailingRecords.map((record) => (
                            <tr className="transition hover:bg-blue-50/50" key={record.id}>
                                <td className="whitespace-nowrap px-4 py-4 font-medium text-zinc-950">
                                    {record.sailDate}
                                </td>
                                <td className="px-4 py-4 text-zinc-700">{record.ship}</td>
                                <td className="px-4 py-4 text-zinc-700">{record.departurePort}</td>
                                <td className="px-4 py-4 text-zinc-700">{record.nights}</td>
                                <td className="px-4 py-4 text-zinc-700">{record.itinerary}</td>
                                <td className="px-4 py-4 text-zinc-700">{record.roomType}</td>
                                <td className="px-4 py-4 text-zinc-700">{record.offerType}</td>
                                <td className="px-4 py-4 font-semibold text-emerald-700">{record.onboardCredit}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                <p>Showing 1-5 of 5 sailings</p>
                <div className="flex items-center gap-2">
                    <button
                        className="h-8 rounded-md border border-zinc-300 px-3 font-semibold text-zinc-500"
                        type="button"
                    >
                        Previous
                    </button>
                    <button className="h-8 rounded-md bg-[#0B65CA] px-3 font-semibold text-white" type="button">
                        1
                    </button>
                    <button
                        className="h-8 rounded-md border border-zinc-300 px-3 font-semibold text-zinc-500"
                        type="button"
                    >
                        Next
                    </button>
                </div>
            </div>
        </section>
    );
}
