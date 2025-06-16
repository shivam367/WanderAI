
// src/components/wander-ai/itinerary-input-form.tsx
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItineraryInputSchema, type ItineraryInput } from "@/lib/schemas";
import { generateItinerary, type GenerateItineraryInput as AIInputType } from "@/ai/flows/generate-itinerary";
import { Wand2, MapPin, Sparkles, DollarSign, Wallet, CalendarDays, CheckCircle, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type React from "react";
import { useState, useEffect } from "react";

interface ItineraryInputFormProps {
  onItineraryGenerated: (itinerary: string, inputDetails: ItineraryInput) => void;
  setIsLoading: (loading: boolean) => void;
  isLoading: boolean;
}

const currencyOptions = [
  { value: "USD", label: "USD - United States Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound Sterling" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "CHF", label: "CHF - Swiss Franc" },
  { value: "INR", label: "INR - Indian Rupee" },
];

const commonInterests = [
  "Museums", "Historical Sites", "Local Cuisine", "Shopping", "Nightlife",
  "Beaches", "Mountains", "Hiking", "Water Sports", "Photography",
  "Art & Culture", "Relaxation", "Adventure Sports", "Wildlife Safari",
  "Yoga & Wellness", "Cooking Classes", "Live Music", "Theme Parks"
];

export function ItineraryInputForm({ onItineraryGenerated, setIsLoading, isLoading }: ItineraryInputFormProps) {
  const { toast } = useToast();
  const form = useForm<ItineraryInput>({
    resolver: zodResolver(ItineraryInputSchema),
    mode: 'onTouched', // Validate on touched or on submit
    defaultValues: {
      destination: "",
      interests: "",
      currency: "USD",
      budgetAmount: 1000,
      duration: 7,
    },
  });

  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());

  // Sync textarea with chip selections
  useEffect(() => {
    const interestsArray = Array.from(selectedChips);
    // Only update form if the string value actually changes
    if (form.getValues("interests") !== interestsArray.join(", ")) {
      form.setValue("interests", interestsArray.join(", "), { shouldValidate: true });
    }
  }, [selectedChips, form]);

  // Sync chip selections with textarea (e.g., if user types manually or pastes)
  const watchedInterests = form.watch("interests");
  useEffect(() => {
    if (typeof watchedInterests === 'string') {
      const interestsArrayFromText = watchedInterests.split(',').map(item => item.trim()).filter(item => item.length > 0);
      const newSelectedChipsFromText = new Set(interestsArrayFromText.filter(interest => commonInterests.includes(interest)));

      setSelectedChips(prevSelectedChips => {
        // Compare contents of the sets
        const contentsAreEqual = newSelectedChipsFromText.size === prevSelectedChips.size &&
                                 Array.from(newSelectedChipsFromText).every(chip => prevSelectedChips.has(chip));
        
        if (contentsAreEqual) {
          return prevSelectedChips; // Return the same Set instance to prevent re-render
        } else {
          return newSelectedChipsFromText; // Return the new Set instance
        }
      });
    }
  }, [watchedInterests]);


  const handleChipToggle = (interest: string) => {
    setSelectedChips(prevSelectedChips => {
      const newSelectedChips = new Set(prevSelectedChips);
      if (newSelectedChips.has(interest)) {
        newSelectedChips.delete(interest);
      } else {
        newSelectedChips.add(interest);
      }
      return newSelectedChips;
    });
  };

  const onSubmit: SubmitHandler<ItineraryInput> = async (data) => {
    setIsLoading(true);
    try {
      const aiInput: AIInputType = {
        destination: data.destination,
        interests: data.interests,
        currency: data.currency,
        budgetAmount: Number(data.budgetAmount),
        duration: Number(data.duration),
      };
      const result = await generateItinerary(aiInput);
      onItineraryGenerated(result.itinerary, data);
    } catch (error) {
      console.error("Error generating itinerary:", error);
      toast({
        title: "Error Generating Itinerary",
        description: (error as Error).message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      // Pass back current form values even on error, so dashboard state is consistent
      onItineraryGenerated("", form.getValues()); 
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl bg-card/80 backdrop-blur-sm" id="generate">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline text-primary flex items-center justify-center gap-2">
          <Wand2 className="h-8 w-8" />
          Create Your Dream Trip
        </CardTitle>
        <CardDescription className="font-body">
          Tell us your preferences, and our AI will craft a personalized itinerary for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center font-body"><MapPin className="mr-2 h-4 w-4 text-primary" />Destination</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Paris, France" {...field} className="font-body" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="interests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center font-body mb-2"><Sparkles className="mr-2 h-4 w-4 text-primary" />Interests & Activities</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Museums, local cuisine, hiking, photography. Or select from below."
                      {...field}
                      className="font-body min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage className="pt-1"/>
                </FormItem>
              )}
            />

            <div className="space-y-2">
                <FormLabel className="text-sm font-medium text-muted-foreground font-body flex items-center">
                    Or tap to add common interests:
                </FormLabel>
                <div className="flex flex-wrap gap-2">
                    {commonInterests.map((interest) => {
                    const isSelected = selectedChips.has(interest);
                    return (
                        <Button
                        key={interest}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleChipToggle(interest)}
                        className={`font-body transition-all duration-150 ease-in-out rounded-full px-3 py-1 h-auto text-xs
                                    ${isSelected
                                        ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/90'
                                        : 'border-input hover:bg-secondary/70'
                                    }`}
                        >
                        {isSelected ? <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> : <Circle className="mr-1.5 h-3.5 w-3.5 text-transparent group-hover:text-muted-foreground" />}
                        {interest}
                        </Button>
                    );
                    })}
                </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center font-body"><DollarSign className="mr-2 h-4 w-4 text-primary" />Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="font-body">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencyOptions.map(option => (
                          <SelectItem key={option.value} value={option.value} className="font-body">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budgetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center font-body"><Wallet className="mr-2 h-4 w-4 text-primary" />Budget Amount</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 1500" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="font-body" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center font-body"><CalendarDays className="mr-2 h-4 w-4 text-primary" />Duration (days)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 7" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} className="font-body" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-body py-6 text-lg" disabled={isLoading}>
              {isLoading ? (
                <LoadingSpinner size={24} className="text-accent-foreground" />
              ) : (
                <>
                  <Wand2 className="mr-2 h-5 w-5" />
                  Generate Itinerary
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

