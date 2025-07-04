// src/app/history/page.tsx
"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import dynamic from 'next/dynamic';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import ProtectedRoute from "@/components/auth/protected-route";
import { useAuth } from "@/contexts/AuthContext";
import { getItineraries as apiGetItineraries, deleteItinerary as apiDeleteItinerary, deleteAllItinerariesForUser, saveItinerary as apiSaveItinerary, type ItineraryRecord } from "@/lib/itinerary-storage";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Eye, CalendarClock, MapPin, Info, Trash, Users, Wallet, Calendar, DollarSign } from "lucide-react";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

const ItineraryDisplay = dynamic(() => 
  import('@/components/wander-ai/itinerary-display').then(mod => mod.ItineraryDisplay),
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col min-h-[400px] items-center justify-center">
        <LoadingSpinner size={32} text="Loading itinerary viewer..." />
      </div>
    )
  }
);

export default function HistoryPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [itineraries, setItineraries] = useState<ItineraryRecord[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<ItineraryRecord | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isRefining, setIsRefining] = useState(false);
  const [currentItineraryDetailsForRefine, setCurrentItineraryDetailsForRefine] = useState<Omit<ItineraryRecord, 'content' | 'id' | 'generatedDate'> | null>(null);
  const { toast } = useToast();

  const fetchItineraries = useCallback(() => {
    if (currentUser?.email) {
      setIsLoadingHistory(true);
      const userItineraries = apiGetItineraries(currentUser.email);
      setItineraries(userItineraries);
      setIsLoadingHistory(false);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    if (!authLoading) {
      fetchItineraries();
    }
  }, [authLoading, fetchItineraries]);

  const handleDelete = (itineraryId: string) => {
    if (currentUser?.email) {
      apiDeleteItinerary(currentUser.email, itineraryId);
      fetchItineraries(); 
      toast({ title: "Itinerary Deleted", description: "The itinerary and its chat history have been removed.", className: "bg-primary text-primary-foreground" });
    }
  };

  const handleClearAllHistory = () => {
    if (currentUser?.email) {
      deleteAllItinerariesForUser(currentUser.email);
      fetchItineraries(); 
      toast({ title: "History Cleared", description: "All your saved itineraries and chat histories have been deleted.", className: "bg-primary text-primary-foreground" });
    }
  };

  const handleViewDetails = (itinerary: ItineraryRecord) => {
    setSelectedItinerary(itinerary);
    const { id, generatedDate, content, ...detailsForRefine } = itinerary;
    setCurrentItineraryDetailsForRefine(detailsForRefine);
  };

  const handleItineraryRefined = (refinedItineraryContent: string) => {
    if (!currentUser?.email || !currentItineraryDetailsForRefine || !selectedItinerary) {
      toast({ title: "Error", description: "Could not save refined itinerary. User or original details missing.", variant: "destructive" });
      setIsRefining(false);
      return;
    }

    try {
      const savedRecord = apiSaveItinerary(currentUser.email, {
        ...currentItineraryDetailsForRefine,
        content: refinedItineraryContent,
      });
      
      setSelectedItinerary({ 
        ...selectedItinerary, 
        id: savedRecord.id, // View the newly saved refined itinerary
        content: refinedItineraryContent,
        destination: savedRecord.destination,
        generatedDate: savedRecord.generatedDate, // Update date to reflect new save
        // other fields from savedRecord if necessary
      });
      
      toast({ title: "Itinerary Refined & Saved", description: "Your refined itinerary has been saved as a new entry.", className: "bg-primary text-primary-foreground" });
      fetchItineraries(); 
    } catch (saveError) {
      console.error("Failed to save refined itinerary from history:", saveError);
      toast({ title: "Save Error", description: "Could not save refined itinerary to history.", variant: "destructive"});
    } finally {
      setIsRefining(false);
    }
  };


  if (authLoading || isLoadingHistory) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col min-h-screen bg-background items-center justify-center">
          <LoadingSpinner size={48} text="Loading itinerary history..." />
        </div>
      </ProtectedRoute>
    );
  }

  if (selectedItinerary) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col min-h-screen bg-background">
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <Button 
              onClick={() => {
                setSelectedItinerary(null);
                setCurrentItineraryDetailsForRefine(null);
              }} 
              variant="outline" 
              className="mb-6 font-body"
            >
              &larr; Back to History
            </Button>
            <ItineraryDisplay
              itinerary={selectedItinerary.content}
              itineraryId={selectedItinerary.id} // Pass the ID
              destination={selectedItinerary.destination}
              isLoading={false}
              isRefining={isRefining}
              setIsRefining={setIsRefining}
              onItineraryRefined={handleItineraryRefined}
              error={null}
              canRefine={true}
            />
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <Card className="w-full max-w-4xl mx-auto shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-3xl font-headline text-primary flex items-center">
                    <CalendarClock className="mr-3 h-8 w-8" />
                    Your Itinerary History
                  </CardTitle>
                  <CardDescription className="font-body">
                    Review, refine, and chat about your past travel plans.
                  </CardDescription>
                </div>
                {itineraries.length > 0 && (
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="font-body w-full sm:w-auto">
                        <Trash className="mr-2 h-4 w-4" /> Clear All History
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete all your saved itineraries and their chat histories.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAllHistory}>
                          Yes, delete all history
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {itineraries.length === 0 ? (
                <div className="text-center py-10">
                  <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground font-body text-lg">No itineraries found in your history.</p>
                  <p className="text-muted-foreground font-body">Go to your <a href="/dashboard" className="text-primary hover:underline">dashboard</a> to create a new one!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {itineraries.map((itinerary) => (
                    <Card key={itinerary.id} className="bg-background/70 shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="font-headline text-xl text-primary flex items-center">
                           <MapPin className="mr-2 h-5 w-5 shrink-0" /> {itinerary.destination || "Untitled Itinerary"}
                        </CardTitle>
                        <CardDescription className="font-body text-sm text-muted-foreground">
                          Generated on: {format(new Date(itinerary.generatedDate), "MMMM d, yyyy 'at' h:mm a")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="font-body">
                         <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                           <span className="flex items-center"><Users className="mr-1.5 h-4 w-4"/>{itinerary.numberOfPersons || 'N/A'} {itinerary.numberOfPersons === 1 ? 'person' : 'people'}</span>
                           <span className="flex items-center"><Calendar className="mr-1.5 h-4 w-4"/>{itinerary.duration || 'N/A'} days</span>
                           <span className="flex items-center"><Wallet className="mr-1.5 h-4 w-4"/>{itinerary.budgetAmount || 'N/A'} {itinerary.currency || ''}</span>
                         </div>
                        <p className="text-sm text-muted-foreground truncate">
                          <span className="font-medium">Interests:</span> {itinerary.interests || 'N/A'}
                        </p>
                        <p className="line-clamp-2 text-foreground/80 mt-2">
                          {itinerary.content.substring(0, 150) + (itinerary.content.length > 150 ? "..." : "")}
                        </p>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(itinerary)} className="font-body text-primary border-primary hover:bg-primary/10">
                          <Eye className="mr-2 h-4 w-4" /> View, Refine & Chat
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="font-body">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the itinerary for "{itinerary.destination || "this plan"}" and its chat history.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(itinerary.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
