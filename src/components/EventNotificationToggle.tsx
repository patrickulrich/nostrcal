import { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useNotificationContext } from '@/hooks/useNotificationContext';
import { getEventStartTime, getEventTitle, SchedulableEvent } from '@/utils/notifications';
import { CalendarEvent } from '@/contexts/EventsContextTypes';
import { isAfter, format } from 'date-fns';

const REMINDER_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 1440, label: '1 day' },
];

interface EventNotificationToggleProps {
  event: CalendarEvent | SchedulableEvent;
  className?: string;
  variant?: 'inline' | 'popover' | 'full';
}

export function EventNotificationToggle({ 
  event, 
  className,
  variant = 'inline'
}: EventNotificationToggleProps) {
  const {
    preferences,
    permissionStatus,
    isSupported,
    isEventNotificationEnabled,
    isEventNotificationScheduled,
    getScheduledNotification,
    getEventCustomReminderTime,
    setEventCustomReminderTime,
    toggleEventNotification,
    scheduleNotification,
    cancelEventNotification,
    requestPermission,
    isRequestingPermission,
  } = useNotificationContext();

  const [customMinutes, setCustomMinutes] = useState(() => 
    getEventCustomReminderTime(event.id)
  );

  const eventTitle = getEventTitle(event);
  const eventTime = getEventStartTime(event);
  const isEnabled = isEventNotificationEnabled(event.id);
  const isScheduled = isEventNotificationScheduled(event.id);
  const scheduledNotification = getScheduledNotification(event.id);

  const canEnable = isSupported && 
    (permissionStatus === 'granted' || permissionStatus === 'default') &&
    preferences.enabled &&
    eventTime &&
    isAfter(eventTime, new Date());

  const needsPermission = permissionStatus === 'default';
  const isBlocked = permissionStatus === 'denied';
  const notificationsDisabled = !preferences.enabled;

  // Update custom minutes when preferences change
  useEffect(() => {
    const currentCustomTime = getEventCustomReminderTime(event.id);
    setCustomMinutes(currentCustomTime);
  }, [event.id, getEventCustomReminderTime]);

  const handleToggle = async (enabled: boolean) => {
    
    if (!canEnable && enabled) {
      if (needsPermission) {
        requestPermission();
        return;
      }
      return;
    }

    toggleEventNotification(event.id, enabled);
    
    if (enabled) {
      // Schedule notification with custom or default time, bypassing enabled check due to race condition
      scheduleNotification(event, customMinutes, true);
    } else {
      // Cancel existing notification
      cancelEventNotification(event.id);
    }
  };

  const handleTimeChange = (minutesStr: string) => {
    const minutes = parseInt(minutesStr);
    
    // Update local state
    setCustomMinutes(minutes);
    
    // Save the custom reminder time
    setEventCustomReminderTime(event.id, minutes);
    
    if (isEnabled) {
      // Reschedule with new time, bypassing enabled check since we know it's enabled
      cancelEventNotification(event.id);
      scheduleNotification(event, minutes, true);
    }
  };

  // Simple inline variant
  if (variant === 'inline') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-3">
          <Switch
            id={`notification-${event.id}`}
            checked={isEnabled && !needsPermission}
            onCheckedChange={handleToggle}
            disabled={!canEnable || isRequestingPermission}
          />
          <Label 
            htmlFor={`notification-${event.id}`}
            className="text-sm cursor-pointer flex items-center gap-1"
          >
            {isEnabled && isScheduled ? (
              <Bell className="h-4 w-4 text-blue-500" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
            Notify me
          </Label>
          
          {/* Time Selection Inline to the Right */}
          {isEnabled && canEnable && (
            <Select
              value={customMinutes.toString()}
              onValueChange={handleTimeChange}
            >
              <SelectTrigger className="w-32">
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
          )}
          
          {needsPermission && (
            <Badge variant="outline" className="text-xs">
              Permission needed
            </Badge>
          )}
        </div>
        
        {/* Scheduled Info for Inline */}
        {isScheduled && scheduledNotification && (
          <div className="ml-6 text-xs text-blue-600 dark:text-blue-400">
            ⏰ Reminder set for {format(scheduledNotification.notificationTime, 'MMM d, h:mm a')}
          </div>
        )}
      </div>
    );
  }

  // Popover variant
  if (variant === 'popover') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={className}
            disabled={!canEnable && !isEnabled}
          >
            {isEnabled && isScheduled ? (
              <Bell className="h-4 w-4 text-blue-500" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
            {isEnabled ? 'Reminder Set' : 'Set Reminder'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Event Reminder</h4>
              <p className="text-sm text-muted-foreground">
                Get notified before "{eventTitle}" starts
              </p>
            </div>

            {/* Status Messages */}
            {isBlocked && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Notifications blocked in browser
              </div>
            )}
            
            {notificationsDisabled && !isBlocked && (
              <div className="text-sm text-muted-foreground">
                Enable notifications in settings to use reminders
              </div>
            )}

            {canEnable && (
              <>
                {/* Toggle */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="reminder-toggle">Enable reminder</Label>
                  <Switch
                    id="reminder-toggle"
                    checked={isEnabled}
                    onCheckedChange={handleToggle}
                    disabled={isRequestingPermission}
                  />
                </div>

                {/* Time Selection */}
                {isEnabled && (
                  <div className="space-y-2">
                    <Label className="text-sm">Remind me</Label>
                    <Select
                      value={customMinutes.toString()}
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
                )}

                {/* Status Info */}
                {isScheduled && scheduledNotification && (
                  <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                    Reminder scheduled for {format(scheduledNotification.notificationTime, 'MMM d, h:mm a')}
                  </div>
                )}
              </>
            )}

            {needsPermission && (
              <Button
                onClick={() => requestPermission()}
                disabled={isRequestingPermission}
                className="w-full"
              >
                {isRequestingPermission ? 'Requesting...' : 'Enable Notifications'}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Full variant
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium">Event Reminder</Label>
            {isScheduled && (
              <Badge variant="outline" className="text-xs">
                <Bell className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Get a browser notification before this event starts
          </p>
        </div>
        <Switch
          checked={isEnabled && !needsPermission}
          onCheckedChange={handleToggle}
          disabled={!canEnable || isRequestingPermission}
        />
      </div>

      {/* Status Messages */}
      {isBlocked && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
          <AlertCircle className="h-4 w-4" />
          Notifications are blocked. Please enable them in your browser settings.
        </div>
      )}

      {notificationsDisabled && !isBlocked && (
        <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
          Enable notifications in your settings to use event reminders.
        </div>
      )}

      {needsPermission && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Permission needed to show browser notifications.
          </p>
          <Button
            onClick={() => requestPermission()}
            disabled={isRequestingPermission}
            size="sm"
          >
            {isRequestingPermission ? 'Requesting...' : 'Enable Notifications'}
          </Button>
        </div>
      )}

      {/* Time Selection */}
      {isEnabled && canEnable && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Reminder Time</Label>
          <Select
            value={customMinutes.toString()}
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
      )}

      {/* Scheduled Info */}
      {isScheduled && scheduledNotification && (
        <div className="text-sm bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Bell className="h-4 w-4" />
            <span className="font-medium">Reminder Set</span>
          </div>
          <p className="text-blue-600 dark:text-blue-400 mt-1">
            You'll be notified on {format(scheduledNotification.notificationTime, 'MMMM d')} at{' '}
            {format(scheduledNotification.notificationTime, 'h:mm a')}
          </p>
        </div>
      )}

      {/* Event Time Info */}
      {eventTime && (
        <div className="text-xs text-muted-foreground">
          Event starts: {format(eventTime, 'MMMM d, yyyy h:mm a')}
        </div>
      )}
    </div>
  );
}