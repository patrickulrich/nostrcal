import { Wifi, Plus, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import { useGeneralRelayConfig } from "@/hooks/useGeneralRelayConfig";
import { mightRequireAuth } from "@/utils/nostr-auth";

interface RelaySelectorProps {
  className?: string;
}

export function RelaySelector(props: RelaySelectorProps) {
  const { className } = props;
  const { config, presetRelays = [], updateConfig: _updateConfig } = useAppContext();
  const { generalRelays, addGeneralRelay, removeGeneralRelay } = useGeneralRelayConfig();

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const addRelay = (url: string) => {
    const normalizedUrl = normalizeRelayUrl(url);
    // Add as read-only relay using the new NIP-65 system
    if (!generalRelays.some(relay => relay.url === normalizedUrl)) {
      addGeneralRelay(normalizedUrl, true, false); // read: true, write: false
    }
  };

  const removeRelay = (url: string) => {
    const effectiveRelays = generalRelays.length > 0 ? generalRelays : (config.relayUrls || []).map(url => ({ url, read: true, write: true }));
    if (effectiveRelays.length > 1) {
      removeGeneralRelay(url);
    }
  };

  // Function to normalize relay URL by adding wss:// if no protocol is present
  const normalizeRelayUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    
    // Check if it already has a protocol
    if (trimmed.includes('://')) {
      return trimmed;
    }
    
    // Add wss:// prefix
    return `wss://${trimmed}`;
  };

  // Handle adding a custom relay
  const handleAddCustomRelay = (url: string) => {
    addRelay(normalizeRelayUrl(url));
    setOpen(false);
    setInputValue("");
  };

  // Check if input value looks like a valid relay URL
  const isValidRelayInput = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    
    // Basic validation - should contain at least a domain-like structure
    const normalized = normalizeRelayUrl(trimmed);
    try {
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {(() => {
          // Use generalRelays if available, otherwise fall back to legacy relayUrls
          const effectiveRelays = generalRelays.length > 0 
            ? generalRelays 
            : (config.relayUrls || []).map(url => ({ url, read: true, write: true }));
          
          return effectiveRelays.map((relay) => {
            const preset = presetRelays.find(r => r.url === relay.url);
            return (
              <Badge key={relay.url} variant="secondary" className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                <span className="truncate max-w-[150px]">
                  {preset ? preset.name : relay.url.replace(/^wss?:\/\//, '')}
                </span>
                {config.enableAuth && mightRequireAuth(relay.url) && (
                  <ShieldCheck className="h-3 w-3 text-green-500" />
                )}
                {/* Show read/write indicators */}
                {relay.read && !relay.write && (
                  <span className="text-xs text-blue-500" title="Read-only">R</span>
                )}
                {!relay.read && relay.write && (
                  <span className="text-xs text-orange-500" title="Write-only">W</span>
                )}
                {relay.read && relay.write && (
                  <span className="text-xs text-green-500" title="Read & Write">RW</span>
                )}
                {effectiveRelays.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => removeRelay(relay.url)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            );
          });
        })()}
      </div>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Relay
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search relays or type URL..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue && isValidRelayInput(inputValue) ? (
                <CommandItem
                  onSelect={() => handleAddCustomRelay(inputValue)}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Add custom relay</span>
                    <span className="text-xs text-muted-foreground">
                      {normalizeRelayUrl(inputValue)}
                    </span>
                  </div>
                </CommandItem>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {inputValue ? "Invalid relay URL" : "No relay found."}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {presetRelays
                .filter((option) => {
                  const effectiveRelays = generalRelays.length > 0 
                    ? generalRelays 
                    : (config.relayUrls || []).map(url => ({ url, read: true, write: true }));
                  
                  return !effectiveRelays.some(relay => relay.url === option.url) && (
                    !inputValue || 
                    option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                    option.url.toLowerCase().includes(inputValue.toLowerCase())
                  );
                })
                .map((option) => (
                  <CommandItem
                    key={option.url}
                    value={option.url}
                    onSelect={(currentValue) => {
                      addRelay(currentValue);
                      setOpen(false);
                      setInputValue("");
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{option.name}</span>
                      <span className="text-xs text-muted-foreground">{option.url}</span>
                    </div>
                  </CommandItem>
                ))}
              {inputValue && isValidRelayInput(inputValue) && (
                <CommandItem
                  onSelect={() => handleAddCustomRelay(inputValue)}
                  className="cursor-pointer border-t"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Add custom relay</span>
                    <span className="text-xs text-muted-foreground">
                      {normalizeRelayUrl(inputValue)}
                    </span>
                  </div>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    </div>
  );
}