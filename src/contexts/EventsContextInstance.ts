import { createContext } from 'react';
import { EventsContextValue } from './EventsContextTypes';

export const EventsContext = createContext<EventsContextValue | undefined>(undefined);