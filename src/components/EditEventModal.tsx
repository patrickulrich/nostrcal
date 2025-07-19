import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '@/contexts/EventsContextTypes';
import { useCalendarPublish } from '@/hooks/useCalendarPublish';
import { usePrivateCalendarPublish } from '@/hooks/usePrivateCalendarPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2, Upload } from 'lucide-react';

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEventUpdated?: () => void;
}

interface EventFormData {
  title: string;
  description: string;
  summary: string;
  image: string;
  location: string;
  geohash: string;
  timezone: string;
  endTimezone: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  participants: string[];
  hashtags: string[];
  references: string[];
  isPrivate: boolean;
}

export function EditEventModal({ isOpen, onClose, event, onEventUpdated }: EditEventModalProps) {
  const publishEvent = useCalendarPublish();
  const { publishPrivateDateEvent, publishPrivateTimeEvent, isPublishing: isPublishingPrivate } = usePrivateCalendarPublish();
  const uploadFileHook = useUploadFile();
  const uploadFile = uploadFileHook.mutateAsync;
  const isUploading = uploadFileHook.isPending;

  const [eventType, setEventType] = useState<'timed' | 'all-day'>('timed');
  const [participantInput, setParticipantInput] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [referenceInput, setReferenceInput] = useState('');
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    summary: '',
    image: '',
    location: '',
    geohash: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    endTimezone: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    participants: [],
    hashtags: [],
    references: [],
    isPrivate: false,
  });

  // Populate form with event data when modal opens
  useEffect(() => {
    if (event && isOpen) {
      const isDateEvent = event.kind === 31922;
      const isTimeEvent = event.kind === 31923;
      
      setEventType(isDateEvent ? 'all-day' : 'timed');

      // Parse start/end times based on event type
      let startDate = '';
      let endDate = '';
      let startTime = '';
      let endTime = '';

      if (isDateEvent) {
        // Date events use ISO date format (YYYY-MM-DD)
        startDate = event.start || '';
        endDate = event.end || '';
      } else if (isTimeEvent) {
        // Time events use Unix timestamps
        if (event.start) {
          const startDateTime = new Date(parseInt(event.start) * 1000);
          startDate = startDateTime.toISOString().split('T')[0];
          startTime = startDateTime.toTimeString().slice(0, 5);
        }
        if (event.end) {
          const endDateTime = new Date(parseInt(event.end) * 1000);
          endDate = endDateTime.toISOString().split('T')[0];
          endTime = endDateTime.toTimeString().slice(0, 5);
        }
      }

      setFormData({
        title: event.title || '',
        description: event.description || event.content || '',
        summary: event.summary || '',
        image: event.image || '',
        location: event.location || '',
        geohash: event.geohash || '',
        timezone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        endTimezone: event.endTimezone || '',
        startDate,
        endDate,
        startTime,
        endTime,
        participants: event.participants || [],
        hashtags: event.hashtags || [],
        references: event.references || [],
        // Check if event is from any private source
        isPrivate: event.source === 'private' || 
                  event.source === 'privateDayEvents' ||
                  event.source === 'privateTimeEvents' ||
                  event.source === 'privateRsvps' ||
                  false,
      });
    }
  }, [event, isOpen]);

  const handleInputChange = (field: keyof EventFormData, value: string | boolean) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Auto-set end time to 1 hour after start time for timed events
      if (eventType === 'timed' && (field === 'startTime' || field === 'startDate')) {
        if (newData.startDate && newData.startTime) {
          const startDateTime = new Date(`${newData.startDate}T${newData.startTime}`);
          const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
          
          newData.endDate = newData.startDate;
          newData.endTime = endDateTime.toTimeString().slice(0, 5);
        }
      }
      
      return newData;
    });
  };

  const addParticipant = () => {
    if (participantInput.trim() && !formData.participants.includes(participantInput.trim())) {
      setFormData(prev => ({
        ...prev,
        participants: [...prev.participants, participantInput.trim()]
      }));
      setParticipantInput('');
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

  const _addReference = () => {
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
      participants: prev.participants.filter(p => p !== pubkey)
    }));
  };

  const removeHashtag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(t => t !== tag)
    }));
  };

  const _removeReference = (ref: string) => {
    setFormData(prev => ({
      ...prev,
      references: prev.references.filter(r => r !== ref)
    }));
  };

  const validateDateTime = (): string | null => {
    if (eventType === 'timed') {
      if (!formData.startDate || !formData.startTime) {
        return 'Start date and time are required for timed events';
      }
      
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      
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
    
    if (!event) return;

    if (!formData.title.trim()) {
      alert('Event title is required');
      return;
    }

    const validationError = validateDateTime();
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      let start: string;
      let end: string;

      if (eventType === 'all-day') {
        start = formData.startDate;
        end = formData.endDate || formData.startDate;
      } else {
        const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
        const endDateTime = formData.endDate && formData.endTime
          ? new Date(`${formData.endDate}T${formData.endTime}`)
          : new Date(startDateTime.getTime() + 60 * 60 * 1000);

        start = Math.floor(startDateTime.getTime() / 1000).toString();
        end = Math.floor(endDateTime.getTime() / 1000).toString();
      }

      if (formData.isPrivate) {
        if (eventType === 'all-day') {
          await publishPrivateDateEvent({
            title: formData.title,
            description: formData.description,
            summary: formData.summary || undefined,
            image: formData.image || undefined,
            start,
            end,
            location: formData.location || undefined,
            geohash: formData.geohash || undefined,
            hashtags: formData.hashtags.length > 0 ? formData.hashtags : undefined,
            references: formData.references.length > 0 ? formData.references : undefined,
            participants: formData.participants,
            dTag: event.dTag // Use existing dTag to update the same event
          });
        } else {
          await publishPrivateTimeEvent({
            title: formData.title,
            description: formData.description,
            summary: formData.summary || undefined,
            image: formData.image || undefined,
            start: parseInt(start),
            end: parseInt(end),
            location: formData.location || undefined,
            geohash: formData.geohash || undefined,
            timezone: formData.timezone,
            endTimezone: formData.endTimezone || undefined,
            hashtags: formData.hashtags.length > 0 ? formData.hashtags : undefined,
            references: formData.references.length > 0 ? formData.references : undefined,
            participants: formData.participants,
            dTag: event.dTag // Use existing dTag to update the same event
          });
        }
      } else {
        await publishEvent.mutateAsync({
          kind: eventType === 'all-day' ? 31922 : 31923,
          title: formData.title,
          summary: formData.summary || undefined,
          image: formData.image || undefined,
          start,
          end,
          location: formData.location || undefined,
          geohash: formData.geohash || undefined,
          description: formData.description || undefined,
          timezone: eventType === 'timed' ? formData.timezone : undefined,
          endTimezone: (eventType === 'timed' && formData.endTimezone) ? formData.endTimezone : undefined,
          hashtags: formData.hashtags.length > 0 ? formData.hashtags : undefined,
          references: formData.references.length > 0 ? formData.references : undefined,
          participants: formData.participants.length > 0 ? formData.participants : undefined,
          isPrivate: false,
          dTag: event.dTag // Use existing dTag to update the same event
        });
      }

      onEventUpdated?.();
      onClose();
    } catch (error) {
      console.error('Failed to update event:', error);
      alert('Failed to update event. Please try again.');
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

  const isSubmitting = publishEvent.isPending || isPublishingPrivate || isUploading;

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Type - Read Only */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Event Type</Label>
                  <p className="text-sm text-muted-foreground">
                    {eventType === 'timed' ? 'Timed Event' : 'All-day Event'} • {formData.isPrivate ? 'Private' : 'Public'}
                  </p>
                </div>
                <Badge variant={eventType === 'timed' ? 'default' : 'secondary'}>
                  {eventType === 'timed' ? 'Timed' : 'All-day'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Date/Time Fields - Conditional based on event type */}
          {eventType === 'timed' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={formData.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="endTimezone">End Timezone (optional)</Label>
                  <Select value={formData.endTimezone} onValueChange={(value) => handleInputChange('endTimezone', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Same as start" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDateAllDay">Start Date</Label>
                  <Input
                    id="startDateAllDay"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDateAllDay">End Date (optional)</Label>
                  <Input
                    id="endDateAllDay"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Event title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Event description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="summary">Summary</Label>
                <Input
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => handleInputChange('summary', e.target.value)}
                  placeholder="Brief summary"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Event location"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="image">Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="image"
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
                          alert('Failed to upload image. Please try again.');
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
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div>
            <Label>Participants</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value)}
                placeholder="npub1... or hex pubkey"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
              />
              <Button type="button" onClick={addParticipant} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.participants.map((participant) => (
                <Badge key={participant} variant="secondary" className="flex items-center gap-1">
                  {participant.slice(0, 12)}...
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeParticipant(participant)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <Label>Hashtags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                placeholder="hashtag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())}
              />
              <Button type="button" onClick={addHashtag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.hashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  #{tag}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeHashtag(tag)} />
                </Badge>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}