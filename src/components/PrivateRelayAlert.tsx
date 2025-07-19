import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRelayPreferences } from '@/hooks/useRelayPreferences';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, Settings } from 'lucide-react';

/**
 * Component that shows an alert and redirects users to settings
 * if they don't have kind 10050 private relay preferences configured
 */
export function PrivateRelayAlert() {
  const { user } = useCurrentUser();
  const { hasPublishedPreferences, isLoading } = useRelayPreferences();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show alert if:
  // - No user logged in
  // - Still loading preferences  
  // - User has published preferences
  // - Already on settings page
  const shouldShowAlert = user?.pubkey && 
    !isLoading && 
    !hasPublishedPreferences && 
    location.pathname !== '/settings';

  useEffect(() => {
    // Auto-redirect to settings after a delay if user needs to configure private relays
    if (shouldShowAlert) {
      const timer = setTimeout(() => {
        navigate('/settings?tab=relays&highlight=private');
      }, 10000); // 10 second delay

      return () => clearTimeout(timer);
    }
  }, [shouldShowAlert, navigate]);

  if (!shouldShowAlert) {
    return null;
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
      <Shield className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800 dark:text-orange-200">
        Private Relay Configuration Required
      </AlertTitle>
      <AlertDescription className="text-orange-700 dark:text-orange-300">
        <div className="space-y-2">
          <p>
            You haven't configured private relay preferences (kind 10050) yet. 
            This is required for private calendar events and encrypted messaging.
          </p>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/settings?tab=relays&highlight=private')}
              className="flex items-center gap-1"
            >
              <Settings className="h-3 w-3" />
              Configure Now
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => {
                // Dismiss for this session (could add localStorage to persist)
                // For now, just redirect to home
                navigate('/');
              }}
              className="text-orange-700 dark:text-orange-300"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}