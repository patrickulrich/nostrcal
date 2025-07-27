import { createContext } from "react";

export type Theme = "dark" | "light" | "system";

export interface GeneralRelayConfig {
  url: string;
  read: boolean;
  write: boolean;
}

export interface AppConfig {
  /** Current theme */
  theme: Theme;
  /** Selected relay URLs (legacy - kept for backward compatibility) */
  relayUrls: string[];
  /** General relays with read/write permissions (NIP-65 compliant) */
  generalRelays?: GeneralRelayConfig[];
  /** Whether to enable automatic authentication for relays */
  enableAuth: boolean;
  /** Blossom server URLs for file uploads */
  blossomServers?: string[];
}

export interface AppContextType {
  /** Current application configuration */
  config: AppConfig;
  /** Update configuration using a callback that receives current config and returns new config */
  updateConfig: (updater: (currentConfig: AppConfig) => AppConfig) => void;
  /** Optional list of preset relays to display in the RelaySelector */
  presetRelays?: { name: string; url: string }[];
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
