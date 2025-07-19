import React from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePrivateCalendarEvents } from '@/hooks/usePrivateCalendarEvents';
import { useRelayPreferences } from '@/hooks/useRelayPreferences';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff } from 'lucide-react';

/**
 * Debug component to test private calendar events
 */
export function PrivateEventDebug() {
  const { user } = useCurrentUser();
  const { privateEvents, isLoading, error } = usePrivateCalendarEvents();
  const { preferences } = useRelayPreferences();
  const [showDetails, setShowDetails] = React.useState(false);

  if (!user) {
    return (
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Private Events Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please log in to test private calendar events
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Private Events Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Status</p>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Loading...' : error ? 'Error' : 'Ready'}
            </p>
          </div>
          <Badge variant={isLoading ? 'secondary' : error ? 'destructive' : 'default'}>
            {privateEvents.length} private events
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Relay Preferences</p>
            <p className="text-xs text-muted-foreground">
              {preferences.length} relays configured
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>

        {showDetails && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <p className="text-sm font-medium mb-2">Private Events</p>
              {privateEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No private events found</p>
              ) : (
                <div className="space-y-2">
                  {privateEvents.map((event) => (
                    <div key={event.id} className="p-2 bg-purple-50 rounded text-xs">
                      <p className="font-medium">{event.tags.find(t => t[0] === 'title')?.[1] || 'Untitled'}</p>
                      <p className="text-muted-foreground">Kind: {event.kind}</p>
                      <p className="text-muted-foreground">ID: {event.id.substring(0, 8)}...</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Relay Preferences</p>
              <div className="space-y-1">
                {preferences.map((pref) => (
                  <div key={pref.url} className="flex items-center justify-between text-xs">
                    <span className="truncate">{pref.url}</span>
                    <div className="flex gap-1">
                      {pref.read !== false && <Badge variant="outline" className="h-4 text-xs">R</Badge>}
                      {pref.write !== false && <Badge variant="outline" className="h-4 text-xs">W</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div>
                <p className="text-sm font-medium mb-2 text-red-600">Error</p>
                <p className="text-xs text-red-600">{String(error)}</p>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-4 border-t">
          <p><strong>Note:</strong> Private events use NIP-59 encryption and work with browser extension signers that support NIP-44 decryption.</p>
        </div>
      </CardContent>
    </Card>
  );
}