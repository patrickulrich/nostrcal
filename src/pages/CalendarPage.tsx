import React from 'react';
import { useCalendar } from '@/hooks/useCalendar';
import { Button } from '@/components/ui/button';
import EnhancedCalendarView from '@/components/EnhancedCalendarView';
import MiniCalendar from '@/components/MiniCalendar';
import CalendarList from '@/components/CalendarList';
import { 
  ChevronLeft, 
  ChevronRight, 
  Home,
  Download,
  MoreHorizontal
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEvents } from '@/hooks/useEvents';
import { exportEventsAsICS } from '@/utils/icsExporter';

function CalendarControls() {
  const { 
    currentDate, 
    view, 
    setCalendarView, 
    navigateNext, 
    navigatePrevious, 
    navigateToToday 
  } = useCalendar();
  const { getFilteredEvents } = useEvents();

  const handleExportAllEvents = () => {
    const events = getFilteredEvents();
    if (events.length === 0) {
      alert('No events to export');
      return;
    }
    
    exportEventsAsICS(
      events,
      'NostrCal Events',
      `nostrcal-events-${new Date().toISOString().split('T')[0]}.ics`
    );
  };

  const handleExportVisibleEvents = () => {
    const events = getFilteredEvents();
    
    // Filter events based on current view and date range
    const filteredEvents = events.filter(event => {
      if (!event.start) return false;
      
      let eventDate: Date;
      if (event.kind === 31922) {
        // Date-based event
        eventDate = new Date(event.start);
      } else {
        // Time-based event
        eventDate = new Date(parseInt(event.start) * 1000);
      }
      
      if (view === 'day') {
        const today = currentDate.toISOString().split('T')[0];
        const eventDateStr = eventDate.toISOString().split('T')[0];
        return eventDateStr === today;
      } else if (view === 'week') {
        const weekStart = new Date(currentDate);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day;
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        return eventDate >= weekStart && eventDate <= weekEnd;
      } else if (view === 'month') {
        return eventDate.getMonth() === currentDate.getMonth() && 
               eventDate.getFullYear() === currentDate.getFullYear();
      }
      
      return true;
    });
    
    if (filteredEvents.length === 0) {
      alert(`No events found for the current ${view}`);
      return;
    }
    
    const viewName = view.charAt(0).toUpperCase() + view.slice(1);
    exportEventsAsICS(
      filteredEvents,
      `NostrCal ${viewName} Events`,
      `nostrcal-${view}-${new Date().toISOString().split('T')[0]}.ics`
    );
  };

  const formatHeaderDate = () => {
    if (view === 'month') {
      return currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
    } else if (view === 'week') {
      const weekStart = new Date(currentDate);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day;
      weekStart.setDate(diff);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()}-${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      } else {
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${weekStart.getFullYear()}`;
      }
    } else {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric' 
      });
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={navigatePrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={navigateToToday}
          >
            <Home className="h-4 w-4" />
            Today
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={navigateNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <h1 className="text-xl font-semibold">
          {formatHeaderDate()}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportVisibleEvents}>
              <Download className="h-4 w-4 mr-2" />
              Export Current {view.charAt(0).toUpperCase() + view.slice(1)}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportAllEvents}>
              <Download className="h-4 w-4 mr-2" />
              Export All Events
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View selector */}
        <div className="flex items-center border rounded-lg">
          <Button
            variant={view === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCalendarView('day')}
            className="rounded-r-none"
          >
            Day
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCalendarView('week')}
            className="rounded-none"
          >
            Week
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCalendarView('month')}
            className="rounded-l-none"
          >
            Month
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <div className="h-full flex flex-col">
      <CalendarControls />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r bg-background overflow-y-auto">
          <div className="p-4 space-y-6">
            <MiniCalendar />
            <CalendarList />
          </div>
        </div>

        {/* Main Calendar */}
        <div className="flex-1 overflow-hidden">
          <EnhancedCalendarView />
        </div>
      </div>
    </div>
  );
}