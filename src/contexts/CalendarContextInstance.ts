import { createContext } from 'react';
import { CalendarContextValue } from './CalendarContextValue';

export const CalendarContext = createContext<CalendarContextValue | undefined>(undefined);