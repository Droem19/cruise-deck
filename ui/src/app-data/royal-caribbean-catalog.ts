export type ShipClassName = 'Icon' | 'Oasis' | 'Quantum' | 'Freedom' | 'Voyager' | 'Radiance' | 'Vision';

export type ShipCatalogEntry = {
    className: ShipClassName;
    ship: string;
    grossTonnage: number;
    guestsDoubleOccupancy: number;
    year: number;
};

type DeparturePortRegionName =
    | 'United States'
    | 'Canada'
    | 'Caribbean'
    | 'Europe'
    | 'Asia / Middle East'
    | 'Australia / New Zealand'
    | 'Central / South America';

type DeparturePortCatalogRegion = {
    regionName: DeparturePortRegionName;
    ports: Array<{
        port: string;
        countryOrState: string;
    }>;
};

const royalCaribbeanShipCatalog = [
    { className: 'Icon', ship: 'Legend of the Seas', grossTonnage: 250800, guestsDoubleOccupancy: 5628, year: 2026 },
    { className: 'Icon', ship: 'Star of the Seas', grossTonnage: 248663, guestsDoubleOccupancy: 5610, year: 2025 },
    { className: 'Icon', ship: 'Icon of the Seas', grossTonnage: 248663, guestsDoubleOccupancy: 5610, year: 2024 },
    { className: 'Oasis', ship: 'Utopia of the Seas', grossTonnage: 236473, guestsDoubleOccupancy: 5668, year: 2024 },
    { className: 'Oasis', ship: 'Wonder of the Seas', grossTonnage: 235600, guestsDoubleOccupancy: 5734, year: 2022 },
    { className: 'Oasis', ship: 'Symphony of the Seas', grossTonnage: 228081, guestsDoubleOccupancy: 5518, year: 2018 },
    { className: 'Oasis', ship: 'Harmony of the Seas', grossTonnage: 226963, guestsDoubleOccupancy: 5479, year: 2016 },
    { className: 'Oasis', ship: 'Oasis of the Seas', grossTonnage: 226838, guestsDoubleOccupancy: 5602, year: 2009 },
    { className: 'Oasis', ship: 'Allure of the Seas', grossTonnage: 225282, guestsDoubleOccupancy: 5718, year: 2010 },
    {
        className: 'Quantum',
        ship: 'Spectrum of the Seas',
        grossTonnage: 169379,
        guestsDoubleOccupancy: 4246,
        year: 2019,
    },
    {
        className: 'Quantum',
        ship: 'Quantum of the Seas',
        grossTonnage: 168666,
        guestsDoubleOccupancy: 4180,
        year: 2014,
    },
    { className: 'Quantum', ship: 'Anthem of the Seas', grossTonnage: 168666, guestsDoubleOccupancy: 4180, year: 2015 },
    {
        className: 'Quantum',
        ship: 'Ovation of the Seas',
        grossTonnage: 168666,
        guestsDoubleOccupancy: 4182,
        year: 2016,
    },
    {
        className: 'Quantum',
        ship: 'Odyssey of the Seas',
        grossTonnage: 167704,
        guestsDoubleOccupancy: 4198,
        year: 2021,
    },
    {
        className: 'Freedom',
        ship: 'Freedom of the Seas',
        grossTonnage: 156271,
        guestsDoubleOccupancy: 3926,
        year: 2006,
    },
    {
        className: 'Freedom',
        ship: 'Independence of the Seas',
        grossTonnage: 154407,
        guestsDoubleOccupancy: 3858,
        year: 2008,
    },
    {
        className: 'Freedom',
        ship: 'Liberty of the Seas',
        grossTonnage: 154407,
        guestsDoubleOccupancy: 3798,
        year: 2007,
    },
    {
        className: 'Voyager',
        ship: 'Navigator of the Seas',
        grossTonnage: 139999,
        guestsDoubleOccupancy: 3368,
        year: 2002,
    },
    {
        className: 'Voyager',
        ship: 'Mariner of the Seas',
        grossTonnage: 139863,
        guestsDoubleOccupancy: 3344,
        year: 2003,
    },
    {
        className: 'Voyager',
        ship: 'Explorer of the Seas',
        grossTonnage: 137308,
        guestsDoubleOccupancy: 3286,
        year: 2000,
    },
    {
        className: 'Voyager',
        ship: 'Adventure of the Seas',
        grossTonnage: 137276,
        guestsDoubleOccupancy: 3114,
        year: 2001,
    },
    {
        className: 'Voyager',
        ship: 'Voyager of the Seas',
        grossTonnage: 137276,
        guestsDoubleOccupancy: 3602,
        year: 1999,
    },
    {
        className: 'Radiance',
        ship: 'Radiance of the Seas',
        grossTonnage: 90090,
        guestsDoubleOccupancy: 2143,
        year: 2001,
    },
    {
        className: 'Radiance',
        ship: 'Brilliance of the Seas',
        grossTonnage: 90090,
        guestsDoubleOccupancy: 2142,
        year: 2002,
    },
    {
        className: 'Radiance',
        ship: 'Serenade of the Seas',
        grossTonnage: 90090,
        guestsDoubleOccupancy: 2143,
        year: 2003,
    },
    { className: 'Radiance', ship: 'Jewel of the Seas', grossTonnage: 90090, guestsDoubleOccupancy: 2191, year: 2004 },
    {
        className: 'Vision',
        ship: 'Enchantment of the Seas',
        grossTonnage: 82910,
        guestsDoubleOccupancy: 2252,
        year: 1997,
    },
    { className: 'Vision', ship: 'Rhapsody of the Seas', grossTonnage: 78878, guestsDoubleOccupancy: 2040, year: 1997 },
    { className: 'Vision', ship: 'Vision of the Seas', grossTonnage: 78340, guestsDoubleOccupancy: 2050, year: 1998 },
    { className: 'Vision', ship: 'Grandeur of the Seas', grossTonnage: 73817, guestsDoubleOccupancy: 1992, year: 1996 },
] satisfies ShipCatalogEntry[];

// Dropdown order follows Royal Caribbean class size, largest to smallest.
const shipClasses = ['Icon', 'Oasis', 'Quantum', 'Freedom', 'Voyager', 'Radiance', 'Vision'] satisfies ShipClassName[];

export const shipsByClass = shipClasses.map((className) => ({
    className,
    ships: royalCaribbeanShipCatalog.filter((ship) => ship.className === className),
}));

export const departurePortRegions = [
    {
        regionName: 'United States',
        ports: [
            { port: 'Baltimore', countryOrState: 'Maryland' },
            { port: 'Boston', countryOrState: 'Massachusetts' },
            { port: 'Cape Liberty (New York)', countryOrState: 'New Jersey' },
            { port: 'Fort Lauderdale', countryOrState: 'Florida' },
            { port: 'Galveston', countryOrState: 'Texas' },
            { port: 'Los Angeles', countryOrState: 'California' },
            { port: 'Miami', countryOrState: 'Florida' },
            { port: 'New Orleans', countryOrState: 'Louisiana' },
            { port: 'Norfolk', countryOrState: 'Virginia' },
            { port: 'Oahu (Honolulu)', countryOrState: 'Hawaii' },
            { port: 'Orlando (Port Canaveral)', countryOrState: 'Florida' },
            { port: 'San Diego', countryOrState: 'California' },
            { port: 'Seattle', countryOrState: 'Washington' },
            { port: 'Seward', countryOrState: 'Alaska' },
            { port: 'Tampa', countryOrState: 'Florida' },
        ],
    },
    {
        regionName: 'Canada',
        ports: [
            { port: 'Montreal', countryOrState: 'Quebec' },
            { port: 'Quebec City', countryOrState: 'Quebec' },
            { port: 'Vancouver', countryOrState: 'British Columbia' },
        ],
    },
    {
        regionName: 'Caribbean',
        ports: [
            { port: 'Bridgetown', countryOrState: 'Barbados' },
            { port: 'San Juan', countryOrState: 'Puerto Rico' },
        ],
    },
    {
        regionName: 'Europe',
        ports: [
            { port: 'Amsterdam', countryOrState: 'Netherlands' },
            { port: 'Athens (Piraeus)', countryOrState: 'Greece' },
            { port: 'Barcelona', countryOrState: 'Spain' },
            { port: 'Barcelona (Tarragona)', countryOrState: 'Spain' },
            { port: 'Copenhagen', countryOrState: 'Denmark' },
            { port: 'Istanbul', countryOrState: 'Turkey' },
            { port: 'Limassol', countryOrState: 'Cyprus' },
            { port: 'Lisbon', countryOrState: 'Portugal' },
            { port: 'Malaga', countryOrState: 'Spain' },
            { port: 'Portsmouth', countryOrState: 'England' },
            { port: 'Ravenna (Venice)', countryOrState: 'Italy' },
            { port: 'Rome (Civitavecchia)', countryOrState: 'Italy' },
            { port: 'Southampton', countryOrState: 'England' },
            { port: 'Stockholm', countryOrState: 'Sweden' },
        ],
    },
    {
        regionName: 'Asia / Middle East',
        ports: [
            { port: 'Beijing (Tianjin)', countryOrState: 'China' },
            { port: 'Dubai', countryOrState: 'United Arab Emirates' },
            { port: 'Haifa', countryOrState: 'Israel' },
            { port: 'Hong Kong', countryOrState: 'China' },
            { port: 'Shanghai (Baoshan)', countryOrState: 'China' },
            { port: 'Shenzhen', countryOrState: 'China' },
            { port: 'Singapore', countryOrState: 'Singapore' },
            { port: 'Taipei (Keelung)', countryOrState: 'Taiwan' },
            { port: 'Tokyo', countryOrState: 'Japan' },
            { port: 'Tokyo (Yokohama)', countryOrState: 'Japan' },
        ],
    },
    {
        regionName: 'Australia / New Zealand',
        ports: [
            { port: 'Auckland', countryOrState: 'New Zealand' },
            { port: 'Brisbane', countryOrState: 'Australia' },
            { port: 'Melbourne', countryOrState: 'Australia' },
            { port: 'Perth (Fremantle)', countryOrState: 'Australia' },
            { port: 'Sydney', countryOrState: 'Australia' },
            { port: 'Sydney (White Bay)', countryOrState: 'Australia' },
        ],
    },
    {
        regionName: 'Central / South America',
        ports: [
            { port: 'Buenos Aires', countryOrState: 'Argentina' },
            { port: 'Cartagena', countryOrState: 'Colombia' },
            { port: 'Colon', countryOrState: 'Panama' },
            { port: 'Panama City (Fuerte Amador)', countryOrState: 'Panama' },
            { port: 'Valparaiso', countryOrState: 'Chile' },
        ],
    },
] satisfies DeparturePortCatalogRegion[];

export function getDeparturePortValue(departurePort: DeparturePortCatalogRegion['ports'][number]) {
    return `${departurePort.port}, ${departurePort.countryOrState}`;
}
