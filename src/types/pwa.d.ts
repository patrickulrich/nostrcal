/**
 * Type declarations for PWA and Service Worker APIs
 */

// Service Worker global scope types
declare global {
  interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
    __WB_MANIFEST: any;
    registration: ServiceWorkerRegistration;
    clients: Clients;
    skipWaiting(): Promise<void>;
  }

  interface ExtendableEvent extends Event {
    waitUntil(promise: Promise<any>): void;
  }

  interface ExtendableMessageEvent extends ExtendableEvent {
    data: any;
    origin: string;
    lastEventId: string;
    source: Client | ServiceWorker | MessagePort | null;
    ports: MessagePort[];
  }

  interface ExtendableActivateEvent extends ExtendableEvent {
    // Service Worker activate event type
    readonly type: 'activate';
  }

  interface NotificationEvent extends ExtendableEvent {
    notification: Notification;
    action: string;
  }

  interface SyncEvent extends ExtendableEvent {
    tag: string;
    lastChance: boolean;
  }

  // Service Worker specific
  var self: ServiceWorkerGlobalScope;
}

export {};