import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Settings, Lock, BookOpen, Globe } from 'lucide-react';

const Index = () => {
  useSeoMeta({
    title: 'NostrCal - Decentralized Calendar',
    description: 'A decentralized calendar application built on Nostr protocol with React, TailwindCSS, and Nostrify.',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Calendar className="h-12 w-12 text-indigo-600" />
              <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                NostrCal
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
              Decentralized Calendar on Nostr
            </p>
          </div>

          {/* Main Action */}
          <div className="text-center mb-12">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/calendar">
                <Calendar className="h-5 w-5 mr-2" />
                Open Calendar
              </Link>
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  Calendar Views
                </CardTitle>
                <CardDescription>
                  Day, week, and month views with intuitive navigation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create and manage events with support for both all-day and timed events.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Decentralized
                </CardTitle>
                <CardDescription>
                  Built on Nostr protocol for true decentralization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your data is stored on the Nostr network, not controlled by any central authority.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-indigo-600" />
                  NIP-52 Compliant
                </CardTitle>
                <CardDescription>
                  Follows Nostr calendar event standards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Supports all NIP-52 calendar event types including RSVPs and availability.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-indigo-600" />
                  Private Events
                </CardTitle>
                <CardDescription>
                  End-to-end encrypted events for sensitive information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create private events using NIP-59 gift wrapping with participant-only visibility and encrypted content.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  Booking System
                </CardTitle>
                <CardDescription>
                  Share availability and accept bookings from others
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create availability templates, share booking links, and manage incoming requests with zap payments.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-indigo-600" />
                  Public Events
                </CardTitle>
                <CardDescription>
                  Discover and share events with the Nostr community
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Browse public events, RSVP to community gatherings, and share your events across the network.
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Index;
