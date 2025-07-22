import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendarPublish } from '@/hooks/useCalendarPublish';
import { usePrivateCalendarPublish } from '@/hooks/usePrivateCalendarPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUploadFile } from '@/hooks/useUploadFile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, X, Plus, Upload, Loader2, FileText } from 'lucide-react';
import { parseICSFile, validateICSFile } from '@/utils/icsParser';

interface ParticipantWithRole {
  pubkey: string;
  relayUrl: string;
  role: string;
}

interface EventFormData {
  title: string;
  description: string;
  summary: string;
  image: string;
  locations: string[]; // Multiple locations support
  geohash: string;
  timezone: string;
  endTimezone: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  participants: string[]; // backwards compatibility
  participantsWithRoles: ParticipantWithRole[]; // NIP-52 compliant participants
  hashtags: string[];
  references: string[];
  isPrivate: boolean;
  createBusySlot: boolean;
}

export default function NewEvent() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const publishEvent = useCalendarPublish();
  const { publishPrivateDateEvent, publishPrivateTimeEvent, isPublishing: isPublishingPrivate } = usePrivateCalendarPublish();
  const uploadFileHook = useUploadFile();
  const uploadFile = uploadFileHook.mutateAsync;
  const isUploading = uploadFileHook.isPending;

  const [eventType, setEventType] = useState<'timed' | 'all-day'>('timed');
  const [participantInput, setParticipantInput] = useState('');
  const [participantRoleInput, setParticipantRoleInput] = useState('participant');
  const [participantRelayInput, setParticipantRelayInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [referenceInput, setReferenceInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    summary: '',
    image: '',
    locations: [],
    geohash: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    endTimezone: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    participants: [],
    participantsWithRoles: [],
    hashtags: [],
    references: [],
    isPrivate: true, // Changed: Default to private
    createBusySlot: true // New: Default to creating busy slots
  });

  const handleInputChange = (field: keyof EventFormData, value: string | boolean) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Reset createBusySlot when switching from private to public
      if (field === 'isPrivate' && !value) {
        newData.createBusySlot = false;
      }
      
      // Auto-set end time to 1 hour after start time for timed events
      if (eventType === 'timed' && (field === 'startTime' || field === 'startDate')) {
        if (newData.startDate && newData.startTime) {
          const startDateTime = new Date(`${newData.startDate}T${newData.startTime}`);
          const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // Add 1 hour
          
          newData.endDate = newData.startDate; // Keep same date
          newData.endTime = endDateTime.toTimeString().slice(0, 5); // HH:MM format
        }
      }
      
      return newData;
    });
  };

  const addParticipant = () => {
    if (participantInput.trim()) {
      const newParticipant: ParticipantWithRole = {
        pubkey: participantInput.trim(),
        relayUrl: participantRelayInput.trim(),
        role: participantRoleInput.trim() || 'participant'
      };
      
      // Check if participant already exists
      if (!formData.participantsWithRoles.some(p => p.pubkey === newParticipant.pubkey)) {
        setFormData(prev => ({
          ...prev,
          participantsWithRoles: [...prev.participantsWithRoles, newParticipant]
        }));
      }
      
      setParticipantInput('');
      setParticipantRelayInput('');
      setParticipantRoleInput('participant');
    }
  };

  const addLocation = () => {
    if (locationInput.trim() && !formData.locations.includes(locationInput.trim())) {
      setFormData(prev => ({
        ...prev,
        locations: [...prev.locations, locationInput.trim()]
      }));
      setLocationInput('');
    }
  };

  const addHashtag = () => {
    if (hashtagInput.trim() && !formData.hashtags.includes(hashtagInput.trim())) {
      const tag = hashtagInput.trim().startsWith('#') ? hashtagInput.trim().slice(1) : hashtagInput.trim();
      setFormData(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, tag]
      }));
      setHashtagInput('');
    }
  };

  const addReference = () => {
    if (referenceInput.trim() && !formData.references.includes(referenceInput.trim())) {
      setFormData(prev => ({
        ...prev,
        references: [...prev.references, referenceInput.trim()]
      }));
      setReferenceInput('');
    }
  };

  const removeParticipant = (pubkey: string) => {
    setFormData(prev => ({
      ...prev,
      participantsWithRoles: prev.participantsWithRoles.filter(p => p.pubkey !== pubkey)
    }));
  };

  const removeLocation = (location: string) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.filter(l => l !== location)
    }));
  };

  const removeHashtag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(t => t !== tag)
    }));
  };

  const removeReference = (ref: string) => {
    setFormData(prev => ({
      ...prev,
      references: prev.references.filter(r => r !== ref)
    }));
  };

  const handleICSImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      // Validate and read the ICS file
      const icsContent = await validateICSFile(file);
      const parsedEvents = parseICSFile(icsContent);

      if (parsedEvents.length === 0) {
        throw new Error('No events found in the ICS file');
      }

      // Use the first event to populate the form
      const firstEvent = parsedEvents[0];
      
      // Set event type based on whether it's all-day
      setEventType(firstEvent.isAllDay ? 'all-day' : 'timed');

      // Populate form data
      setFormData(prev => ({
        ...prev,
        title: firstEvent.title,
        description: firstEvent.description,
        summary: '', // ICS doesn't have a separate summary field
        locations: firstEvent.location ? [firstEvent.location] : [],
        timezone: firstEvent.timezone || prev.timezone,
        startDate: firstEvent.startDate,
        endDate: firstEvent.endDate,
        startTime: firstEvent.startTime,
        endTime: firstEvent.endTime,
        hashtags: firstEvent.hashtags,
        // Note: participants from ICS are emails, not Nostr pubkeys
        // participants: firstEvent.participants,
      }));

      // Show success message if multiple events were found
      if (parsedEvents.length > 1) {
        alert(`Successfully imported event details. Note: ${parsedEvents.length} events were found, but only the first event was imported.`);
      }

    } catch (error) {
      console.error('Failed to import ICS file:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to import ICS file');
    } finally {
      setIsImporting(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  const validateDateTime = (): string | null => {
    if (eventType === 'timed') {
      if (!formData.startDate || !formData.startTime) {
        return 'Start date and time are required for timed events';
      }
      
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      
      // If end date/time is provided, validate it's after start
      if (formData.endDate || formData.endTime) {
        const endDate = formData.endDate || formData.startDate;
        const endTime = formData.endTime || formData.startTime;
        const endDateTime = new Date(`${endDate}T${endTime}`);
        
        if (endDateTime <= startDateTime) {
          return 'End time must be after start time';
        }
      }
    } else if (eventType === 'all-day') {
      if (!formData.startDate) {
        return 'Start date is required for all-day events';
      }
      
      // If end date is provided, validate it's not before start
      if (formData.endDate) {
        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);
        
        if (endDate < startDate) {
          return 'End date cannot be before start date';
        }
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.pubkey) {
      alert('Please log in to create events');
      return;
    }

    if (!formData.title.trim()) {
      alert('Event title is required');
      return;
    }

    // Validate date/time
    const validationError = validateDateTime();
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      let start: string | number;
      let end: string | number;

      if (eventType === 'all-day') {
        // Date-based events use YYYY-MM-DD strings
        start = formData.startDate;
        end = formData.endDate || formData.startDate;
      } else {
        // Time-based events use unix timestamps (numbers)
        const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
        const endDateTime = formData.endDate && formData.endTime
          ? new Date(`${formData.endDate}T${formData.endTime}`)
          : new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour

        start = Math.floor(startDateTime.getTime() / 1000);
        end = Math.floor(endDateTime.getTime() / 1000);
      }

      if (formData.isPrivate) {
        // Use private event publishing
        if (eventType === 'all-day') {
          await publishPrivateDateEvent({
            title: formData.title,
            description: formData.description || undefined,
            summary: formData.summary || undefined,
            image: formData.image || undefined,
            start: start as string, // ISO 8601 date string (YYYY-MM-DD) for kind 31922
            end: end as string,
            locations: formData.locations.length > 0 ? formData.locations : undefined,
            geohash: formData.geohash || undefined,
            hashtags: formData.hashtags.length > 0 ? formData.hashtags : undefined,
            references: formData.references.length > 0 ? formData.references : undefined,
            participants: formData.participants, // backwards compatibility
            participantsWithMetadata: formData.participantsWithRoles.length > 0 ? formData.participantsWithRoles : undefined
          });
        } else {
          await publishPrivateTimeEvent({
            title: formData.title,
            description: formData.description || undefined,
            summary: formData.summary || undefined,
            image: formData.image || undefined,
            start: start as number, // Already a number for timed events
            end: end as number,
            locations: formData.locations.length > 0 ? formData.locations : undefined,
            geohash: formData.geohash || undefined,
            timezone: formData.timezone,
            endTimezone: formData.endTimezone || undefined,
            hashtags: formData.hashtags.length > 0 ? formData.hashtags : undefined,
            references: formData.references.length > 0 ? formData.references : undefined,
            participants: formData.participants, // backwards compatibility
            participantsWithMetadata: formData.participantsWithRoles.length > 0 ? formData.participantsWithRoles : undefined
          });
        }
        
        // Create busy slot for private events if enabled and this is a timed event
        if (formData.createBusySlot && eventType === 'timed') {
          try {
            await publishEvent.mutateAsync({
              kind: 31927,
              title: '', // Busy slots don't need titles
              start: start as number, // Unix timestamp for busy slots
              end: end as number,
              description: '', // Keep busy slots private - no details
              isPrivate: false // Busy slots are always public so others can see availability
            });
          } catch (busySlotError) {
            console.error('Failed to create busy slot for private event:', busySlotError);
            // Don't fail the entire operation if busy slot creation fails
          }
        }
      } else {
        // Use public event publishing
        await publishEvent.mutateAsync({
          kind: eventType === 'all-day' ? 31922 : 31923,
          title: formData.title,
          summary: formData.summary || undefined,
          image: formData.image || undefined,
          start,
          end,
          locations: formData.locations.length > 0 ? formData.locations : undefined,
          geohash: formData.geohash || undefined,
          description: formData.description || undefined,
          timezone: eventType === 'timed' ? formData.timezone : undefined,
          endTimezone: (eventType === 'timed' && formData.endTimezone) ? formData.endTimezone : undefined,
          hashtags: formData.hashtags.length > 0 ? formData.hashtags : undefined,
          references: formData.references.length > 0 ? formData.references : undefined,
          participants: formData.participants.length > 0 ? formData.participants : undefined, // backwards compatibility
          participantsWithMetadata: formData.participantsWithRoles.length > 0 ? formData.participantsWithRoles : undefined,
          isPrivate: false
        });
      }

      navigate('/calendar');
    } catch (error) {
      console.error('Failed to create event:', error);
      alert('Failed to create event. Please try again.');
    }
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create New Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Type */}
            <Tabs value={eventType} onValueChange={(value) => setEventType(value as 'timed' | 'all-day')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="timed" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timed Event
                </TabsTrigger>
                <TabsTrigger value="all-day" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  All-Day Event
                </TabsTrigger>
              </TabsList>

              {/* ICS Import */}
              <div className="space-y-4 mt-6">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Import from ICS file</Label>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload a calendar file (.ics) to automatically fill in event details
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".ics"
                      onChange={handleICSImport}
                      className="hidden"
                      id="ics-import"
                      disabled={isImporting}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('ics-import')?.click()}
                      disabled={isImporting}
                      className="flex items-center gap-2"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Choose ICS File
                        </>
                      )}
                    </Button>
                  </div>
                  {importError && (
                    <div className="mt-2 text-sm text-destructive">
                      {importError}
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter event title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Summary</Label>
                  <Input
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => handleInputChange('summary', e.target.value)}
                    placeholder="Brief description of the event"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter detailed event description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Event Image</Label>
                  <div className="space-y-2">
                    <Input
                      id="image"
                      type="url"
                      value={formData.image}
                      onChange={(e) => handleInputChange('image', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const [[_, url]] = await uploadFile(file);
                              handleInputChange('image', url);
                            } catch (error) {
                              console.error('Failed to upload image:', error);
                              alert('Failed to upload image. Please check your Blossom server settings or use a direct image URL.');
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => document.getElementById('image-upload')?.click()}
                        className="flex items-center gap-2"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload Image
                          </>
                        )}
                      </Button>
                      {formData.image && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleInputChange('image', '')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {formData.image && (
                      <div className="mt-2">
                        <img 
                          src={formData.image} 
                          alt="Event preview" 
                          className="max-h-32 rounded-md object-cover"
                          onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Locations */}
                <div className="space-y-2">
                  <Label>Locations</Label>
                  <div className="flex gap-2">
                    <Input
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Add location or URL"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addLocation}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {formData.locations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.locations.map(location => (
                        <Badge key={location} variant="secondary" className="flex items-center gap-1">
                          📍 {location.length > 30 ? `${location.substring(0, 30)}...` : location}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => removeLocation(location)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="geohash">Geohash (optional)</Label>
                  <Input
                    id="geohash"
                    value={formData.geohash}
                    onChange={(e) => handleInputChange('geohash', e.target.value)}
                    placeholder="Enter geohash for location (e.g., 9q8yy)"
                  />
                </div>
              </div>

              {/* Date/Time Configuration */}
              <TabsContent value="timed" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date *</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time *</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-timezone">Start Timezone</Label>
                    <Select value={formData.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map(tz => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="end-timezone">End Timezone</Label>
                    <Select value={formData.endTimezone || formData.timezone} onValueChange={(value) => handleInputChange('endTimezone', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Same as start" />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map(tz => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="all-day" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="all-day-start">Start Date *</Label>
                    <Input
                      id="all-day-start"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="all-day-end">End Date</Label>
                    <Input
                      id="all-day-end"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Participants */}
            <div className="space-y-4">
              <Label>Participants</Label>
              
              {/* Participant Input */}
              <div className="space-y-2">
                <Input
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  placeholder="Enter participant pubkey (npub or hex)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={participantRelayInput}
                    onChange={(e) => setParticipantRelayInput(e.target.value)}
                    placeholder="Relay URL (optional)"
                  />
                  <Select value={participantRoleInput} onValueChange={setParticipantRoleInput}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="participant">Participant</SelectItem>
                      <SelectItem value="organizer">Organizer</SelectItem>
                      <SelectItem value="required">Required</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                      <SelectItem value="speaker">Speaker</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addParticipant} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Participant
                </Button>
              </div>
              
              {/* Participant List */}
              {formData.participantsWithRoles.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Added Participants:</Label>
                  <div className="space-y-2">
                    {formData.participantsWithRoles.map(participant => (
                      <div key={participant.pubkey} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="font-mono text-sm">{participant.pubkey.substring(0, 16)}...</span>
                            <Badge variant="outline" className="text-xs">{participant.role}</Badge>
                          </div>
                          {participant.relayUrl && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Relay: {participant.relayUrl}
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParticipant(participant.pubkey)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <Label>Hashtags</Label>
              <div className="flex gap-2">
                <Input
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  placeholder="Enter hashtag (without #)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addHashtag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.hashtags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      #{tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeHashtag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* References */}
            <div className="space-y-2">
              <Label>References & Links</Label>
              <div className="flex gap-2">
                <Input
                  value={referenceInput}
                  onChange={(e) => setReferenceInput(e.target.value)}
                  placeholder="Enter URL or reference"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addReference())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addReference}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {formData.references.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.references.map(ref => (
                    <Badge key={ref} variant="secondary" className="flex items-center gap-1">
                      <span className="max-w-32 truncate">{ref}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeReference(ref)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="private-event"
                    checked={formData.isPrivate}
                    onCheckedChange={(checked) => handleInputChange('isPrivate', checked)}
                  />
                  <Label htmlFor="private-event">Private Event</Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Private events are encrypted and only visible to participants
                </p>
              </div>
              
              {formData.isPrivate && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="create-busy-slot"
                      checked={formData.createBusySlot}
                      onCheckedChange={(checked) => handleInputChange('createBusySlot', checked)}
                    />
                    <Label htmlFor="create-busy-slot">Create busy slot</Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Creates a public availability block so others can't book this time slot (no event details shared)
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate('/calendar')}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={publishEvent.isPending || isPublishingPrivate}
              >
                {(publishEvent.isPending || isPublishingPrivate) ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}