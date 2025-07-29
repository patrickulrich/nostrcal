// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import { useState, useEffect } from 'react';
import { User, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AccountSwitcher } from './AccountSwitcher';
import { cn } from '@/lib/utils';
import { launch as launchNostrLoginDialog } from 'nostr-login';

export interface LoginAreaProps {
  className?: string;
}

export function LoginArea({ className }: LoginAreaProps) {
  const { user } = useCurrentUser();
  const [isLaunching, setIsLaunching] = useState(false);

  // Listen for auth events from nostr-login
  useEffect(() => {
    const handleAuth = async (e: CustomEvent) => {
      if (e.detail.type === 'login' || e.detail.type === 'signup') {
        setIsLaunching(false);
      } else if (e.detail.type === 'logout') {
        setIsLaunching(false);
      }
    };

    document.addEventListener('nlAuth', handleAuth as EventListener);
    
    // Don't check initial login state for bunker compatibility
    // Wait for explicit nlAuth events instead

    return () => {
      document.removeEventListener('nlAuth', handleAuth as EventListener);
    };
  }, []);

  const handleLaunch = (startScreen: 'welcome-login' | 'signup') => {
    if (isLaunching) return;
    setIsLaunching(true);
    launchNostrLoginDialog(startScreen);
  };

  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      {user ? (
        <AccountSwitcher onAddAccountClick={() => handleLaunch('welcome-login')} />
      ) : (
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => handleLaunch('welcome-login')}
            disabled={isLaunching}
            className='flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground w-full font-medium transition-all hover:bg-primary/90 animate-scale-in'
          >
            <User className='w-4 h-4' />
            <span className='truncate'>{isLaunching ? 'Loading...' : 'Log in'}</span>
          </Button>
          <Button
            onClick={() => handleLaunch('signup')}
            disabled={isLaunching}
            variant="outline"
            className="flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isLaunching ? 'Loading...' : 'Sign Up'}</span>
          </Button>
        </div>
      )}
    </div>
  );
}