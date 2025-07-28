// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { AppConfig } from '@/contexts/AppContext';
import { CalendarProvider } from '@/contexts/CalendarContext';
import { EventsProvider } from '@/contexts/EventsContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { RelayManager } from '@/components/RelayManager';
import { NotificationManager } from '@/components/NotificationManager';
import { AmberCallbackHandler } from '@/components/AmberCallbackHandler';
import AppRouter from './AppRouter';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

const defaultConfig: AppConfig = {
  theme: "light",
  relayUrls: [
    "wss://relay.nostrcal.com",
    "wss://relay.primal.net",
    "wss://relay.damus.io",
    "wss://nos.lol"
  ],
  enableAuth: true,
};

const presetRelays = [
  { url: 'wss://relay.nostrcal.com', name: 'NostrCal' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://nos.lol', name: 'Nos.lol' },
  { url: 'wss://relay.nostr.band', name: 'Nostr.Band' },
  { url: 'wss://nostr.wine', name: 'Nostr.Wine' },
  { url: 'wss://relay.snort.social', name: 'Snort' },
];

export function App() {
  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig} presetRelays={presetRelays}>
        <QueryClientProvider client={queryClient}>
          <NostrLoginProvider storageKey='nostr:login'>
            <NostrProvider>
              <RelayManager>
                <TooltipProvider>
                  <CalendarProvider>
                    <EventsProvider>
                      <NotificationProvider>
                        <AmberCallbackHandler />
                        <NotificationManager />
                        <Toaster />
                        <Sonner />
                        <Suspense>
                          <AppRouter />
                        </Suspense>
                      </NotificationProvider>
                    </EventsProvider>
                  </CalendarProvider>
                </TooltipProvider>
              </RelayManager>
            </NostrProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
