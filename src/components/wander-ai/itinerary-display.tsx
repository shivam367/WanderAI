// src/components/wander-ai/itinerary-display.tsx
"use client";

import type React from "react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RefineItineraryInputSchema, type RefineItineraryInput as RefineFormInputType } from "@/lib/schemas";
import { refineItinerary, type RefineItineraryInput } from "@/ai/flows/refine-itinerary";
import { useToast } from "@/hooks/use-toast";
import { BookOpenText, Edit3, Sparkles, Lightbulb, Utensils, BedDouble, MountainSnow, Building2 } from "lucide-react";

interface ItineraryDisplayProps {
  itinerary: string | null;
  isLoading: boolean;
  isRefining: boolean;
  setIsRefining: (refining: boolean) => void;
  onItineraryRefined: (refinedItinerary: string) => void;
  error: string | null;
}

interface Section {
  title: string;
  icon: React.ElementType;
  content: string[];
}

// Fallback icon defined before its use
const CalendarDays = ({className}: {className: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;

function parseItinerary(itineraryText: string): Section[] {
  const sections: Section[] = [];
  const lines = itineraryText.split('\n').filter(line => line.trim() !== '');

  let currentSection: Section | null = null;

  const sectionKeywords: Record<string, { title: string, icon: React.ElementType }> = {
    "Day \\d+": { title: "Day {N}", icon: CalendarDays }, // Placeholder for dynamic day
    "Activities": { title: "Activities & Attractions", icon: MountainSnow },
    "Attractions": { title: "Activities & Attractions", icon: MountainSnow },
    "Food Recommendations": { title: "Food Recommendations", icon: Utensils },
    "Food": { title: "Food Recommendations", icon: Utensils },
    "Hotel Suggestions": { title: "Hotel Suggestions", icon: BedDouble },
    "Accommodation": { title: "Hotel Suggestions", icon: BedDouble },
    "Hotels": { title: "Hotel Suggestions", icon: BedDouble },
    "Local Tips": { title: "Local Tips & Advice", icon: Lightbulb },
    "Tips": { title: "Local Tips & Advice", icon: Lightbulb },
    "Transportation": { title: "Transportation", icon: Building2 } // Using Building2 as placeholder
  };

  lines.forEach(line => {
    let matchedKeyword = false;
    for (const keyword in sectionKeywords) {
      const regex = new RegExp(`^${keyword}:?`, "i");
      const match = line.match(regex);
      if (match) {
        if (currentSection) {
          sections.push(currentSection);
        }
        let title = sectionKeywords[keyword].title;
        if (keyword === "Day \\d+") {
          title = line.replace(/:$/, ''); // Use the matched line as title, e.g., "Day 1 Activities"
        }
        currentSection = { title: title, icon: sectionKeywords[keyword].icon, content: [] };
         // Add text after colon if any
        const contentAfterColon = line.substring(match[0].length).trim();
        if (contentAfterColon) {
          currentSection.content.push(contentAfterColon);
        }
        matchedKeyword = true;
        break;
      }
    }

    if (!matchedKeyword && currentSection) {
      currentSection.content.push(line);
    } else if (!matchedKeyword && !currentSection) {
      // Lines before any keyword, treat as intro or part of a general section
      if (sections.length === 0 || sections[sections.length-1].title !== "Overview") {
         if (currentSection) sections.push(currentSection);
        currentSection = { title: "Overview", icon: BookOpenText, content: [] };
      }
      currentSection!.content.push(line);
    }
  });

  if (currentSection) {
    sections.push(currentSection);
  }
  
  if (sections.length === 0 && itineraryText.trim() !== "") {
    // If no keywords found but there is text, put it all in an overview
    sections.push({ title: "Generated Itinerary", icon: BookOpenText, content: itineraryText.split('\n').filter(l => l.trim() !== '') });
  }

  return sections;
}


export function ItineraryDisplay({ itinerary, isLoading, isRefining, setIsRefining, onItineraryRefined, error }: ItineraryDisplayProps) {
  const { toast } = useToast();
  const [showRefineForm, setShowRefineForm] = useState(false);

  const refineForm = useForm<RefineFormInputType>({
    resolver: zodResolver(RefineItineraryInputSchema),
    defaultValues: { userFeedback: "" },
  });

  const onRefineSubmit: SubmitHandler<RefineFormInputType> = async (data) => {
    if (!itinerary) {
      toast({ title: "Error", description: "No itinerary to refine.", variant: "destructive" });
      return;
    }
    setIsRefining(true);
    try {
      const aiInput: RefineItineraryInput = {
        existingItinerary: itinerary,
        userFeedback: data.userFeedback,
      };
      const result = await refineItinerary(aiInput);
      onItineraryRefined(result.refinedItinerary);
      setShowRefineForm(false); // Hide form after successful refinement
      refineForm.reset(); // Reset form fields
      toast({ title: "Itinerary Refined!", description: "Your updated itinerary is ready.", className: "bg-primary text-primary-foreground" });
    } catch (err) {
      console.error("Error refining itinerary:", err);
      toast({
        title: "Error Refining Itinerary",
        description: (err as Error).message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsRefining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-8 flex justify-center items-center min-h-[300px] animate-fade-in">
        <LoadingSpinner size={48} text="Crafting your perfect itinerary... This may take a moment." />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mt-8 w-full max-w-3xl mx-auto bg-destructive/10 border-destructive animate-fade-in">
        <CardHeader>
          <CardTitle className="text-destructive font-headline">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive-foreground font-body">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!itinerary) {
    return null; // Don't render anything if there's no itinerary and not loading/error
  }

  const parsedSections = parseItinerary(itinerary);

  return (
    <Card className="mt-12 w-full max-w-4xl mx-auto shadow-xl animate-slide-in-up bg-card/90 backdrop-blur-sm">
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <BookOpenText className="h-8 w-8" />
            Your Custom Itinerary
          </CardTitle>
          <CardDescription className="font-body">Here's your AI-generated travel plan. Review and refine it as needed!</CardDescription>
        </div>
        <Button onClick={() => setShowRefineForm(!showRefineForm)} variant="outline" className="text-accent border-accent hover:bg-accent/10">
          <Edit3 className="mr-2 h-4 w-4" /> {showRefineForm ? "Cancel Refinement" : "Refine Itinerary"}
        </Button>
      </CardHeader>
      <CardContent>
        {showRefineForm && (
          <Card className="mb-6 bg-secondary/50 p-2 sm:p-4 md:p-6 animate-fade-in">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
                <Sparkles className="h-6 w-6"/>
                Refine Your Itinerary
              </CardTitle>
              <CardDescription className="font-body">
                Provide feedback on what you'd like to change or add.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...refineForm}>
                <form onSubmit={refineForm.handleSubmit(onRefineSubmit)} className="space-y-4">
                  <FormField
                    control={refineForm.control}
                    name="userFeedback"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-body">Your Feedback</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., 'Add more vegetarian food options', 'Include a visit to Eiffel Tower on Day 2', 'Suggest budget-friendly hotels'"
                            {...field}
                            className="min-h-[120px] font-body"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground font-body" disabled={isRefining}>
                    {isRefining ? <LoadingSpinner size={20} /> : "Submit Feedback"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
        
        {isRefining && !showRefineForm && ( // Show this if refining is in progress but form is hidden (e.g. after submission)
           <div className="my-6 flex justify-center items-center min-h-[100px]">
             <LoadingSpinner size={32} text="Refining your itinerary..." />
           </div>
        )}

        <ScrollArea className="h-[600px] p-1 rounded-md">
          <div className="space-y-6 pr-4">
            {parsedSections.map((section, idx) => (
              <div key={idx} className="mb-4 p-4 border border-border rounded-lg shadow-sm bg-background">
                <h3 className="text-xl font-headline font-semibold text-primary mb-2 flex items-center">
                  <section.icon className="mr-3 h-6 w-6 text-primary/80" />
                  {section.title}
                </h3>
                {section.content.map((line, lineIdx) => (
                  <p key={lineIdx} className="text-foreground/90 font-body mb-1 leading-relaxed whitespace-pre-line">
                    {line.startsWith('- ') || line.startsWith('* ') ? `• ${line.substring(2)}` : line}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
