import React, { ReactNode } from 'react';
import { useNotificationStatus } from '@/hooks/useNotificationStatus';
import { NotificationContext } from '@/contexts/notification-context';

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const notificationState = useNotificationStatus();
  
  return (
    <NotificationContext.Provider value={notificationState}>
      {children}
    </NotificationContext.Provider>
  );
}