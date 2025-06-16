// src/app/dashboard/page.tsx
"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ItineraryInputForm } from "@/components/wander-ai/itinerary-input-form";
import { ItineraryDisplay } from "@/components/wander-ai/itinerary-display";
import type { Metadata } from 'next';
import ProtectedRoute from "@/components/auth/protected-route";

// Cannot export metadata from client component, moved to layout or specific server components
// export const metadata: Metadata = {
//   title: 'Dashboard - WanderAI',
//   description: 'Plan your next adventure with WanderAI.',
// };

export default function DashboardPage() {
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For initial generation
  const [isRefining, setIsRefining] = useState(false); // For refinement
  const [error, setError] = useState<string | null>(null);

  const handleItineraryGenerated = (newItinerary: string) => {
    setItinerary(newItinerary);
    setError(null); // Clear previous errors
    setIsLoading(false);
    // Scroll to the itinerary display section if needed
    const displayElement = document.getElementById('itinerary-display');
    if (displayElement) {
      displayElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleItineraryRefined = (refinedItinerary: string) => {
    setItinerary(refinedItinerary);
    setIsRefining(false);
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="space-y-12">
            <ItineraryInputForm
              onItineraryGenerated={handleItineraryGenerated}
              setIsLoading={setIsLoading} // Pass setIsLoading for initial generation
              isLoading={isLoading}      // Pass isLoading for initial generation
            />
            { (isLoading || isRefining || itinerary || error) && (
              <div id="itinerary-display">
                <ItineraryDisplay
                  itinerary={itinerary}
                  isLoading={isLoading && !itinerary} // Only show main loading if no itinerary yet
                  isRefining={isRefining}
                  setIsRefining={setIsRefining}
                  onItineraryRefined={handleItineraryRefined}
                  error={error}
                />
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
