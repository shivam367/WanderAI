// src/app/dashboard/page.tsx
"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ItineraryInputForm } from "@/components/wander-ai/itinerary-input-form";
import { ItineraryDisplay } from "@/components/wander-ai/itinerary-display";
import ProtectedRoute from "@/components/auth/protected-route";
import { useAuth } from "@/contexts/AuthContext";
import { saveItinerary as apiSaveItinerary } from "@/lib/itinerary-storage";
import type { ItineraryInput } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [currentItineraryId, setCurrentItineraryId] = useState<string | null>(null); // For chatbot
  const [isLoading, setIsLoading] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGenerationDetails, setCurrentGenerationDetails] = useState<ItineraryInput | null>(null);

  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleItineraryGenerated = (newItinerary: string, inputDetails: ItineraryInput) => {
    setItinerary(newItinerary);
    setCurrentGenerationDetails(inputDetails);
    setError(null);
    setIsLoading(false);
    setCurrentItineraryId(null); // Reset ID for new generation

    if (currentUser?.email && newItinerary && inputDetails) {
      try {
        const savedRecord = apiSaveItinerary(currentUser.email, {
          destination: inputDetails.destination,
          content: newItinerary,
          currency: inputDetails.currency,
          budgetAmount: inputDetails.budgetAmount,
          duration: inputDetails.duration,
          interests: inputDetails.interests,
          numberOfPersons: inputDetails.numberOfPersons,
        });
        setCurrentItineraryId(savedRecord.id); // Set ID after saving
      } catch (saveError) {
        console.error("Failed to save itinerary:", saveError);
        toast({ title: "Save Error", description: "Could not save itinerary to history.", variant: "destructive"});
      }
    }

    const displayElement = document.getElementById('itinerary-display');
    if (displayElement) {
      displayElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleItineraryRefined = (refinedItinerary: string) => {
    setItinerary(refinedItinerary);
    setIsRefining(false);
    setCurrentItineraryId(null); // Reset ID for refined version until saved

     if (currentUser && currentUser.email && refinedItinerary && currentGenerationDetails) {
      try {
        const savedRecord = apiSaveItinerary(currentUser.email, {
          destination: currentGenerationDetails.destination,
          content: refinedItinerary,
          currency: currentGenerationDetails.currency,
          budgetAmount: currentGenerationDetails.budgetAmount,
          duration: currentGenerationDetails.duration,
          interests: currentGenerationDetails.interests,
          numberOfPersons: currentGenerationDetails.numberOfPersons,
        });
        setCurrentItineraryId(savedRecord.id); // Set new ID for refined version
        toast({ title: "Refined Itinerary Saved", description: "Your refined itinerary has been saved to your history.", className: "bg-primary text-primary-foreground" });
      } catch (saveError) {
        console.error("Failed to save refined itinerary:", saveError);
        toast({ title: "Save Error", description: "Could not save refined itinerary to history.", variant: "destructive"});
      }
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="space-y-12">
            <ItineraryInputForm
              onItineraryGenerated={handleItineraryGenerated}
              setIsLoading={setIsLoading}
              isLoading={isLoading}
            />
            { (isLoading || isRefining || itinerary || error) && (
              <div id="itinerary-display">
                <ItineraryDisplay
                  itinerary={itinerary}
                  itineraryId={currentItineraryId} // Pass the ID
                  destination={currentGenerationDetails?.destination}
                  isLoading={isLoading && !itinerary}
                  isRefining={isRefining}
                  setIsRefining={setIsRefining}
                  onItineraryRefined={handleItineraryRefined}
                  error={error}
                  canRefine={true}
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
