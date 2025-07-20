import React, { useState } from 'react';
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
  Menu,
  Calendar as CalendarIcon
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEvents } from '@/hooks/useEvents';
import { exportEventsAsICS } from '@/utils/icsExporter';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Shorter date format for mobile
  const formatMobileDate = () => {
    if (view === 'month') {
      return currentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });
    } else if (view === 'week') {
      const weekStart = new Date(currentDate);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day;
      weekStart.setDate(diff);
      
      return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      });
    }
  };

  return (
    <div className="border-b bg-background">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-2 sm:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <div className="space-y-6 py-4">
              <MiniCalendar />
              <CalendarList />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={navigatePrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium min-w-[120px] text-center">
            {formatMobileDate()}
          </span>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={navigateNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportVisibleEvents}>
              Export Current {view}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportAllEvents}>
              Export All Events
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile View Selector */}
      <div className="flex sm:hidden border-t px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={navigateToToday}
          className="mr-auto"
        >
          <Home className="h-3 w-3 mr-1" />
          Today
        </Button>
        
        <div className="flex gap-1">
          <Button
            variant={view === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCalendarView('day')}
            className="px-2 h-7 text-xs"
          >
            Day
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCalendarView('week')}
            className="px-2 h-7 text-xs"
          >
            Week
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCalendarView('month')}
            className="px-2 h-7 text-xs"
          >
            Month
          </Button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden sm:flex items-center justify-between p-4">
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
              <span className="ml-1">Today</span>
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
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportVisibleEvents}>
                <CalendarIcon className="h-4 w-4 mr-2" />
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
    </div>
  );
}

export default function CalendarPage() {
  return (
    <div className="h-full flex flex-col">
      <CalendarControls />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-80 border-r bg-background overflow-y-auto">
          <div className="p-4 space-y-6">
            <MiniCalendar />
            <CalendarList />
          </div>
        </div>

        {/* Main Calendar - Full width on mobile */}
        <div className="flex-1 overflow-hidden">
          <EnhancedCalendarView />
        </div>
      </div>
    </div>
  );
}