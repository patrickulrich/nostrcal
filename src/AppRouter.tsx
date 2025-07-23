import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import SiteHeader from "./components/SiteHeader";

import Index from "./pages/Index";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";
import CalendarPage from "./pages/CalendarPage";
import NewEvent from "./pages/NewEvent";
import Booking from "./pages/Booking";
import Bookings from "./pages/Bookings";
import Events from "./pages/Events";
import EventSlots from "./pages/EventSlots";
import Settings from "./pages/Settings";
import SettingsTest from "./pages/SettingsTest";
import CalendarEventPage from "./pages/CalendarEventPage";

export function AppRouter() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <ScrollToTop />
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/new-event" element={<NewEvent />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/booking/:naddr" element={<Booking />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:naddr" element={<CalendarEventPage />} />
            <Route path="/event-slots" element={<EventSlots />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings-test" element={<SettingsTest />} />
            {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
            <Route path="/:nip19" element={<NIP19Page />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
export default AppRouter;