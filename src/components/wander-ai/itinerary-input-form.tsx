
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
import { suggestInterests, type SuggestInterestsInput } from "@/ai/flows/suggest-interests-flow";
import { Wand2, MapPin, Sparkles, DollarSign, Wallet, CalendarDays, CheckCircle, Circle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";

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
  "Street Food Tours", "City Tours"
];

export function ItineraryInputForm({ onItineraryGenerated, setIsLoading, isLoading }: ItineraryInputFormProps) {
  const { toast } = useToast();
  const form = useForm<ItineraryInput>({
    resolver: zodResolver(ItineraryInputSchema),
    mode: 'onTouched',
    defaultValues: {
      destination: "",
      interests: "",
      currency: "USD",
      budgetAmount: 1000,
      duration: 7,
    },
  });

  const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionBoxRef = useRef<HTMLDivElement>(null);
  const interestsTextareaRef = useRef<HTMLTextAreaElement>(null);

  const watchedInterests = form.watch("interests");

  // Sync chip visual state from textarea content
  useEffect(() => {
    if (typeof watchedInterests === 'string') {
      const interestsArrayFromText = watchedInterests.split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      const newSelectedChipsFromText = new Set(
        interestsArrayFromText.filter(interest => commonInterests.includes(interest))
      );

      setSelectedChips(prevSelectedChips => {
        const contentsAreEqual = newSelectedChipsFromText.size === prevSelectedChips.size &&
                                 Array.from(newSelectedChipsFromText).every(chip => prevSelectedChips.has(chip));
        return contentsAreEqual ? prevSelectedChips : newSelectedChipsFromText;
      });
    }
  }, [watchedInterests]);

  const handleChipToggle = (interestToToggle: string) => {
    const currentFieldValue = form.getValues("interests") || "";
    const interestsArray = currentFieldValue.split(',')
                                        .map(item => item.trim())
                                        .filter(item => item.length > 0);
    
    const uniqueInterestsSet = new Set(interestsArray);

    if (uniqueInterestsSet.has(interestToToggle)) {
      uniqueInterestsSet.delete(interestToToggle);
    } else {
      uniqueInterestsSet.add(interestToToggle);
    }
    
    const newFieldValue = Array.from(uniqueInterestsSet).join(", ");
    form.setValue("interests", newFieldValue, { shouldValidate: true, shouldDirty: true });
    setShowSuggestions(false); // Hide suggestions when a chip is toggled
  };

  // Debounce AI suggestions
  useEffect(() => {
    const handler = setTimeout(async () => {
      const fullQuery = form.getValues("interests");
      const parts = fullQuery.split(',');
      const currentQueryPart = parts[parts.length - 1].trim();

      if (currentQueryPart.length >= 2) {
        setIsSuggesting(true);
        try {
          const existingInterestsForAI = parts.slice(0, -1).map(p => p.trim()).filter(p => p.length > 0).join(', ');
          const result = await suggestInterests({ query: currentQueryPart, existingInterests: existingInterestsForAI });
          
          // Filter out suggestions that are too similar to the current query part or already in the full list
          const allCurrentInterestsLower = new Set(parts.map(p => p.trim().toLowerCase()));
          const filteredSuggestions = result.suggestions.filter(sugg => 
            sugg.toLowerCase() !== currentQueryPart.toLowerCase() && 
            !allCurrentInterestsLower.has(sugg.toLowerCase())
          );

          setSuggestions(filteredSuggestions);
          if (filteredSuggestions.length > 0 && document.activeElement === interestsTextareaRef.current) {
            setShowSuggestions(true);
          } else {
            setShowSuggestions(false);
          }
        } catch (error) {
          console.error("Error fetching suggestions:", error);
          setSuggestions([]);
          setShowSuggestions(false);
        } finally {
          setIsSuggesting(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [watchedInterests, form]);

  const handleSuggestionClick = (suggestion: string) => {
    const currentFieldValue = form.getValues("interests") || "";
    let parts = currentFieldValue.split(',').map(p => p.trim());

    if (parts.length === 1 && parts[0] === "") { 
        parts = [suggestion];
    } else if (parts.length > 0) {
        parts[parts.length - 1] = suggestion; // Replace the last part (query) with the full suggestion
    }
    
    const newFieldValue = parts.filter(p => p.length > 0).join(", ");
    form.setValue("interests", newFieldValue, { shouldValidate: true, shouldDirty: true });
    
    setSuggestions([]);
    setShowSuggestions(false);
    interestsTextareaRef.current?.focus(); // Keep focus on textarea
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target as Node) &&
          interestsTextareaRef.current && !interestsTextareaRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [suggestionBoxRef, interestsTextareaRef]);


  const onSubmit: SubmitHandler<ItineraryInput> = async (data) => {
    setIsLoading(true);
    setShowSuggestions(false); // Hide suggestions on submit
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
                <FormItem className="relative">
                  <FormLabel className="flex items-center font-body mb-2"><Sparkles className="mr-2 h-4 w-4 text-primary" />Interests & Activities</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Museums, local cuisine, hiking. Type for AI suggestions..."
                      {...field}
                      ref={interestsTextareaRef}
                      className="font-body min-h-[80px]"
                      onFocus={() => {
                        // Show suggestions if any exist and query is long enough
                         const fullQuery = form.getValues("interests");
                         const parts = fullQuery.split(',');
                         const currentQueryPart = parts[parts.length - 1].trim();
                         if (suggestions.length > 0 && currentQueryPart.length >=2) setShowSuggestions(true);
                      }}
                      // onBlur is tricky due to suggestion clicks, handled by global click listener mostly
                    />
                  </FormControl>
                  <FormMessage className="pt-1"/>
                  {showSuggestions && suggestions.length > 0 && (
                    <div ref={suggestionBoxRef} className="mt-1 border border-input rounded-md shadow-lg bg-background z-50 absolute w-full max-h-48 overflow-y-auto">
                      {isSuggesting && <div className="p-2 text-sm text-muted-foreground flex items-center"><LoadingSpinner size={16} className="mr-2"/><span>Loading...</span></div>}
                      {!isSuggesting && suggestions.map((sugg, index) => (
                        <button
                          type="button"
                          key={index}
                          onClick={() => handleSuggestionClick(sugg)}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
                        >
                          {sugg}
                        </button>
                      ))}
                    </div>
                  )}
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
