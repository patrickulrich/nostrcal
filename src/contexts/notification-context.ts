import { createContext } from 'react';
import type { useNotificationStatus } from '@/hooks/useNotificationStatus';

export type NotificationContextType = ReturnType<typeof useNotificationStatus>;

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);