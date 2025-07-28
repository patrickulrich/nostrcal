import { useState } from 'react';
import { Bell, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { useNotificationContext } from '@/hooks/useNotificationContext';
import { SchedulableEvent } from '@/utils/notifications';
import { CalendarEvent } from '@/contexts/EventsContextTypes';

const REMINDER_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 1440, label: '1 day' },
];

interface QuickNotificationButtonProps {
  event: CalendarEvent | SchedulableEvent;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function QuickNotificationButton({ 
  event, 
  variant = 'outline',
  size = 'sm',
  className 
}: QuickNotificationButtonProps) {
  const {
    preferences,
    permissionStatus,
    isSupported,
    isEventNotificationEnabled,
    getEventCustomReminderTime,
    setEventCustomReminderTime,
    toggleEventNotification,
    scheduleNotification,
    requestPermission,
    isRequestingPermission,
  } = useNotificationContext();

  const [reminderMinutes, setReminderMinutes] = useState(() => 
    getEventCustomReminderTime(event.id)
  );
  const [isOpen, setIsOpen] = useState(false);

  const isEnabled = isEventNotificationEnabled(event.id);
  const canEnable = isSupported && 
    (permissionStatus === 'granted' || permissionStatus === 'default') &&
    preferences.enabled;

  const handleSetReminder = () => {
    if (!canEnable) {
      if (permissionStatus === 'default') {
        requestPermission();
        return;
      }
      return;
    }

    // Set custom reminder time
    setEventCustomReminderTime(event.id, reminderMinutes);
    
    // Enable notification for this event
    toggleEventNotification(event.id, true);
    
    // Schedule the notification
    scheduleNotification(event, reminderMinutes);
    
    setIsOpen(false);
  };

  const handleTimeChange = (minutesStr: string) => {
    setReminderMinutes(parseInt(minutesStr));
  };

  if (isEnabled) {
    // Show enabled state
    return (
      <Button
        variant="default"
        size={size}
        className={`bg-blue-600 hover:bg-blue-700 text-white ${className}`}
        onClick={() => toggleEventNotification(event.id, false)}
        title="Reminder set - click to disable"
      >
        <Bell className="h-4 w-4 mr-1" />
        Reminder Set
      </Button>
    );
  }

  if (!canEnable && permissionStatus === 'denied') {
    return (
      <Button
        variant="outline"
        size={size}
        className={`opacity-50 cursor-not-allowed ${className}`}
        disabled
        title="Notifications blocked in browser"
      >
        <Bell className="h-4 w-4 mr-1" />
        Blocked
      </Button>
    );
  }

  if (!preferences.enabled) {
    return (
      <Button
        variant="outline"
        size={size}
        className={`opacity-50 cursor-not-allowed ${className}`}
        disabled
        title="Enable notifications in settings first"
      >
        <Bell className="h-4 w-4 mr-1" />
        Disabled
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={!canEnable || isRequestingPermission}
        >
          <Bell className="h-4 w-4 mr-1" />
          {permissionStatus === 'default' ? 'Enable Reminders' : 'Set Reminder'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Set Event Reminder</h4>
            <p className="text-sm text-muted-foreground">
              Get notified before this event starts
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Remind me</Label>
            <Select
              value={reminderMinutes.toString()}
              onValueChange={handleTimeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {option.label} before
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSetReminder}
              disabled={isRequestingPermission}
              size="sm"
              className="flex-1"
            >
              {isRequestingPermission ? 'Requesting...' : 'Set Reminder'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}