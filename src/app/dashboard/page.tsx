
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
import type { ItineraryInput } from "@/lib/schemas"; // Assuming ItineraryInput contains destination, etc.
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For initial generation
  const [isRefining, setIsRefining] = useState(false); // For refinement
  const [error, setError] = useState<string | null>(null);
  const [currentGenerationDetails, setCurrentGenerationDetails] = useState<ItineraryInput | null>(null);

  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleItineraryGenerated = (newItinerary: string, inputDetails: ItineraryInput) => {
    setItinerary(newItinerary);
    setCurrentGenerationDetails(inputDetails); // Store details for saving
    setError(null); // Clear previous errors
    setIsLoading(false);

    if (currentUser && currentUser.email && newItinerary && inputDetails) {
      try {
        apiSaveItinerary(currentUser.email, {
          destination: inputDetails.destination,
          content: newItinerary,
          currency: inputDetails.currency,
          budgetAmount: inputDetails.budgetAmount,
          duration: inputDetails.duration,
          interests: inputDetails.interests,
        });
        // Toast for successful save can be added here if desired
        // toast({ title: "Itinerary Saved", description: "Your new itinerary has been saved to your history."});
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

     if (currentUser && currentUser.email && refinedItinerary && currentGenerationDetails) {
      try {
        // Saves the refined itinerary as a new entry in history.
        apiSaveItinerary(currentUser.email, {
          destination: currentGenerationDetails.destination,
          content: refinedItinerary, // Save refined content
          currency: currentGenerationDetails.currency,
          budgetAmount: currentGenerationDetails.budgetAmount,
          duration: currentGenerationDetails.duration,
          interests: currentGenerationDetails.interests,
        });
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
                  destination={currentGenerationDetails?.destination}
                  isLoading={isLoading && !itinerary}
                  isRefining={isRefining}
                  setIsRefining={setIsRefining}
                  onItineraryRefined={handleItineraryRefined}
                  error={error}
                  canRefine={true} // Explicitly allow refining on dashboard
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
