import { useState, useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { useTheme } from '@/hooks/useTheme';
import { useCalendar } from '@/hooks/useCalendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Settings as SettingsIcon, 
  Server, 
  Moon, 
  Sun, 
  Monitor,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  Check,
  X,
  Shield,
  ShieldCheck,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useRelayStatus } from '@/hooks/useRelayStatus';
import { useAuthor } from '@/hooks/useAuthor';
import { useRelayPreferences } from '@/hooks/useRelayPreferences';
import { useBlossomServers } from '@/hooks/useBlossomServers';
import { useGeneralRelayList } from '@/hooks/useGeneralRelayList';
import { PrivateEventDebug } from '@/components/PrivateEventDebug';

export default function Settings() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { theme, setTheme } = useTheme();
  const { config, updateConfig, presetRelays } = useAppContext();
  const { is24HourFormat, setTimeFormat } = useCalendar();
  const { toast } = useToast();
  const {
    publishedServers,
    isLoadingPublished: _isLoadingPublished,
    effectiveServers: _effectiveServers,
    hasPublishedServers,
    hasConfigServers,
    serversOutOfSync,
    importPublishedServers,
    publishConfigServers,
    isPublishing
  } = useBlossomServers();
  const { relayStatuses } = useRelayStatus();
  const { data: authorData } = useAuthor(user?.pubkey);
  const { 
    preferences: relayPreferences, 
    hasPublishedPreferences,
    isLoading: isLoadingRelayPrefs,
    updatePreferences: updateRelayPreferences,
    isUpdating: isUpdatingRelayPrefs 
  } = useRelayPreferences();
  const { generalRelays, hasGeneralRelays, isLoading: isLoadingGeneralRelays } = useGeneralRelayList();
  
  const [activeTab, setActiveTab] = useState<'general' | 'relays' | 'profile' | 'debug'>('general');
  const [newRelay, setNewRelay] = useState('');
  const [newPrivateRelay, setNewPrivateRelay] = useState('');
  const [testingRelay, setTestingRelay] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Profile settings
  const [profileForm, setProfileForm] = useState({
    name: '',
    about: '',
    website: '',
    picture: '',
    nip05: '',
    lud16: ''
  });

  useEffect(() => {
    // Load user's existing profile data from useAuthor hook
    if (authorData?.metadata) {
      setProfileForm({
        name: authorData.metadata.name || '',
        about: authorData.metadata.about || '',
        website: authorData.metadata.website || '',
        picture: authorData.metadata.picture || '',
        nip05: authorData.metadata.nip05 || '',
        lud16: authorData.metadata.lud16 || ''
      });
    } else {
      // Initialize with empty values if no metadata found
      setProfileForm({
        name: '',
        about: '',
        website: '',
        picture: '',
        nip05: '',
        lud16: ''
      });
    }
  }, [authorData]);


  const testRelay = async (url: string) => {
    setTestingRelay(url);
    
    try {
      // Test WebSocket connection directly
      const testSocket = new WebSocket(url);
      
      const testResult = await new Promise<{success: boolean, message: string}>((resolve) => {
        const timeout = setTimeout(() => {
          testSocket.close();
          resolve({ success: false, message: "Connection timeout" });
        }, 5000);
        
        testSocket.onopen = () => {
          clearTimeout(timeout);
          testSocket.close();
          resolve({ success: true, message: "WebSocket connection successful" });
        };
        
        testSocket.onerror = (error) => {
          clearTimeout(timeout);
          console.error('WebSocket test error:', error);
          resolve({ success: false, message: "WebSocket connection failed" });
        };
        
        testSocket.onclose = (event) => {
          clearTimeout(timeout);
          if (event.code === 1006) {
            resolve({ success: false, message: "Connection refused or blocked" });
          } else if (event.code !== 1000) {
            resolve({ success: false, message: `Connection closed with code ${event.code}` });
          }
        };
      });
      
      toast({
        title: "Connection Test",
        description: testResult.message,
        variant: testResult.success ? "default" : "destructive"
      });
    } catch (err) {
      console.error('Relay test error:', err);
      toast({
        title: "Connection Test",
        description: "Failed to test relay connection",
        variant: "destructive"
      });
    } finally {
      setTestingRelay(null);
    }
  };

  const addRelay = () => {
    if (!newRelay.trim()) return;
    
    if (!newRelay.startsWith('wss://') && !newRelay.startsWith('ws://')) {
      toast({
        title: "Invalid Relay URL",
        description: "Relay URL must start with ws:// or wss://",
        variant: "destructive"
      });
      return;
    }

    // Check if relay already exists
    const currentRelays = config.relayUrls || [];
    if (currentRelays.includes(newRelay)) {
      toast({
        title: "Relay Already Added",
        description: "This relay is already in your list",
        variant: "destructive"
      });
      return;
    }

    // Add to relay list (always add to local config for now)
    updateConfig(prev => ({
      ...prev,
      relayUrls: [...(prev.relayUrls || []), newRelay]
    }));
    
    setNewRelay('');
    toast({
      title: "Relay Added",
      description: "Relay has been added to your list",
    });
  };

  const removeRelay = (url: string) => {
    const currentRelays = config.relayUrls || [];
    // Don't allow removing the last relay
    if (currentRelays.length <= 1) {
      toast({
        title: "Cannot Remove Relay",
        description: "You must have at least one relay configured",
        variant: "destructive"
      });
      return;
    }

    // Remove from relay list (only from local config)
    updateConfig(prev => ({
      ...prev,
      relayUrls: currentRelays.filter(relayUrl => relayUrl !== url)
    }));
    
    toast({
      title: "Relay Removed",
      description: "Relay has been removed from your list",
    });
  };

  const addPrivateRelay = () => {
    if (!newPrivateRelay.trim()) return;
    
    if (!newPrivateRelay.startsWith('wss://') && !newPrivateRelay.startsWith('ws://')) {
      toast({
        title: "Invalid Relay URL",
        description: "Relay URL must start with ws:// or wss://",
        variant: "destructive"
      });
      return;
    }

    // Check if relay already exists
    if (relayPreferences.some(pref => pref.url === newPrivateRelay)) {
      toast({
        title: "Relay Already Added",
        description: "This relay is already in your private relay list",
        variant: "destructive"
      });
      return;
    }

    // Add to private relay preferences (default to read/write)
    const newPreferences = [...relayPreferences, {
      url: newPrivateRelay,
      read: true,
      write: true
    }];
    
    updateRelayPreferences(newPreferences);
    setNewPrivateRelay('');
    
    toast({
      title: "Private Relay Added",
      description: "Relay has been added to your private relay preferences",
    });
  };

  const removePrivateRelay = (url: string) => {
    // Don't allow removing the last relay
    if (relayPreferences.length <= 1) {
      toast({
        title: "Cannot Remove Relay",
        description: "You must have at least one private relay configured",
        variant: "destructive"
      });
      return;
    }

    // Remove from private relay preferences
    const newPreferences = relayPreferences.filter(pref => pref.url !== url);
    updateRelayPreferences(newPreferences);
    
    toast({
      title: "Private Relay Removed",
      description: "Relay has been removed from your private relay preferences",
    });
  };

  const togglePrivateRelayAccess = (url: string, accessType: 'read' | 'write') => {
    const newPreferences = relayPreferences.map(pref => {
      if (pref.url === url) {
        return {
          ...pref,
          [accessType]: !pref[accessType]
        };
      }
      return pref;
    });
    
    updateRelayPreferences(newPreferences);
    
    toast({
      title: "Relay Access Updated",
      description: `${accessType} access has been ${newPreferences.find(p => p.url === url)?.[accessType] ? 'enabled' : 'disabled'} for this relay`,
    });
  };

  const saveProfile = async () => {
    if (!user?.pubkey) return;
    
    setIsSaving(true);
    
    try {
      const metadata = {
        name: profileForm.name,
        about: profileForm.about,
        website: profileForm.website,
        picture: profileForm.picture,
        nip05: profileForm.nip05,
        lud16: profileForm.lud16
      };

      const unsignedEvent = {
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify(metadata),
      };

      // Create and sign the event properly
      const signedEvent = await user.signer.signEvent(unsignedEvent);
      await nostr.event(signedEvent);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    } catch (err) {
      console.error('Failed to update profile:', err);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Login Required</h2>
              <p className="text-muted-foreground">Please log in to access settings</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Settings
          </CardTitle>
          <CardDescription>
            Configure your NostrCal preferences and account settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'general' | 'relays' | 'profile' | 'debug')}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="relays">Relays</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="debug">Debug</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                <div className="space-y-2">
                  <Label>Authentication</Label>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="enable-auth" 
                      checked={config.enableAuth}
                      onCheckedChange={(checked) => updateConfig(prev => ({ ...prev, enableAuth: checked }))}
                    />
                    <Label htmlFor="enable-auth" className="flex items-center gap-2">
                      {config.enableAuth ? <ShieldCheck className="h-4 w-4 text-green-500" /> : <Shield className="h-4 w-4" />}
                      Enable relay authentication (NIP-42)
                    </Label>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    When enabled, automatically authenticate with relays that support NIP-42 for enhanced features and access to private content.
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    <strong>Note:</strong> Private calendar events use NIP-59 encryption and require authentication enabled for proper functionality.
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Calendar Display</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="time-format" 
                        checked={is24HourFormat}
                        onCheckedChange={setTimeFormat}
                      />
                      <Label htmlFor="time-format">24-hour time format</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="show-weekends" defaultChecked />
                      <Label htmlFor="show-weekends">Show weekends</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="show-declined" />
                      <Label htmlFor="show-declined">Show declined events</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notifications</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="booking-notifications" defaultChecked />
                      <Label htmlFor="booking-notifications">Booking notifications</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="event-reminders" defaultChecked />
                      <Label htmlFor="event-reminders">Event reminders</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Blossom Upload Servers</Label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Configure servers for uploading images and files using the Blossom protocol (BUD-03)
                  </div>
                  
                  {/* Status indicators */}
                  <div className="flex gap-2 mb-4">
                    {hasPublishedServers && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Published to Nostr
                      </Badge>
                    )}
                    {hasConfigServers && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <SettingsIcon className="h-3 w-3" />
                        Local Config
                      </Badge>
                    )}
                    {serversOutOfSync && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Out of Sync
                      </Badge>
                    )}
                  </div>

                  {/* Published servers info */}
                  {publishedServers && (
                    <div className="p-3 bg-muted rounded-md mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Published Servers (Kind 10063)</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (importPublishedServers()) {
                              toast({
                                title: "Imported",
                                description: "Published servers imported to local config"
                              });
                            }
                          }}
                          disabled={!publishedServers.servers.length}
                        >
                          Import
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Updated: {publishedServers.updatedAt.toLocaleString()}
                      </div>
                      <div className="space-y-1">
                        {publishedServers.servers.map((server, index) => (
                          <div key={index} className="text-sm font-mono bg-background px-2 py-1 rounded">
                            {index + 1}. {server}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Local configuration */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Local Configuration</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await publishConfigServers();
                            toast({
                              title: "Published",
                              description: "Servers published to Nostr (kind 10063)"
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: error instanceof Error ? error.message : "Failed to publish servers",
                              variant: "destructive"
                            });
                          }
                        }}
                        disabled={isPublishing || !hasConfigServers}
                      >
                        {isPublishing ? 'Publishing...' : 'Publish to Nostr'}
                      </Button>
                    </div>
                    
                    {(config.blossomServers || ['https://blossom.primal.net/']).map((server, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input 
                          value={server} 
                          onChange={(e) => {
                            const newServers = [...(config.blossomServers || ['https://blossom.primal.net/'])];
                            newServers[index] = e.target.value;
                            updateConfig(prev => ({ ...prev, blossomServers: newServers }));
                          }}
                          placeholder="https://blossom.example.com/"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const newServers = (config.blossomServers || ['https://blossom.primal.net/']).filter((_, i) => i !== index);
                            updateConfig(prev => ({ ...prev, blossomServers: newServers.length > 0 ? newServers : ['https://blossom.primal.net/'] }));
                          }}
                          disabled={(config.blossomServers || ['https://blossom.primal.net/']).length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newServers = [...(config.blossomServers || ['https://blossom.primal.net/']), ''];
                        updateConfig(prev => ({ ...prev, blossomServers: newServers }));
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-3 w-3" />
                      Add Server
                    </Button>
                  </div>
                  
                  <Alert>
                    <Upload className="h-4 w-4" />
                    <AlertDescription>
                      Blossom servers store your uploaded files. According to BUD-03, the first server is considered most reliable. 
                      You can publish your server list to Nostr (kind 10063) so other clients can find your files if a server goes offline.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="relays" className="space-y-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Relay Configuration</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Manage your Nostr relay connections. NostrCal uses two types of relays for different purposes.
                  </p>
                  
                  <Alert className="mb-6">
                    <Server className="h-4 w-4" />
                    <AlertDescription>
                      <strong>General relays</strong> handle public events, profiles, and discovery. <strong>Private relays</strong> handle encrypted events with authentication. 
                      Having multiple relays of each type improves reliability and redundancy across your network.
                    </AlertDescription>
                  </Alert>
                </div>

                {/* General Relays Section */}
                <Card className="border-blue-200">
                  <CardHeader className="border-l-4 border-blue-500 rounded-tl-none">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Server className="h-5 w-5 text-blue-600" />
                      General Relays (Kind 10002)
                    </CardTitle>
                    <CardDescription>
                      Used for public events, profiles, and general app functionality. Lower authentication requirements.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current Status */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Current Configuration</span>
                        {isLoadingGeneralRelays ? (
                          <Badge variant="outline" className="text-xs">Loading...</Badge>
                        ) : hasGeneralRelays ? (
                          <Badge variant="default" className="text-xs flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Published (kind 10002)
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <SettingsIcon className="h-3 w-3" />
                            Local defaults
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {(config.relayUrls || []).length} relay{(config.relayUrls || []).length === 1 ? '' : 's'} configured
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {(config.relayUrls || []).map((url) => (
                          <Badge key={url} variant="secondary" className="text-xs">
                            {presetRelays?.find(r => r.url === url)?.name || url}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Import Published Relays */}
                    {hasGeneralRelays && generalRelays && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Published General Relays</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const relayUrls = generalRelays.map(r => r.url);
                              updateConfig(prev => ({ ...prev, relayUrls }));
                              toast({
                                title: "Imported",
                                description: "Published general relays imported to local config"
                              });
                            }}
                          >
                            Import to Local
                          </Button>
                        </div>
                        <div className="space-y-1">
                          {generalRelays.map((relay, index) => (
                            <div key={index} className="text-sm font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                              {index + 1}. {relay.url} 
                              {relay.read && relay.write ? ' (R/W)' : 
                               relay.read ? ' (Read)' : 
                               relay.write ? ' (Write)' : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manage General Relays */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Manage General Relays</h4>
                      
                      {/* Current Relays List */}
                      <div className="space-y-3">
                        {relayStatuses.filter(relay => (config.relayUrls || []).includes(relay.url)).map((relay) => (
                          <div key={relay.url} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {relay.connected ? (
                                  <Wifi className="h-4 w-4 text-green-500" />
                                ) : (
                                  <WifiOff className="h-4 w-4 text-red-500" />
                                )}
                                <span className="font-medium">{relay.url}</span>
                              </div>
                              <Badge variant={relay.connected ? "default" : "secondary"}>
                                {relay.connected ? "Connected" : relay.readyStateText}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => testRelay(relay.url)}
                                disabled={testingRelay === relay.url}
                              >
                                Test
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => removeRelay(relay.url)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add New Relay */}
                      <div className="border-t pt-4 space-y-4">
                        <div>
                          <h5 className="font-medium mb-2">Add New Relay</h5>
                          <div className="flex gap-2">
                            <Input
                              placeholder="wss://relay.example.com"
                              value={newRelay}
                              onChange={(e) => setNewRelay(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addRelay()}
                            />
                            <Button onClick={addRelay}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                          </div>
                        </div>

                        {/* Quick Add Presets */}
                        <div>
                          <h5 className="font-medium mb-2">Quick Add Preset Relays</h5>
                          <div className="flex flex-wrap gap-2">
                            {presetRelays?.filter(relay => !(config.relayUrls || []).includes(relay.url)).map(relay => (
                              <Button
                                key={relay.url}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  updateConfig(prev => ({
                                    ...prev,
                                    relayUrls: [...(prev.relayUrls || []), relay.url]
                                  }));
                                  toast({
                                    title: "Relay Added",
                                    description: `${relay.name} has been added to your list`,
                                  });
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {relay.name}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Publish to Nostr */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium">Publish to Nostr</div>
                            <div className="text-sm text-muted-foreground">
                              Share your relay list (kind 10002) so others know where to find your content
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => {
                              // TODO: Implement general relay list publishing
                              toast({
                                title: "Coming Soon",
                                description: "General relay list publishing will be implemented soon",
                              });
                            }}
                          >
                            Publish List
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Private Calendar Relays Section */}
                <Card className="border-green-200">
                  <CardHeader className="border-l-4 border-green-500 rounded-tl-none">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      Private Calendar Relays (Kind 10050)
                    </CardTitle>
                    <CardDescription>
                      Used for private events and gift wraps. Requires constant authentication (NIP-42) for enhanced security.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current Status */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Current Configuration</span>
                        {isLoadingRelayPrefs ? (
                          <Badge variant="outline" className="text-xs">Loading...</Badge>
                        ) : hasPublishedPreferences ? (
                          <Badge variant="default" className="text-xs flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Published (kind 10050)
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs flex items-center gap-1">
                            <X className="h-3 w-3" />
                            Not published - using defaults
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {relayPreferences.length} relay{relayPreferences.length === 1 ? '' : 's'} configured for private events
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {relayPreferences.map((pref) => (
                          <Badge key={pref.url} variant="outline" className="text-xs">
                            {pref.url}
                            {pref.read && pref.write ? ' (R/W)' : 
                             pref.read ? ' (Read)' : 
                             pref.write ? ' (Write)' : ''}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Warning if no published preferences */}
                    {!hasPublishedPreferences && (
                      <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-700 dark:text-orange-300">
                          You haven't published private relay preferences yet. This is required for private calendar events and encrypted messaging.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Manage Private Relays */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Manage Private Relay Preferences</h4>
                      
                      {/* Current Private Relays List */}
                      <div className="space-y-3">
                        {relayPreferences.map((pref) => (
                          <div key={pref.url} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-green-500" />
                                <span className="font-medium">{pref.url}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {pref.read && pref.write ? 'R/W' : 
                                   pref.read ? 'Read' : 
                                   pref.write ? 'Write' : 'None'}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Read/Write Toggle Buttons */}
                              <Button
                                size="sm"
                                variant={pref.read ? "default" : "outline"}
                                onClick={() => togglePrivateRelayAccess(pref.url, 'read')}
                                className="text-xs px-2"
                              >
                                Read
                              </Button>
                              <Button
                                size="sm"
                                variant={pref.write ? "default" : "outline"}
                                onClick={() => togglePrivateRelayAccess(pref.url, 'write')}
                                className="text-xs px-2"
                              >
                                Write
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => testRelay(pref.url)}
                                disabled={testingRelay === pref.url}
                              >
                                Test
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => removePrivateRelay(pref.url)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add New Private Relay */}
                      <div className="border-t pt-4 space-y-4">
                        <div>
                          <h5 className="font-medium mb-2">Add New Private Relay</h5>
                          <div className="flex gap-2">
                            <Input
                              placeholder="wss://relay.example.com"
                              value={newPrivateRelay}
                              onChange={(e) => setNewPrivateRelay(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addPrivateRelay()}
                            />
                            <Button onClick={addPrivateRelay}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            New relays will be added with both read and write permissions
                          </div>
                        </div>

                        {/* Quick Add Private Presets */}
                        <div>
                          <h5 className="font-medium mb-2">Quick Add Secure Relays</h5>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { name: 'Primal', url: 'wss://relay.primal.net' },
                              { name: 'Damus', url: 'wss://relay.damus.io' },
                              { name: 'Nos.lol', url: 'wss://nos.lol' },
                              { name: 'Snort', url: 'wss://relay.snort.social' },
                              { name: 'Nostr.Wine', url: 'wss://nostr.wine' }
                            ].filter(relay => !relayPreferences.some(pref => pref.url === relay.url)).map(relay => (
                              <Button
                                key={relay.url}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newPreferences = [...relayPreferences, {
                                    url: relay.url,
                                    read: true,
                                    write: true
                                  }];
                                  updateRelayPreferences(newPreferences);
                                  toast({
                                    title: "Private Relay Added",
                                    description: `${relay.name} has been added to your private relay preferences`,
                                  });
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {relay.name}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Publish Private Relay Preferences */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium">Publish Private Relay Preferences</div>
                            <div className="text-sm text-muted-foreground">
                              Publish your current relay configuration as kind 10050 preferences
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => {
                              updateRelayPreferences(relayPreferences);
                              toast({
                                title: "Publishing",
                                description: "Publishing private relay preferences to Nostr",
                              });
                            }}
                            disabled={isUpdatingRelayPrefs}
                          >
                            {isUpdatingRelayPrefs ? 'Publishing...' : 'Publish Preferences'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>



                <div className="border-t pt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (window.getRelayStatus) {
                        console.log('Relay Status:', window.getRelayStatus());
                        toast({
                          title: "Debug Info",
                          description: "Check browser console for detailed relay status",
                        });
                      } else {
                        toast({
                          title: "Debug Info",
                          description: "Relay status not available",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Debug Relay Status
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Profile Information</h3>
                  <p className="text-sm text-muted-foreground">
                    Update your public profile information
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your display name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nip05">NIP-05 Identifier</Label>
                    <Input
                      id="nip05"
                      value={profileForm.nip05}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, nip05: e.target.value }))}
                      placeholder="user@domain.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={profileForm.website}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="picture">Profile Picture URL</Label>
                    <Input
                      id="picture"
                      value={profileForm.picture}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, picture: e.target.value }))}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="about">About</Label>
                    <Input
                      id="about"
                      value={profileForm.about}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, about: e.target.value }))}
                      placeholder="Tell others about yourself"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="lud16">Lightning Address</Label>
                    <Input
                      id="lud16"
                      value={profileForm.lud16}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, lud16: e.target.value }))}
                      placeholder="user@getalby.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={saveProfile} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="debug" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Private Events Debug</h3>
                  <p className="text-sm text-muted-foreground">
                    Test and debug private calendar event functionality
                  </p>
                </div>

                <PrivateEventDebug />

                <div className="text-xs text-muted-foreground space-y-2">
                  <p><strong>Implementation Status:</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>✅ NIP-44 encryption/decryption utilities</li>
                    <li>✅ NIP-59 gift wrap/seal functionality</li>
                    <li>✅ Private calendar event creation and publishing</li>
                    <li>✅ Private calendar event decryption and display</li>
                    <li>✅ Kind 10050 relay preferences</li>
                    <li>✅ Private RSVP handling</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}