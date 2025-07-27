import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { LoginArea } from '@/components/auth/LoginArea';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  Calendar, 
  Plus, 
  Users, 
  Settings, 
  Menu,
  Home,
  BookmarkCheck,
  Clock
} from 'lucide-react';

const navigationItems = [
  {
    title: 'Home',
    href: '/',
    icon: Home,
    description: 'Welcome page and overview'
  },
  {
    title: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    description: 'View and manage your calendar events'
  },
  {
    title: 'Events',
    href: '/events',
    icon: Users,
    description: 'Discover public events'
  },
  {
    title: 'Bookings',
    href: '/booking',
    icon: BookmarkCheck,
    description: 'Manage booking requests',
    requiresAuth: true
  },
  {
    title: 'Event Slots',
    href: '/event-slots',
    icon: Clock,
    description: 'Manage availability templates',
    requiresAuth: true
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Configure your preferences',
    requiresAuth: true
  }
];

export function SiteHeader() {
  const { user } = useCurrentUser();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActivePage = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const filteredNavItems = navigationItems.filter(item => 
    !item.requiresAuth || user
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Calendar className="h-6 w-6 text-indigo-600" />
            <span className="font-bold text-xl">NostrCal</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {filteredNavItems.map((item) => (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink asChild>
                  <Link
                    to={item.href}
                    className={`group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50 ${
                      isActivePage(item.href) ? 'bg-accent text-accent-foreground' : ''
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.title}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Create Event Button */}
          {user && (
            <Button asChild size="sm" className="hidden sm:flex">
              <Link to="/new-event">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Link>
            </Button>
          )}

          {/* Login Area */}
          <LoginArea className="hidden sm:flex" />

          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  NostrCal
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                {/* Mobile Login Area */}
                <div className="pb-4 border-b">
                  <LoginArea className="w-full" />
                </div>

                {/* Mobile Navigation */}
                <nav className="space-y-1">
                  {filteredNavItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                        isActivePage(item.href) ? 'bg-accent text-accent-foreground' : ''
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{item.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                    </Link>
                  ))}
                </nav>

                {/* Mobile Create Event Button */}
                {user && (
                  <div className="pt-4 border-t">
                    <Button asChild className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                      <Link to="/new-event">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Event
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;