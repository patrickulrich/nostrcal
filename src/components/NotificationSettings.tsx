import { useState } from 'react';
import { Bell, BellOff, Settings, Clock, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useNotificationContext } from '@/hooks/useNotificationContext';

const REMINDER_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 1440, label: '1 day' },
];

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const {
    preferences,
    permissionStatus,
    isSupported,
    scheduledNotifications,
    requestPermission,
    updatePreferences,
    cancelEventNotification,
    isRequestingPermission,
  } = useNotificationContext();

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleEnableNotifications = async () => {
    if (permissionStatus === 'default') {
      requestPermission();
    } else if (permissionStatus === 'granted') {
      updatePreferences({ enabled: !preferences.enabled });
    }
  };

  const handleReminderTimeChange = (minutesStr: string) => {
    const minutes = parseInt(minutesStr);
    updatePreferences({ defaultMinutesBefore: minutes });
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support notifications. Please use a modern browser to receive event reminders.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isEnabled = preferences.enabled && permissionStatus === 'granted';
  const canEnable = permissionStatus === 'default' || permissionStatus === 'granted';

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Event Notifications
        </CardTitle>
        <CardDescription>
          Get browser notifications before your calendar events start
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status Alert */}
        {permissionStatus === 'denied' && (
          <Alert>
            <BellOff className="h-4 w-4" />
            <AlertDescription>
              Notifications are blocked. Please click the browser's notification icon in the address bar or 
              check your browser settings to enable notifications for this site.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Enable/Disable Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notifications-enabled" className="text-base">
              Enable Notifications
            </Label>
            <div className="text-sm text-muted-foreground">
              {isEnabled 
                ? `${preferences.enabledEventIds.size} events enabled for reminders`
                : 'Receive browser notifications for your events'
              }
            </div>
          </div>
          <div className="flex items-center gap-2">
            {permissionStatus === 'default' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnableNotifications}
                disabled={isRequestingPermission}
              >
                {isRequestingPermission ? 'Requesting...' : 'Enable'}
              </Button>
            )}
            {permissionStatus === 'granted' && (
              <Switch
                id="notifications-enabled"
                checked={preferences.enabled}
                onCheckedChange={(enabled) => updatePreferences({ enabled })}
              />
            )}
            {permissionStatus === 'denied' && (
              <Badge variant="destructive">Blocked</Badge>
            )}
          </div>
        </div>

        {/* Default Reminder Time */}
        {isEnabled && (
          <div className="space-y-2">
            <Label htmlFor="reminder-time" className="text-sm font-medium">
              Default Reminder Time
            </Label>
            <Select
              value={preferences.defaultMinutesBefore.toString()}
              onValueChange={handleReminderTimeChange}
            >
              <SelectTrigger id="reminder-time">
                <SelectValue placeholder="Select reminder time" />
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
            <p className="text-xs text-muted-foreground">
              This is the default reminder time for new events. You can customize it for individual events.
            </p>
          </div>
        )}

        {/* Advanced Settings Toggle */}
        {isEnabled && (
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-auto p-0 font-normal text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4 mr-1" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </Button>
          </div>
        )}

        {/* Advanced Settings */}
        {isEnabled && showAdvanced && (
          <div className="space-y-4 pt-2 border-t">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notification Status</Label>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Events enabled for notifications:</span>
                  <span className="font-medium">{preferences.enabledEventIds.size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active scheduled notifications:</span>
                  <span className="font-medium">{scheduledNotifications.size}</span>
                </div>
              </div>
              {scheduledNotifications.size > 0 && (
                <div className="space-y-1 mt-3">
                  <Label className="text-xs font-medium text-muted-foreground">Upcoming Notifications</Label>
                  {Array.from(scheduledNotifications.values()).map(notification => (
                    <div
                      key={notification.eventId}
                      className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                    >
                      <div className="flex-1">
                        <span className="font-medium">{notification.eventTitle}</span>
                        <div className="text-muted-foreground text-xs">
                          {notification.notificationTime.toLocaleString()}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelEventNotification(notification.eventId)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        title="Cancel notification"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>


            <div className="space-y-2">
              <Label className="text-sm font-medium">Permission Status</Label>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={permissionStatus === 'granted' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {permissionStatus}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Browser notification permission
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!isEnabled && canEnable && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> Enable notifications to receive reminders before your events start. 
              You can customize reminder times for individual events after enabling notifications.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}