
// src/components/wander-ai/itinerary-display.tsx
"use client";

import type React from "react";
import { useState, useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RefineItineraryInputSchema, type RefineItineraryInput as RefineFormInputType } from "@/lib/schemas";
import { refineItinerary, type RefineItineraryInput } from "@/ai/flows/refine-itinerary";
import { useToast } from "@/hooks/use-toast";
import { BookOpenText, Edit3, Sparkles, Lightbulb, Utensils, BedDouble, MountainSnow, Building2, Download } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Fallback icon defined before its use
const CalendarDaysIcon = ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;


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
  isDaySection?: boolean;
}

const sectionKeywords: Record<string, { title: string, icon: React.ElementType, isDayKeyword?: boolean }> = {
  "Day \\d+": { title: "Day {N}", icon: CalendarDaysIcon, isDayKeyword: true },
  "Activities": { title: "Activities & Attractions", icon: MountainSnow },
  "Attractions": { title: "Activities & Attractions", icon: MountainSnow },
  "Food Recommendations": { title: "Food Recommendations", icon: Utensils },
  "Food": { title: "Food Recommendations", icon: Utensils },
  "Hotel Suggestions": { title: "Hotel Suggestions", icon: BedDouble },
  "Accommodation": { title: "Hotel Suggestions", icon: BedDouble },
  "Hotels": { title: "Hotel Suggestions", icon: BedDouble },
  "Local Tips": { title: "Local Tips & Advice", icon: Lightbulb },
  "Tips": { title: "Local Tips & Advice", icon: Lightbulb },
  "Transportation": { title: "Transportation", icon: Building2 }
};

function parseItinerary(itineraryText: string): Section[] {
  const sections: Section[] = [];
  const lines = itineraryText.split('\n').filter(line => line.trim() !== '');

  let currentSection: Section | null = null;
  
  lines.forEach(line => {
    let matchedKeyword = false;
    for (const keyword in sectionKeywords) {
      const regex = new RegExp(`^(${keyword.replace("Day \\d+", "Day \\d+.*")}):?`, "i");
      const match = line.match(regex);
      if (match) {
        if (currentSection) {
          sections.push(currentSection);
        }
        let title = sectionKeywords[keyword].title;
        if (sectionKeywords[keyword].isDayKeyword) {
          title = match[1].replace(/:$/, '').trim(); 
        }
        currentSection = { 
          title: title, 
          icon: sectionKeywords[keyword].icon, 
          content: [],
          isDaySection: !!sectionKeywords[keyword].isDayKeyword 
        };
        const contentAfterColon = line.substring(match[0].length).trim();
        if (contentAfterColon) {
          currentSection.content.push(contentAfterColon);
        }
        matchedKeyword = true;
        break;
      }
    }

    if (!matchedKeyword && currentSection) {
      currentSection.content.push(line.trim());
    } else if (!matchedKeyword && !currentSection) {
      // If content appears before any recognized section, group it under "Overview"
      if (sections.length === 0 || sections[sections.length-1].title !== "Overview") {
         if (currentSection) sections.push(currentSection); // Push previous if any
        currentSection = { title: "Overview", icon: BookOpenText, content: [] };
      }
      currentSection!.content.push(line.trim());
    }
  });

  if (currentSection) {
    sections.push(currentSection);
  }
  
  // Fallback if no sections were parsed but there's text
  if (sections.length === 0 && itineraryText.trim() !== "") {
    sections.push({ title: "Generated Itinerary", icon: BookOpenText, content: itineraryText.split('\n').filter(l => l.trim() !== '') });
  }

  return sections.filter(section => section.content.some(line => line.trim() !== ''));
}


export function ItineraryDisplay({ itinerary, isLoading, isRefining, setIsRefining, onItineraryRefined, error }: ItineraryDisplayProps) {
  const { toast } = useToast();
  const [showRefineForm, setShowRefineForm] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const itineraryContentRef = useRef<HTMLDivElement>(null);

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
      setShowRefineForm(false); 
      refineForm.reset(); 
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

  const handleExportPdf = async () => {
    if (!itineraryContentRef.current) {
      toast({ title: "Error", description: "Could not find itinerary content to export.", variant: "destructive"});
      return;
    }
    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(itineraryContentRef.current, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff', 
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfMargin = 10; // 10mm margin
      const pdfWidth = pdf.internal.pageSize.getWidth() - 2 * pdfMargin;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const pageHeight = pdf.internal.pageSize.getHeight() - 2 * pdfMargin;
      
      let heightLeft = pdfHeight;
      let position = pdfMargin; 

      pdf.addImage(imgData, 'PNG', pdfMargin, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight + pdfMargin; 
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', pdfMargin, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      pdf.save('wanderai-itinerary.pdf');
      toast({ title: "Export Successful", description: "Your itinerary has been downloaded as a PDF.", className: "bg-primary text-primary-foreground" });
    } catch (err) {
      console.error("Error exporting PDF:", err);
      toast({ title: "PDF Export Error", description: (err as Error).message || "Could not export itinerary to PDF.", variant: "destructive"});
    } finally {
      setIsExportingPdf(false);
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
        <CardHeader><CardTitle className="text-destructive font-headline">Error</CardTitle></CardHeader>
        <CardContent><p className="text-destructive-foreground font-body">{error}</p></CardContent>
      </Card>
    );
  }

  if (!itinerary) return null;

  const parsedSections = parseItinerary(itinerary);
  const daySections = parsedSections.filter(s => s.isDaySection);
  const otherSections = parsedSections.filter(s => !s.isDaySection);

  const renderContent = (contentLines: string[]) => {
    const listItems: string[] = [];
    const otherContent: string[] = [];
    contentLines.forEach(line => {
      if (line.startsWith('- ') || line.startsWith('* ')) {
        listItems.push(line.substring(2).trim());
      } else if (line.trim()) { // Ensure only non-empty lines are pushed
        otherContent.push(line.trim());
      }
    });

    return (
      <div className="space-y-3"> {/* Increased space for better separation */}
        {otherContent.map((line, idx) => <p key={`p-${idx}`} className="text-foreground/90 font-body leading-relaxed whitespace-pre-line">{line}</p>)}
        {listItems.length > 0 && (
          <ul className="list-disc list-inside pl-3 space-y-1.5 font-body text-foreground/90"> {/* Slightly more padding and list item space */}
            {listItems.map((item, idx) => <li key={`li-${idx}`}>{item}</li>)}
          </ul>
        )}
      </div>
    );
  };

  return (
    <Card className="mt-12 w-full max-w-4xl mx-auto shadow-xl animate-slide-in-up bg-card/90 backdrop-blur-sm">
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <BookOpenText className="h-8 w-8" />
            Your Custom Itinerary
          </CardTitle>
          <CardDescription className="font-body">Here's your AI-generated travel plan. Review, refine, or export it!</CardDescription>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
          <Button onClick={() => setShowRefineForm(!showRefineForm)} variant="outline" className="text-accent border-accent hover:bg-accent/10 font-body w-full sm:w-auto" disabled={isExportingPdf}>
            <Edit3 className="mr-2 h-4 w-4" /> {showRefineForm ? "Cancel Refine" : "Refine Itinerary"}
          </Button>
          <Button onClick={handleExportPdf} variant="outline" className="text-primary border-primary hover:bg-primary/10 font-body w-full sm:w-auto" disabled={isExportingPdf || isRefining}>
            {isExportingPdf ? <LoadingSpinner size={20} /> : <><Download className="mr-2 h-4 w-4" /> Export to PDF</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showRefineForm && (
          <Card className="mb-6 bg-secondary/50 p-2 sm:p-4 md:p-6 animate-fade-in">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-primary flex items-center gap-2"><Sparkles className="h-6 w-6"/>Refine Your Itinerary</CardTitle>
              <CardDescription className="font-body">Provide feedback on what you'd like to change or add.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...refineForm}>
                <form onSubmit={refineForm.handleSubmit(onRefineSubmit)} className="space-y-4">
                  <FormField control={refineForm.control} name="userFeedback" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-body">Your Feedback</FormLabel>
                      <FormControl><Textarea placeholder="e.g., 'Add more vegetarian food options', 'Include a visit to Eiffel Tower on Day 2'" {...field} className="min-h-[120px] font-body" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground font-body" disabled={isRefining || isExportingPdf}>
                    {isRefining ? <LoadingSpinner size={20} /> : "Submit Feedback"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
        
        {(isRefining && !showRefineForm) && (
           <div className="my-6 flex justify-center items-center min-h-[100px]"><LoadingSpinner size={32} text="Refining your itinerary..." /></div>
        )}

        <ScrollArea className="h-[600px] p-1 rounded-md border border-border">
          <div ref={itineraryContentRef} className="p-4 bg-white text-black"> {/* Ensures PDF content has white background and black text */}
            {otherSections.map((section, idx) => (
              <div key={`other-${idx}`} className="mb-6 p-4 border border-border rounded-lg shadow-sm bg-background">
                <h3 className="text-xl font-headline font-semibold text-primary mb-3 flex items-center">
                  <section.icon className="mr-3 h-6 w-6 text-primary/80" />
                  {section.title}
                </h3>
                {renderContent(section.content)}
              </div>
            ))}

            {daySections.length > 0 && (
              <Accordion type="multiple" className="w-full" defaultValue={daySections.map((_,idx) => `day-${idx}`)}>
                {daySections.map((section, idx) => (
                  <AccordionItem value={`day-${idx}`} key={`day-${idx}`} className="mb-2 border-b-0 last:mb-0">
                     <Card className="shadow-sm overflow-hidden"> {/* Added overflow-hidden to card */}
                        <AccordionTrigger className="p-4 hover:no-underline bg-background hover:bg-secondary/50 transition-colors rounded-t-lg">
                          <h3 className="text-xl font-headline font-semibold text-primary flex items-center">
                            <section.icon className="mr-3 h-6 w-6 text-primary/80" />
                            {section.title}
                          </h3>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-2 bg-background rounded-b-lg border-t border-border"> {/* Added pt-2 for less space after trigger */}
                          {renderContent(section.content)}
                        </AccordionContent>
                     </Card>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
            {/* Fallback for when no specific sections (days or others) are parsed */}
            {daySections.length === 0 && otherSections.length === 0 && itinerary && itinerary.trim() !== "" && (
                 <div className="mb-6 p-4 border border-border rounded-lg shadow-sm bg-background">
                    <h3 className="text-xl font-headline font-semibold text-primary mb-3 flex items-center">
                        <BookOpenText className="mr-3 h-6 w-6 text-primary/80" />
                        Generated Itinerary
                    </h3>
                    {renderContent(itinerary.split('\n'))}
                 </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
    