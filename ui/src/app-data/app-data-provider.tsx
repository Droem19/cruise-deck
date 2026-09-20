import type { ReactNode } from 'react';

import { TravelersProvider } from './travelers-context';

export function AppDataProvider({ children }: { children: ReactNode }) {
    return <TravelersProvider>{children}</TravelersProvider>;
}
