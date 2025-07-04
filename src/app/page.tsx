// src/app/page.tsx
"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import Image from "next/image";
import { Sparkles, Lightbulb, Edit3 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { currentUser } = useAuth();

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
              WanderAI uses cutting-edge AI to plan your perfect getaway. {currentUser ? "Head to your dashboard" : "Login or sign up"} to share your travel dreams,
              and we&apos;ll handle the details, from must-see sights to hidden gems.
            </p>
            <Link
              href={currentUser ? "/dashboard" : "/auth"}
              className="inline-block bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 px-8 rounded-lg text-lg shadow-md transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent/80 focus:ring-offset-2 font-body animate-fade-in animation-delay-400"
            >
              {currentUser ? "Go to Dashboard" : "Login to Plan Your Adventure"}
            </Link>
          </div>
        </section>

        <section className="py-16 bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl sm:text-4xl font-bold font-headline text-primary mb-3">
                How WanderAI Works For You
              </h3>
              <p className="text-lg text-foreground/70 max-w-2xl mx-auto font-body">
                WanderAI simplifies travel planning by leveraging artificial intelligence to create bespoke itineraries tailored to your unique preferences and budget.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-4 bg-primary rounded-full mb-4 inline-block">
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </div>
                <h4 className="text-xl font-semibold font-headline text-primary mb-2">Personalized Itineraries</h4>
                <p className="text-foreground/80 font-body text-base">
                  Tell us your destination, interests, budget, and trip duration. Our AI crafts a unique plan just for you.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-4 bg-accent rounded-full mb-4 inline-block">
                  <Lightbulb className="h-8 w-8 text-accent-foreground" />
                </div>
                <h4 className="text-xl font-semibold font-headline text-primary mb-2">Smart Suggestions</h4>
                <p className="text-foreground/80 font-body text-base">
                  Discover hidden gems, top attractions, and local favorites based on intelligent recommendations.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-4 bg-secondary rounded-full mb-4 inline-block">
                  <Edit3 className="h-8 w-8 text-secondary-foreground" />
                </div>
                <h4 className="text-xl font-semibold font-headline text-primary mb-2">Easy Refinement</h4>
                <p className="text-foreground/80 font-body text-base">
                  Not quite perfect? Provide feedback and let the AI quickly adjust your itinerary until it's just right.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <style jsx>{`
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
}
