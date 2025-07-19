import React, { useState } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { useUserCalendars } from '@/hooks/useCalendarEvents';
import { useCreateCalendar } from '@/hooks/useCalendarPublish';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, EyeOff } from 'lucide-react';

interface CreateCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateCalendarModal({ open, onOpenChange }: CreateCalendarModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createCalendar = useCreateCalendar();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createCalendar.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      
      setName('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create calendar:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Calendar</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="calendar-name">Calendar Name</Label>
            <Input
              id="calendar-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter calendar name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="calendar-description">Description (optional)</Label>
            <Input
              id="calendar-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter calendar description"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCalendar.isPending}>
              {createCalendar.isPending ? 'Creating...' : 'Create Calendar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarList() {
  const { 
    eventFilters, 
    toggleEventFilter, 
    visibleCalendars, 
    toggleCalendarVisibility,
    calendars,
    setCalendars,
    dayEvents,
    timeEvents,
    rsvpEvents,
    bookingBlocks,
    privateDayEvents,
    privateTimeEvents,
    privateRsvps
  } = useEvents();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: userCalendars, isLoading } = useUserCalendars();

  // Update calendars when data loads
  React.useEffect(() => {
    if (userCalendars) {
      setCalendars(userCalendars);
    }
  }, [userCalendars, setCalendars]);

  const getEventTypeCount = (type: keyof typeof eventFilters) => {
    switch (type) {
      case 'dayEvents':
        return dayEvents.length;
      case 'timeEvents':
        return timeEvents.length;
      case 'rsvpEvents':
        return rsvpEvents.length;
      case 'bookingBlocks':
        return bookingBlocks.length;
      case 'privateDayEvents':
        return privateDayEvents.length;
      case 'privateTimeEvents':
        return privateTimeEvents.length;
      case 'privateRsvps':
        return privateRsvps.length;
      default:
        return 0;
    }
  };

  const eventTypeLabels = {
    dayEvents: 'All-Day Events',
    timeEvents: 'Timed Events',
    rsvpEvents: 'RSVPs',
    bookingBlocks: 'Booking Blocks',
    privateDayEvents: 'Private All-Day',
    privateTimeEvents: 'Private Timed',
    privateRsvps: 'Private RSVPs'
  };

  const eventTypeColors = {
    dayEvents: '#4285f4',
    timeEvents: '#34a853',
    rsvpEvents: '#fbbc04',
    bookingBlocks: '#ea4335',
    privateDayEvents: '#9c27b0',
    privateTimeEvents: '#673ab7',
    privateRsvps: '#3f51b5'
  };

  return (
    <div className="space-y-4">
      {/* User Calendars */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">My Calendars</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading calendars...</div>
          ) : calendars.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No calendars yet. Create your first calendar to organize your events.
            </div>
          ) : (
            <div className="space-y-3">
              {calendars.map((calendar) => {
                const isVisible = visibleCalendars.has(calendar.id);
                const eventCount = calendar.eventReferences?.length || 0;
                
                return (
                  <div key={calendar.id} className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCalendarVisibility(calendar.id)}
                      className="h-8 w-8 p-0"
                    >
                      {isVisible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <div className="flex items-center space-x-2 flex-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: calendar.color }}
                      />
                      <span className="text-sm font-medium">{calendar.name}</span>
                    </div>
                    
                    <Badge variant="outline" className="text-xs">
                      {eventCount}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Type Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Event Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(eventFilters).filter(([type]) => type !== 'bookingBlocks').map(([type, enabled]) => {
            const count = getEventTypeCount(type as keyof typeof eventFilters);
            const label = eventTypeLabels[type as keyof typeof eventTypeLabels];
            const color = eventTypeColors[type as keyof typeof eventTypeColors];
            
            return (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={enabled}
                  onCheckedChange={() => toggleEventFilter(type as keyof typeof eventFilters)}
                />
                <div className="flex items-center space-x-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <Label htmlFor={type} className="text-sm font-normal cursor-pointer">
                    {label}
                  </Label>
                </div>
                <Badge variant="outline" className="text-xs">
                  {count}
                </Badge>
              </div>
            );
          })}
          
          {/* Booking Blocks moved to bottom */}
          {(() => {
            const type = 'bookingBlocks';
            const enabled = eventFilters[type];
            const count = getEventTypeCount(type);
            const label = eventTypeLabels[type];
            const color = eventTypeColors[type];
            
            return (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={enabled}
                  onCheckedChange={() => toggleEventFilter(type)}
                />
                <div className="flex items-center space-x-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <Label htmlFor={type} className="text-sm font-normal cursor-pointer">
                    {label}
                  </Label>
                </div>
                <Badge variant="outline" className="text-xs">
                  {count}
                </Badge>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <CreateCalendarModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
}