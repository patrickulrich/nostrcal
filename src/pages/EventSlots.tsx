import { useState, useEffect, useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCreateAvailabilityTemplate, useDeleteCalendarEvent } from '@/hooks/useCalendarPublish';
import { useUserCalendars } from '@/hooks/useCalendarEvents';
import { nip19 } from 'nostr-tools';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  CalendarCheck, 
  Clock, 
  MapPin, 
  Plus,
  Edit,
  Trash2,
  Link,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface AvailabilityTemplate {
  id: string;
  dTag: string;
  title: string;
  description?: string;
  duration: number;
  buffer: number;
  bufferAfter?: number;
  interval: number;
  timezone: string;
  location?: string;
  calendarRef?: string;
  availability: {
    [day: string]: { start: string; end: string }[];
  };
  amount?: number;
  minNotice?: number;
  maxAdvance?: number;
  maxAdvanceBusiness?: boolean;
  pubkey: string;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface DayAvailability {
  [day: string]: TimeSlot[];
}

const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const DAY_NAMES = {
  'MO': 'Monday',
  'TU': 'Tuesday',
  'WE': 'Wednesday',
  'TH': 'Thursday',
  'FR': 'Friday',
  'SA': 'Saturday',
  'SU': 'Sunday'
};

export default function EventSlots() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const createTemplate = useCreateAvailabilityTemplate();
  const deleteEvent = useDeleteCalendarEvent();
  const { data: userCalendars } = useUserCalendars();
  
  const [templates, setTemplates] = useState<AvailabilityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AvailabilityTemplate | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    duration: 30,
    buffer: 0,
    bufferAfter: 0,
    interval: 30,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    calendarRef: '',
    amount: 0,
    minNotice: 0,
    maxAdvance: 0,
    maxAdvanceBusiness: false,
    availability: {} as DayAvailability
  });

  const loadTemplates = useCallback(async () => {
    if (!user?.pubkey) return;

    try {
      setLoading(true);
      const signal = AbortSignal.timeout(5000);
      
      const events = await nostr.query([{
        kinds: [31926],
        authors: [user.pubkey],
        limit: 50
      }], { signal });

      const parsedTemplates = events.map(event => {
        const tags = event.tags;
        const availability: DayAvailability = {};
        
        // Parse schedule tags
        tags.filter(t => t[0] === 'sch').forEach(t => {
          const [, day, start, end] = t;
          if (!availability[day]) {
            availability[day] = [];
          }
          availability[day].push({ start, end });
        });

        // Helper function to parse ISO-8601 duration/period to minutes
        const parseDuration = (durationStr: string): number => {
          if (!durationStr) return 30; // default
          
          // Handle ISO-8601 period format for days (P30D) - used by min_notice and max_advance
          if (durationStr.startsWith('P') && durationStr.endsWith('D')) {
            const days = parseInt(durationStr.slice(1, -1));
            return isNaN(days) ? 30 : days * 1440; // Convert days to minutes
          }
          // Handle ISO-8601 duration format for minutes (PT30M) - used by duration, interval, buffers
          else if (durationStr.startsWith('PT') && durationStr.endsWith('M')) {
            const minutes = parseInt(durationStr.slice(2, -1));
            return isNaN(minutes) ? 30 : minutes;
          } 
          // Handle legacy numeric format (30)
          else {
            const minutes = parseInt(durationStr);
            return isNaN(minutes) ? 30 : minutes;
          }
        };

        const duration = parseDuration(tags.find(t => t[0] === 'duration')?.[1] || '');
        
        return {
          id: event.id,
          dTag: tags.find(t => t[0] === 'd')?.[1] || '',
          title: tags.find(t => t[0] === 'title')?.[1] || 'Untitled',
          description: tags.find(t => t[0] === 'summary')?.[1] || event.content,
          duration: duration,
          buffer: parseDuration(tags.find(t => t[0] === 'buffer_before')?.[1] || tags.find(t => t[0] === 'buffer')?.[1] || ''), // Support both new and legacy formats
          bufferAfter: parseDuration(tags.find(t => t[0] === 'buffer_after')?.[1] || ''),
          interval: parseDuration(tags.find(t => t[0] === 'interval')?.[1] || '') || duration, // Default to duration if no interval
          timezone: tags.find(t => t[0] === 'tzid')?.[1] || tags.find(t => t[0] === 'timezone')?.[1] || 'UTC', // Support both new and legacy formats
          location: tags.find(t => t[0] === 'location')?.[1],
          calendarRef: tags.find(t => t[0] === 'a')?.[1],
          availability,
          amount: tags.find(t => t[0] === 'amount')?.[1] 
            ? parseInt(tags.find(t => t[0] === 'amount')?.[1] || '0') : undefined,
          minNotice: parseDuration(tags.find(t => t[0] === 'min_notice')?.[1] || ''),
          maxAdvance: parseDuration(tags.find(t => t[0] === 'max_advance')?.[1] || ''),
          maxAdvanceBusiness: tags.find(t => t[0] === 'max_advance_business')?.[1] === 'true',
          pubkey: event.pubkey
        };
      });

      setTemplates(parsedTemplates);
    } catch (err) {
      console.error('Failed to load templates:', err);
      toast({
        title: "Error",
        description: "Failed to load availability templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.pubkey, nostr, toast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      location: '',
      duration: 30,
      buffer: 0,
      bufferAfter: 0,
      interval: 30,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      calendarRef: '',
      amount: 0,
      minNotice: 0,
      maxAdvance: 0,
      maxAdvanceBusiness: false,
      availability: {}
    });
  };

  const handleEdit = (template: AvailabilityTemplate) => {
    setFormData({
      title: template.title,
      description: template.description || '',
      location: template.location || '',
      duration: template.duration,
      buffer: template.buffer,
      bufferAfter: template.bufferAfter || 0,
      interval: template.interval || template.duration,
      timezone: template.timezone,
      calendarRef: template.calendarRef || '',
      amount: template.amount || 0,
      minNotice: template.minNotice || 0,
      maxAdvance: template.maxAdvance || 0, // Keep in minutes for internal storage
      maxAdvanceBusiness: template.maxAdvanceBusiness || false,
      availability: template.availability
    });
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive"
      });
      return;
    }

    if (Object.keys(formData.availability).length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one availability slot",
        variant: "destructive"
      });
      return;
    }

    try {
      await createTemplate.mutateAsync({
        title: formData.title,
        description: formData.description,
        availability: formData.availability,
        duration: formData.duration,
        buffer: formData.buffer,
        bufferAfter: formData.bufferAfter,
        interval: formData.interval,
        timezone: formData.timezone,
        calendarRef: formData.calendarRef || undefined,
        minNotice: formData.minNotice,
        maxAdvance: formData.maxAdvance,
        maxAdvanceBusiness: formData.maxAdvanceBusiness,
        amount: formData.amount,
        dTag: editingTemplate?.dTag // Pass existing dTag when editing
      });

      toast({
        title: "Success",
        description: editingTemplate ? "Template updated" : "Template created",
      });

      setShowCreateModal(false);
      resetForm();
      setEditingTemplate(null);
      loadTemplates();
    } catch (err) {
      console.error('Failed to save template:', err);
      
      // Check if this is a Lightning setup error
      const errorMessage = err instanceof Error ? err.message : 'Failed to save template';
      const isLightningError = errorMessage.includes('Lightning payment setup required');
      
      toast({
        title: isLightningError ? "Lightning Setup Required" : "Error",
        description: isLightningError ? errorMessage : "Failed to save template",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (templateId: string) => {
    setDeleting(templateId);
    
    try {
      await deleteEvent.mutateAsync(templateId);
      
      toast({
        title: "Success",
        description: "Template deleted",
      });
      
      loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  const copyBookingLink = (template: AvailabilityTemplate) => {
    const naddr = nip19.naddrEncode({
      kind: 31926,
      pubkey: template.pubkey,
      identifier: template.dTag || '',
      relays: []
    });
    
    const url = `${window.location.origin}/booking/${naddr}`;
    navigator.clipboard.writeText(url);
    
    toast({
      title: "Link Copied",
      description: "Booking link copied to clipboard",
    });
  };

  const addTimeSlot = (day: string) => {
    const newSlot = { start: '09:00', end: '17:00' };
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: [...(prev.availability[day] || []), newSlot]
      }
    }));
  };

  const removeTimeSlot = (day: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: prev.availability[day].filter((_, i) => i !== index)
      }
    }));
  };

  const updateTimeSlot = (day: string, index: number, field: 'start' | 'end', value: string) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: prev.availability[day].map((slot, i) => 
          i === index ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Login Required</h2>
              <p className="text-muted-foreground">Please log in to manage availability templates</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-48 mt-2" />
                  </CardContent>
                </Card>
              ))}
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Availability Templates</CardTitle>
              <CardDescription>
                Create booking templates for others to schedule time with you
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <CalendarCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first availability template to let others book time with you
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {templates.map(template => (
                <Card key={template.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{template.title}</h3>
                          <Badge variant="secondary">
                            {template.duration} min
                          </Badge>
                          {template.amount && template.amount > 0 && (
                            <Badge variant="outline" className="gap-1">
                              <DollarSign className="h-3 w-3" />
                              {template.amount} sats
                            </Badge>
                          )}
                        </div>
                        
                        {template.description && (
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{template.duration}min slots</span>
                            {template.buffer > 0 && (
                              <span>+ {template.buffer}min buffer</span>
                            )}
                          </div>
                          
                          {template.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{template.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {Object.entries(template.availability).map(([day, _slots]) => (
                            <Badge key={day} variant="outline" className="text-xs">
                              {DAY_NAMES[day as keyof typeof DAY_NAMES]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyBookingLink(template)}
                        >
                          <Link className="h-4 w-4 mr-1" />
                          Copy Link
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(template.id)}
                          disabled={deleting === template.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          resetForm();
          setEditingTemplate(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Availability Template' : 'Create Availability Template'}
            </DialogTitle>
            <DialogDescription>
              Set up your availability for others to book time with you
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Template Name *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., 30 Minute Meeting"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this booking type"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Zoom, Conference Room, Phone"
                />
              </div>
            </div>

            {/* Duration Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="480"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="interval">Interval (minutes)</Label>
                <Input
                  id="interval"
                  type="number"
                  min="5"
                  max="480"
                  value={formData.interval}
                  onChange={(e) => setFormData(prev => ({ ...prev, interval: parseInt(e.target.value) || 30 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buffer">Buffer Before (minutes)</Label>
                <Input
                  id="buffer"
                  type="number"
                  min="0"
                  max="60"
                  value={formData.buffer}
                  onChange={(e) => setFormData(prev => ({ ...prev, buffer: parseInt(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bufferAfter">Buffer After (minutes)</Label>
                <Input
                  id="bufferAfter"
                  type="number"
                  min="0"
                  max="60"
                  value={formData.bufferAfter}
                  onChange={(e) => setFormData(prev => ({ ...prev, bufferAfter: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minNotice">Minimum Notice (minutes)</Label>
                <Input
                  id="minNotice"
                  type="number"
                  min="0"
                  max="10080"
                  value={formData.minNotice}
                  onChange={(e) => setFormData(prev => ({ ...prev, minNotice: parseInt(e.target.value) || 0 }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxAdvance">Maximum Advance (days)</Label>
                <Input
                  id="maxAdvance"
                  type="number"
                  min="0"
                  max="365"
                  value={formData.maxAdvance ? Math.floor(formData.maxAdvance / 1440) : 0}
                  onChange={(e) => {
                    const days = parseInt(e.target.value) || 0;
                    const minutes = days * 1440;
                    setFormData(prev => ({ ...prev, maxAdvance: minutes }));
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (satoshis)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                  placeholder="0 for free, > 0 for paid"
                />
                <p className="text-xs text-muted-foreground">
                  Paid templates require Lightning Address (lud16) or LNURL (lud06) in your profile
                </p>
              </div>
              
              <div className="space-y-2 flex items-center">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.maxAdvanceBusiness}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxAdvanceBusiness: e.target.checked }))}
                  />
                  <span>Count business days only</span>
                </label>
              </div>
            </div>

            {/* Calendar Assignment */}
            {userCalendars && userCalendars.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="calendar">Calendar (optional)</Label>
                <Select 
                  value={formData.calendarRef || 'none'} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, calendarRef: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No calendar</SelectItem>
                    {userCalendars.map(cal => (
                      <SelectItem key={cal.id} value={`31924:${user.pubkey}:${cal.id}`}>
                        {cal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Availability Schedule */}
            <div className="space-y-2">
              <Label>Weekly Availability</Label>
              <div className="space-y-2">
                {DAYS.map(day => (
                  <div key={day} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{DAY_NAMES[day as keyof typeof DAY_NAMES]}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addTimeSlot(day)}
                      >
                        <Plus className="h-4 w-4" />
                        Add Time
                      </Button>
                    </div>
                    
                    {formData.availability[day]?.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateTimeSlot(day, index, 'start', e.target.value)}
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateTimeSlot(day, index, 'end', e.target.value)}
                          className="w-32"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTimeSlot(day, index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {!formData.availability[day]?.length && (
                      <p className="text-sm text-muted-foreground">No availability</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
                setEditingTemplate(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createTemplate.isPending}
            >
              {createTemplate.isPending ? 'Saving...' : (editingTemplate ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}