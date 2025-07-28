import { useContext } from 'react';
import { NotificationContext, type NotificationContextType } from '@/contexts/notification-context';

export function useNotificationContext(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}