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
import { generateItinerary, type GenerateItineraryInput } from "@/ai/flows/generate-itinerary";
import { Wand2, MapPin, Sparkles, DollarSign, Wallet, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import type React from "react";

interface ItineraryInputFormProps {
  onItineraryGenerated: (itinerary: string) => void;
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
];

export function ItineraryInputForm({ onItineraryGenerated, setIsLoading, isLoading }: ItineraryInputFormProps) {
  const { toast } = useToast();
  const form = useForm<ItineraryInput>({
    resolver: zodResolver(ItineraryInputSchema),
    defaultValues: {
      destination: "",
      interests: "",
      currency: "USD",
      budgetAmount: 1000,
      duration: 7,
    },
  });

  const onSubmit: SubmitHandler<ItineraryInput> = async (data) => {
    setIsLoading(true);
    try {
      const aiInput: GenerateItineraryInput = {
        destination: data.destination,
        interests: data.interests,
        currency: data.currency,
        budgetAmount: Number(data.budgetAmount),
        duration: Number(data.duration),
      };
      const result = await generateItinerary(aiInput);
      onItineraryGenerated(result.itinerary);
    } catch (error) {
      console.error("Error generating itinerary:", error);
      toast({
        title: "Error Generating Itinerary",
        description: (error as Error).message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
       onItineraryGenerated(""); // Clear previous itinerary on error
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
                  <FormLabel className="flex items-center font-body"><Sparkles className="mr-2 h-4 w-4 text-primary" />Interests & Activities</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Museums, local cuisine, hiking, photography" {...field} className="font-body min-h-[100px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center font-body"><DollarSign className="mr-2 h-4 w-4 text-primary" />Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Input type="number" placeholder="e.g., 1500" {...field} className="font-body" />
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
                      <Input type="number" placeholder="e.g., 7" {...field} className="font-body" />
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
