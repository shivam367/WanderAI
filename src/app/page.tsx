// src/app/page.tsx
"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ItineraryInputForm } from "@/components/wander-ai/itinerary-input-form";
import { ItineraryDisplay } from "@/components/wander-ai/itinerary-display";
import Image from "next/image";

export default function HomePage() {
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // For initial generation
  const [isRefining, setIsRefining] = useState<boolean>(false); // For refinement
  const [error, setError] = useState<string | null>(null);

  const handleItineraryGenerated = (generatedItinerary: string) => {
    setItinerary(generatedItinerary);
    setError(null); // Clear previous errors
    if (generatedItinerary) {
       // Smooth scroll to the itinerary display section
      const itineraryElement = document.getElementById('itinerary-display');
      if (itineraryElement) {
        itineraryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleItineraryRefined = (refinedItinerary: string) => {
    setItinerary(refinedItinerary);
    setError(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <section className="text-center py-12 md:py-20 relative">
          <div 
            className="absolute inset-0 opacity-20" 
            style={{
              backgroundImage: "url('https://placehold.co/1200x600.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              zIndex: -1,
            }}
            data-ai-hint="travel destinations collage"
          >
          </div>
          <div className="relative bg-background/80 backdrop-blur-sm p-6 md:p-10 rounded-xl inline-block">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold font-headline text-primary mb-4 animate-fade-in">
              Explore the World, Effortlessly
            </h2>
            <p className="text-lg sm:text-xl text-foreground/80 max-w-3xl mx-auto mb-8 font-body animate-fade-in animation-delay-200">
              WanderAI uses cutting-edge AI to plan your perfect getaway. Just share your travel dreams,
              and we&apos;ll handle the details, from must-see sights to hidden gems.
            </p>
            <a
              href="#generate"
              className="inline-block bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 px-8 rounded-lg text-lg shadow-md transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent/80 focus:ring-offset-2 font-body animate-fade-in animation-delay-400"
            >
              Start Planning Your Adventure
            </a>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <ItineraryInputForm 
            onItineraryGenerated={handleItineraryGenerated}
            setIsLoading={setIsLoading} 
            isLoading={isLoading}
          />
        </section>

        {(itinerary || isLoading || error) && (
          <section id="itinerary-display" className="py-12 md:py-16">
            <ItineraryDisplay
              itinerary={itinerary}
              isLoading={isLoading}
              isRefining={isRefining}
              setIsRefining={setIsRefining}
              onItineraryRefined={handleItineraryRefined}
              error={error}
            />
          </section>
        )}
      </main>
      <Footer />
      <style jsx>{`
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
}
