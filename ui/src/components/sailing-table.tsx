import type { Sailing, SailingListFilters } from '../api/sailings';
import type { Traveler } from '../api/travelers';
import {
    departurePortRegions,
    getDeparturePortValue,
    type ShipCatalogEntry,
    shipsByClass,
} from '../app-data/royal-caribbean-catalog';

type SailingTableProps = {
    filters: SailingListFilters;
    isLoading: boolean;
    sailings: Sailing[];
    travelers: Traveler[];
    onFiltersChange: (filters: SailingListFilters) => void;
};

type GuestCount = 1 | 2;

const offerGuestCounts = [1, 2] satisfies GuestCount[];
const roomTypeOptions = ['Interior', 'Interior - GTY', 'Ocean View', 'Ocean View - GTY', 'Balcony', 'Balcony - GTY'];

export function SailingTable({ filters, isLoading, sailings, travelers, onFiltersChange }: SailingTableProps) {
    const selectedShips = filters.ships ?? [];
    const selectedDeparturePorts = filters.departurePorts ?? [];
    const selectedGuestCounts = (filters.guestCounts ?? []) as GuestCount[];
    const selectedTravelerIds = filters.travelerIds ?? [];
    const selectedRoomTypes = filters.roomTypes ?? [];
    const departureStartDate = filters.departureStartDate ?? '';
    const departureEndDate = filters.departureEndDate ?? '';
    const minimumNights = filters.minimumNights ?? '';
    const maximumNights = filters.maximumNights ?? '';
    const travelerById = new Map(travelers.map((traveler) => [traveler.travelerId, traveler]));
    const minimumNightCount = parseOptionalNightCount(minimumNights);
    const maximumNightCount = parseOptionalNightCount(maximumNights);

    const updateFilters = (nextFilters: SailingListFilters) => {
        onFiltersChange({ ...filters, ...nextFilters });
    };

    const handleDepartureStartDateChange = (nextDepartureStartDate: string) => {
        const nextFilters: SailingListFilters = { departureStartDate: nextDepartureStartDate };

        if (nextDepartureStartDate && departureEndDate && nextDepartureStartDate > departureEndDate) {
            nextFilters.departureEndDate = nextDepartureStartDate;
        }

        updateFilters(nextFilters);
    };

    const handleDepartureEndDateChange = (nextDepartureEndDate: string) => {
        const nextFilters: SailingListFilters = { departureEndDate: nextDepartureEndDate };

        if (nextDepartureEndDate && departureStartDate && nextDepartureEndDate < departureStartDate) {
            nextFilters.departureStartDate = nextDepartureEndDate;
        }

        updateFilters(nextFilters);
    };

    const handleMinimumNightsChange = (nextMinimumNights: string) => {
        const nextMinimumNightCount = parseOptionalNightCount(nextMinimumNights);

        const nextFilters: SailingListFilters = { minimumNights: nextMinimumNights };

        if (nextMinimumNightCount !== null && maximumNightCount !== null && nextMinimumNightCount > maximumNightCount) {
            nextFilters.maximumNights = nextMinimumNights;
        }

        updateFilters(nextFilters);
    };

    const handleMaximumNightsChange = (nextMaximumNights: string) => {
        const nextMaximumNightCount = parseOptionalNightCount(nextMaximumNights);

        const nextFilters: SailingListFilters = { maximumNights: nextMaximumNights };

        if (nextMaximumNightCount !== null && minimumNightCount !== null && nextMaximumNightCount < minimumNightCount) {
            nextFilters.minimumNights = nextMaximumNights;
        }

        updateFilters(nextFilters);
    };

    return (
        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                    <DepartureDateFilter
                        endDate={departureEndDate}
                        startDate={departureStartDate}
                        onEndDateChange={handleDepartureEndDateChange}
                        onStartDateChange={handleDepartureStartDateChange}
                    />
                    <ShipFilterDropdown
                        selectedShips={selectedShips}
                        onSelectedShipsChange={(ships) => updateFilters({ ships })}
                    />
                    <DeparturePortFilterDropdown
                        selectedDeparturePorts={selectedDeparturePorts}
                        onSelectedDeparturePortsChange={(departurePorts) => updateFilters({ departurePorts })}
                    />
                    <NightCountFilter
                        maximumNights={maximumNights}
                        minimumNights={minimumNights}
                        onMaximumNightsChange={handleMaximumNightsChange}
                        onMinimumNightsChange={handleMinimumNightsChange}
                    />
                    <RoomTypeFilterDropdown
                        roomTypes={roomTypeOptions}
                        selectedRoomTypes={selectedRoomTypes}
                        onSelectedRoomTypesChange={(roomTypes) => updateFilters({ roomTypes })}
                    />
                    <OfferGuestFilter
                        selectedGuestCounts={selectedGuestCounts}
                        onSelectedGuestCountsChange={(guestCounts) => updateFilters({ guestCounts })}
                    />
                    <TravelerFilterDropdown
                        selectedTravelerIds={selectedTravelerIds}
                        travelers={travelers}
                        onSelectedTravelerIdsChange={(travelerIds) => updateFilters({ travelerIds })}
                    />
                </div>
                <div className="mt-3 flex justify-end">
                    <button
                        className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                        type="button"
                        onClick={() => onFiltersChange({})}
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
                            <th className="px-4 py-3 font-semibold">Ship</th>
                            <th className="px-4 py-3 font-semibold">Departure Port</th>
                            <th className="px-4 py-3 font-semibold">Itinerary</th>
                            <th className="px-4 py-3 font-semibold">Room Type</th>
                            <th className="px-4 py-3 font-semibold">Offer Type</th>
                            <th className="px-4 py-3 font-semibold">Traveler</th>
                            <th className="px-4 py-3 font-semibold">Offer Code</th>
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

                        {!isLoading && sailings.length === 0 ? (
                            <tr>
                                <td className="px-4 py-5 text-zinc-500" colSpan={8}>
                                    No sailings found.
                                </td>
                            </tr>
                        ) : null}

                        {!isLoading
                            ? sailings.map((sailing) => (
                                  <tr className="transition hover:bg-blue-50/50" key={sailing.sailingId}>
                                      <td className="whitespace-nowrap px-4 py-4 font-medium text-zinc-950">
                                          {formatDate(sailing.sailDateSort)}
                                      </td>
                                      <td className="px-4 py-4 text-zinc-700">{sailing.ship}</td>
                                      <td className="px-4 py-4 text-zinc-700">{sailing.departurePort}</td>
                                      <td className="px-4 py-4 text-zinc-700">{sailing.itinerary}</td>
                                      <td className="px-4 py-4 text-zinc-700">{sailing.roomType}</td>
                                      <td className="px-4 py-4 text-zinc-700">{sailing.offerType}</td>
                                      <td className="whitespace-nowrap px-4 py-4 text-zinc-700">
                                          {getTravelerName(sailing.travelerId, travelerById)}
                                      </td>
                                      <td className="px-4 py-4 text-zinc-700">{sailing.offerCode}</td>
                                  </tr>
                              ))
                            : null}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-500">
                Showing {sailings.length} sailings
            </div>
        </section>
    );
}

type ShipFilterDropdownProps = {
    selectedShips: string[];
    onSelectedShipsChange: (ships: string[]) => void;
};

function ShipFilterDropdown({ selectedShips, onSelectedShipsChange }: ShipFilterDropdownProps) {
    const selectedShipSet = new Set(selectedShips);

    const toggleShip = (ship: string) => {
        onSelectedShipsChange(
            selectedShipSet.has(ship)
                ? selectedShips.filter((selectedShip) => selectedShip !== ship)
                : [...selectedShips, ship]
        );
    };

    const toggleClass = (ships: ShipCatalogEntry[]) => {
        const classShipNames = ships.map((ship) => ship.ship);
        const allClassShipsSelected = classShipNames.every((ship) => selectedShipSet.has(ship));

        onSelectedShipsChange(
            allClassShipsSelected
                ? selectedShips.filter((ship) => !classShipNames.includes(ship))
                : getUniqueOptions([...selectedShips, ...classShipNames])
        );
    };

    return (
        <div className="relative text-xs font-semibold uppercase text-zinc-500">
            Ship
            <details className="group mt-2">
                <summary className="flex h-10 cursor-pointer list-none items-center justify-between rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition marker:hidden focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25 [&::-webkit-details-marker]:hidden">
                    <span>{formatShipFilterLabel(selectedShips)}</span>
                    <span className="text-zinc-400 transition group-open:rotate-180">v</span>
                </summary>
                <div className="absolute z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-md border border-zinc-200 bg-white p-2 text-sm normal-case text-zinc-950 shadow-lg">
                    <button
                        className="mb-2 h-9 w-full rounded-md px-2 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
                        type="button"
                        disabled={selectedShips.length === 0}
                        onClick={() => onSelectedShipsChange([])}
                    >
                        All Ships
                    </button>
                    {shipsByClass.map(({ className, ships }) => {
                        const selectedClassShipCount = ships.filter((ship) => selectedShipSet.has(ship.ship)).length;
                        const allClassShipsSelected = selectedClassShipCount === ships.length;

                        return (
                            <div className="border-t border-zinc-100 py-2" key={className}>
                                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 font-semibold text-zinc-950 transition hover:bg-blue-50">
                                    <input
                                        className="h-4 w-4 accent-[#0B65CA]"
                                        type="checkbox"
                                        checked={allClassShipsSelected}
                                        aria-checked={
                                            selectedClassShipCount > 0 && !allClassShipsSelected
                                                ? 'mixed'
                                                : allClassShipsSelected
                                        }
                                        onChange={() => toggleClass(ships)}
                                    />
                                    <span>{className} Class</span>
                                    <span className="ml-auto text-xs font-medium text-zinc-500">
                                        {selectedClassShipCount}/{ships.length}
                                    </span>
                                </label>
                                <div className="mt-1 space-y-1 pl-6">
                                    {ships.map((ship) => (
                                        <label
                                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-zinc-700 transition hover:bg-zinc-50"
                                            key={ship.ship}
                                        >
                                            <input
                                                className="h-4 w-4 accent-[#0B65CA]"
                                                type="checkbox"
                                                checked={selectedShipSet.has(ship.ship)}
                                                onChange={() => toggleShip(ship.ship)}
                                            />
                                            <span>{ship.ship}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </details>
        </div>
    );
}

function formatShipFilterLabel(selectedShips: string[]) {
    if (selectedShips.length === 0) return 'All Ships';
    if (selectedShips.length === 1) return selectedShips[0];
    if (selectedShips.length === 2) return selectedShips.join(', ');

    return `${selectedShips.length} ships selected`;
}

type DeparturePortFilterDropdownProps = {
    selectedDeparturePorts: string[];
    onSelectedDeparturePortsChange: (departurePorts: string[]) => void;
};

function DeparturePortFilterDropdown({
    selectedDeparturePorts,
    onSelectedDeparturePortsChange,
}: DeparturePortFilterDropdownProps) {
    const selectedDeparturePortSet = new Set(selectedDeparturePorts);

    const toggleDeparturePort = (departurePort: string) => {
        onSelectedDeparturePortsChange(
            selectedDeparturePortSet.has(departurePort)
                ? selectedDeparturePorts.filter((selectedDeparturePort) => selectedDeparturePort !== departurePort)
                : [...selectedDeparturePorts, departurePort]
        );
    };

    const toggleRegion = (departurePorts: string[]) => {
        const allRegionPortsSelected = departurePorts.every((departurePort) =>
            selectedDeparturePortSet.has(departurePort)
        );

        onSelectedDeparturePortsChange(
            allRegionPortsSelected
                ? selectedDeparturePorts.filter((departurePort) => !departurePorts.includes(departurePort))
                : getUniqueOptions([...selectedDeparturePorts, ...departurePorts])
        );
    };

    return (
        <div className="relative text-xs font-semibold uppercase text-zinc-500">
            Departure Port
            <details className="group mt-2">
                <summary className="flex h-10 cursor-pointer list-none items-center justify-between rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition marker:hidden focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25 [&::-webkit-details-marker]:hidden">
                    <span>{formatDeparturePortFilterLabel(selectedDeparturePorts)}</span>
                    <span className="text-zinc-400 transition group-open:rotate-180">v</span>
                </summary>
                <div className="absolute z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-md border border-zinc-200 bg-white p-2 text-sm normal-case text-zinc-950 shadow-lg">
                    <button
                        className="mb-2 h-9 w-full rounded-md px-2 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
                        type="button"
                        disabled={selectedDeparturePorts.length === 0}
                        onClick={() => onSelectedDeparturePortsChange([])}
                    >
                        All Ports
                    </button>
                    {departurePortRegions.map(({ regionName, ports }) => {
                        const departurePorts = ports.map((departurePort) => getDeparturePortValue(departurePort));
                        const selectedRegionPortCount = departurePorts.filter((departurePort) =>
                            selectedDeparturePortSet.has(departurePort)
                        ).length;
                        const allRegionPortsSelected = selectedRegionPortCount === departurePorts.length;

                        return (
                            <div className="border-t border-zinc-100 py-2" key={regionName}>
                                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 font-semibold text-zinc-950 transition hover:bg-blue-50">
                                    <input
                                        className="h-4 w-4 accent-[#0B65CA]"
                                        type="checkbox"
                                        checked={allRegionPortsSelected}
                                        aria-checked={
                                            selectedRegionPortCount > 0 && !allRegionPortsSelected
                                                ? 'mixed'
                                                : allRegionPortsSelected
                                        }
                                        onChange={() => toggleRegion(departurePorts)}
                                    />
                                    <span>{regionName}</span>
                                    <span className="ml-auto text-xs font-medium text-zinc-500">
                                        {selectedRegionPortCount}/{departurePorts.length}
                                    </span>
                                </label>
                                <div className="mt-1 space-y-1 pl-6">
                                    {ports.map((departurePort) => {
                                        const departurePortValue = getDeparturePortValue(departurePort);

                                        return (
                                            <label
                                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-zinc-700 transition hover:bg-zinc-50"
                                                key={departurePortValue}
                                            >
                                                <input
                                                    className="h-4 w-4 accent-[#0B65CA]"
                                                    type="checkbox"
                                                    checked={selectedDeparturePortSet.has(departurePortValue)}
                                                    onChange={() => toggleDeparturePort(departurePortValue)}
                                                />
                                                <span>{departurePortValue}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </details>
        </div>
    );
}

function formatDeparturePortFilterLabel(selectedDeparturePorts: string[]) {
    if (selectedDeparturePorts.length === 0) return 'All Ports';
    if (selectedDeparturePorts.length === 1) return selectedDeparturePorts[0];
    if (selectedDeparturePorts.length === 2) return selectedDeparturePorts.join(', ');

    return `${selectedDeparturePorts.length} ports selected`;
}

type OfferGuestFilterProps = {
    selectedGuestCounts: GuestCount[];
    onSelectedGuestCountsChange: (guestCounts: GuestCount[]) => void;
};

function OfferGuestFilter({ selectedGuestCounts, onSelectedGuestCountsChange }: OfferGuestFilterProps) {
    const selectedGuestCountSet = new Set(selectedGuestCounts);

    const toggleGuestCount = (guestCount: GuestCount) => {
        onSelectedGuestCountsChange(
            selectedGuestCountSet.has(guestCount)
                ? selectedGuestCounts.filter((selectedGuestCount) => selectedGuestCount !== guestCount)
                : [...selectedGuestCounts, guestCount].sort((first, second) => first - second)
        );
    };

    return (
        <fieldset className="text-xs font-semibold uppercase text-zinc-500">
            <legend>Offer Type</legend>
            <div className="mt-2 flex h-10 items-center gap-3 rounded-md border border-zinc-300 bg-white px-3">
                {offerGuestCounts.map((guestCount) => (
                    <label
                        className="flex cursor-pointer items-center gap-2 text-sm font-medium normal-case text-zinc-950"
                        key={guestCount}
                    >
                        <input
                            className="h-4 w-4 accent-[#0B65CA]"
                            type="checkbox"
                            checked={selectedGuestCountSet.has(guestCount)}
                            onChange={() => toggleGuestCount(guestCount)}
                        />
                        <span>{guestCount} Guest</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

type TravelerFilterDropdownProps = {
    selectedTravelerIds: string[];
    travelers: Traveler[];
    onSelectedTravelerIdsChange: (travelerIds: string[]) => void;
};

function TravelerFilterDropdown({
    selectedTravelerIds,
    travelers,
    onSelectedTravelerIdsChange,
}: TravelerFilterDropdownProps) {
    const selectedTravelerIdSet = new Set(selectedTravelerIds);
    const travelerById = new Map(travelers.map((traveler) => [traveler.travelerId, traveler]));

    const toggleTraveler = (travelerId: string) => {
        onSelectedTravelerIdsChange(
            selectedTravelerIdSet.has(travelerId)
                ? selectedTravelerIds.filter((selectedTravelerId) => selectedTravelerId !== travelerId)
                : [...selectedTravelerIds, travelerId]
        );
    };

    const toggleAllTravelers = () => {
        onSelectedTravelerIdsChange(
            selectedTravelerIds.length === travelers.length ? [] : travelers.map((traveler) => traveler.travelerId)
        );
    };

    return (
        <div className="relative text-xs font-semibold uppercase text-zinc-500">
            Traveler
            <details className="group mt-2">
                <summary className="flex h-10 cursor-pointer list-none items-center justify-between rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition marker:hidden focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25 [&::-webkit-details-marker]:hidden">
                    <span>{formatTravelerFilterLabel(selectedTravelerIds, travelerById)}</span>
                    <span className="text-zinc-400 transition group-open:rotate-180">v</span>
                </summary>
                <div className="absolute z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-md border border-zinc-200 bg-white p-2 text-sm normal-case text-zinc-950 shadow-lg">
                    <button
                        className="mb-2 h-9 w-full rounded-md px-2 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
                        type="button"
                        disabled={travelers.length === 0}
                        onClick={toggleAllTravelers}
                    >
                        {selectedTravelerIds.length === travelers.length && travelers.length > 0
                            ? 'Clear Travelers'
                            : 'All Travelers'}
                    </button>
                    {travelers.map((traveler) => (
                        <label
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-zinc-700 transition hover:bg-zinc-50"
                            key={traveler.travelerId}
                        >
                            <input
                                className="h-4 w-4 accent-[#0B65CA]"
                                type="checkbox"
                                checked={selectedTravelerIdSet.has(traveler.travelerId)}
                                onChange={() => toggleTraveler(traveler.travelerId)}
                            />
                            <span>{getTravelerName(traveler.travelerId, travelerById)}</span>
                        </label>
                    ))}
                </div>
            </details>
        </div>
    );
}

function formatTravelerFilterLabel(selectedTravelerIds: string[], travelerById: Map<string, Traveler>) {
    if (selectedTravelerIds.length === 0) return 'All Travelers';
    if (selectedTravelerIds.length === 1) return getTravelerName(selectedTravelerIds[0], travelerById);

    return `${selectedTravelerIds.length} travelers selected`;
}

type RoomTypeFilterDropdownProps = {
    roomTypes: string[];
    selectedRoomTypes: string[];
    onSelectedRoomTypesChange: (roomTypes: string[]) => void;
};

function RoomTypeFilterDropdown({
    roomTypes,
    selectedRoomTypes,
    onSelectedRoomTypesChange,
}: RoomTypeFilterDropdownProps) {
    const selectedRoomTypeSet = new Set(selectedRoomTypes);

    const toggleRoomType = (roomType: string) => {
        onSelectedRoomTypesChange(
            selectedRoomTypeSet.has(roomType)
                ? selectedRoomTypes.filter((selectedRoomType) => selectedRoomType !== roomType)
                : getUniqueOptions([...selectedRoomTypes, roomType])
        );
    };

    const toggleAllRoomTypes = () => {
        onSelectedRoomTypesChange(selectedRoomTypes.length === roomTypes.length ? [] : roomTypes);
    };

    return (
        <div className="relative text-xs font-semibold uppercase text-zinc-500">
            Room Type
            <details className="group mt-2">
                <summary className="flex h-10 cursor-pointer list-none items-center justify-between rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition marker:hidden focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25 [&::-webkit-details-marker]:hidden">
                    <span>{formatRoomTypeFilterLabel(selectedRoomTypes)}</span>
                    <span className="text-zinc-400 transition group-open:rotate-180">v</span>
                </summary>
                <div className="absolute z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-md border border-zinc-200 bg-white p-2 text-sm normal-case text-zinc-950 shadow-lg">
                    <button
                        className="mb-2 h-9 w-full rounded-md px-2 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
                        type="button"
                        disabled={roomTypes.length === 0}
                        onClick={toggleAllRoomTypes}
                    >
                        {selectedRoomTypes.length === roomTypes.length && roomTypes.length > 0
                            ? 'Clear Room Types'
                            : 'All Room Types'}
                    </button>
                    {roomTypes.map((roomType) => (
                        <label
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-zinc-700 transition hover:bg-zinc-50"
                            key={roomType}
                        >
                            <input
                                className="h-4 w-4 accent-[#0B65CA]"
                                type="checkbox"
                                checked={selectedRoomTypeSet.has(roomType)}
                                onChange={() => toggleRoomType(roomType)}
                            />
                            <span>{roomType}</span>
                        </label>
                    ))}
                </div>
            </details>
        </div>
    );
}

function formatRoomTypeFilterLabel(selectedRoomTypes: string[]) {
    if (selectedRoomTypes.length === 0) return 'All Room Types';
    if (selectedRoomTypes.length === 1) return selectedRoomTypes[0];

    return `${selectedRoomTypes.length} room types selected`;
}

type DepartureDateFilterProps = {
    endDate: string;
    startDate: string;
    onEndDateChange: (endDate: string) => void;
    onStartDateChange: (startDate: string) => void;
};

function DepartureDateFilter({ endDate, startDate, onEndDateChange, onStartDateChange }: DepartureDateFilterProps) {
    return (
        <fieldset className="text-xs font-semibold uppercase text-zinc-500">
            <legend>Departure Date</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block">
                    <span className="sr-only">Start departure date</span>
                    <input
                        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                        max={endDate || undefined}
                        type="date"
                        value={startDate}
                        onChange={(event) => onStartDateChange(event.target.value)}
                    />
                </label>
                <label className="block">
                    <span className="sr-only">End departure date</span>
                    <input
                        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                        min={startDate || undefined}
                        type="date"
                        value={endDate}
                        onChange={(event) => onEndDateChange(event.target.value)}
                    />
                </label>
            </div>
        </fieldset>
    );
}

type NightCountFilterProps = {
    maximumNights: string;
    minimumNights: string;
    onMaximumNightsChange: (maximumNights: string) => void;
    onMinimumNightsChange: (minimumNights: string) => void;
};

function NightCountFilter({
    maximumNights,
    minimumNights,
    onMaximumNightsChange,
    onMinimumNightsChange,
}: NightCountFilterProps) {
    return (
        <fieldset className="text-xs font-semibold uppercase text-zinc-500">
            <legend>Nights</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block">
                    <span className="sr-only">Minimum nights</span>
                    <input
                        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                        inputMode="numeric"
                        max={maximumNights || undefined}
                        min="1"
                        placeholder="Min"
                        type="number"
                        value={minimumNights}
                        onChange={(event) => onMinimumNightsChange(event.target.value)}
                    />
                </label>
                <label className="block">
                    <span className="sr-only">Maximum nights</span>
                    <input
                        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium normal-case text-zinc-950 outline-none transition focus:border-[#0B65CA] focus:ring-4 focus:ring-[#45AEFC]/25"
                        inputMode="numeric"
                        min={minimumNights || '1'}
                        placeholder="Max"
                        type="number"
                        value={maximumNights}
                        onChange={(event) => onMaximumNightsChange(event.target.value)}
                    />
                </label>
            </div>
        </fieldset>
    );
}

function parseOptionalNightCount(value: string) {
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;

    const nightCount = Number.parseInt(trimmedValue, 10);

    return Number.isFinite(nightCount) && nightCount > 0 ? nightCount : null;
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
