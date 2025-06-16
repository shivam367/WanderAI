
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
  "Overview": { title: "Overview", icon: BookOpenText, isDayKeyword: false }, 
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
  const parsedSections: Section[] = [];
  const lines = itineraryText.split('\n').filter(line => line.trim() !== '');

  let currentSection: Section | null = null;

  const dayRegex = new RegExp(`^(Day\\s+\\d+.*?)[:]?$`, "i"); 
  const overviewRegex = new RegExp(`^(Overview)[:]?$`, "i");  

  lines.forEach(line => {
    const trimmedLine = line.trim();
    let isNewPrimarySectionStart = false;

    const dayMatch = trimmedLine.match(dayRegex);
    if (dayMatch) {
      if (currentSection) parsedSections.push(currentSection);
      currentSection = {
        title: dayMatch[1].trim(), 
        icon: sectionKeywords["Day \\d+"].icon,
        content: [],
        isDaySection: true,
      };
      isNewPrimarySectionStart = true;
    } else {
      const overviewMatch = trimmedLine.match(overviewRegex);
      if (overviewMatch) {
        if (currentSection) parsedSections.push(currentSection);
        currentSection = {
          title: "Overview",
          icon: sectionKeywords["Overview"].icon,
          content: [],
          isDaySection: false,
        };
        isNewPrimarySectionStart = true;
      }
    }

    if (!isNewPrimarySectionStart) {
      if (currentSection) {
        currentSection.content.push(line); // Store raw line to preserve original spacing for pre-wrap
      } else {
        if (parsedSections.length === 0 || parsedSections[parsedSections.length - 1].title !== "Introduction") {
          currentSection = { title: "Introduction", icon: BookOpenText, content: [line], isDaySection: false };
        } else {
          currentSection = parsedSections[parsedSections.length - 1];
          currentSection.content.push(line);
        }
      }
    }
  });

  if (currentSection) {
    parsedSections.push(currentSection);
  }
  
  const introIndex = parsedSections.findIndex(s => s.title === "Introduction");
  if (introIndex !== -1 && parsedSections.some(s => s.title === "Overview")) {
    if (parsedSections[introIndex].content.every(c => c.trim() === '')) {
      parsedSections.splice(introIndex, 1);
    }
  }
  
  return parsedSections.filter(s => s.isDaySection || s.title === "Overview" || s.content.some(c => c.trim() !== ''));
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

  const processLineForBold = (line: string, keyPrefix: string): React.ReactNode[] => {
    const parts = line.split(/(\*\*.*?\*\*)/g); 
    return parts.filter(part => part.length > 0) 
      .map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={`${keyPrefix}-bold-${idx}-${Date.now()}`}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
  };
  
  const renderContent = (contentLines: string[]): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    let currentListItemGroup: React.ReactNode[][] = []; // Stores arrays of nodes for each li
  
    const listRegex = /^\s*(?:[-*\u2022]|\d+\.|\d+\))\s*(.*)/;
  
    const flushList = () => {
      if (currentListItemGroup.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}-${Date.now()}`} className="list-disc list-inside pl-4 my-2 space-y-1 font-body text-foreground/90">
            {currentListItemGroup.map((listItemNodes, idx) => (
              <li key={`li-item-${elements.length}-${idx}-${Date.now()}`}>{listItemNodes}</li>
            ))}
          </ul>
        );
        currentListItemGroup = [];
      }
    };
  
    contentLines.forEach((originalLine, lineIdx) => {
      let lineContentForProcessing = originalLine; // Keep leading/trailing spaces for pre-wrap if it's a paragraph
      if (originalLine.trim() === "") { // Handle empty lines or lines with only spaces if they are meant to be paragraph breaks
        flushList();
        elements.push(<p key={`p-empty-${elements.length}-line-${lineIdx}-${Date.now()}`} className="my-1">&nbsp;</p>); // Render an empty paragraph for space
        return;
      }
      
      lineContentForProcessing = originalLine.trimStart(); // Trim start for subheading/list detection
      let isSubheadingProcessed = false;

      for (const keyword in sectionKeywords) {
        if (sectionKeywords[keyword].isDayKeyword || keyword.toLowerCase() === "overview") continue;
        const subheadingRegex = new RegExp(`^(${keyword.replace(/\s/g, '\\s')}(?:\\s*Recommendations)?)\\s*:?(.*)`, "i");
        const match = lineContentForProcessing.match(subheadingRegex);
  
        if (match) {
          flushList();
          const subheadingTitle = match[1].trim();
          const { icon: IconComponent } = sectionKeywords[keyword];
          elements.push(
            <h4 key={`subhead-${elements.length}-${lineIdx}-${Date.now()}`} className="text-lg font-headline font-semibold text-primary/80 mt-4 mb-1.5 flex items-center">
              <IconComponent className="mr-2 h-5 w-5 text-primary/70 shrink-0" />
              {subheadingTitle}
            </h4>
          );
          lineContentForProcessing = match[2]?.trim() || ""; 
          isSubheadingProcessed = true;
          if (!lineContentForProcessing) break;
        }
      }
      if (isSubheadingProcessed && !lineContentForProcessing) return;
      
      let isList = false;
      let listItemText = "";
      let makeListItemContentBold = false;
  
      const directListMatch = lineContentForProcessing.match(listRegex);
      if (directListMatch) {
        isList = true;
        listItemText = directListMatch[1].trim();
      } else if (lineContentForProcessing.startsWith('**') && lineContentForProcessing.endsWith('**')) {
        const unboldedLine = lineContentForProcessing.slice(2, -2).trim();
        const potentialListMatchInsideBold = unboldedLine.match(listRegex);
        if (potentialListMatchInsideBold) {
          isList = true;
          listItemText = potentialListMatchInsideBold[1].trim();
          makeListItemContentBold = true;
        }
      }
  
      if (isList) {
        if (listItemText || makeListItemContentBold) { // Ensure we add li even if text is empty but bold marker was there
          let processedNodes = processLineForBold(listItemText, `li-content-${elements.length}-${currentListItemGroup.length}-line-${lineIdx}`);
          if (makeListItemContentBold) {
            processedNodes = [<strong key={`bold-wrapper-${lineIdx}-${Date.now()}`}>{processedNodes.length > 0 ? processedNodes : <>&nbsp;</>}</strong>];
          }
          currentListItemGroup.push(processedNodes);
        }
      } else {
        flushList(); 
        if (originalLine.trim()) { 
            elements.push(
              <p key={`p-${elements.length}-line-${lineIdx}-${Date.now()}`} className="text-foreground/90 font-body my-2 leading-relaxed whitespace-pre-line">
                {processLineForBold(originalLine, `p-content-${elements.length}-line-${lineIdx}`)}
              </p>
            );
        }
      }
    });
  
    flushList(); 
  
    if (elements.length === 0 && contentLines.some(l => l.trim() !== '')) {
        return [<p key={`no-details-provided-${Date.now()}`} className="text-muted-foreground font-body my-2">No specific details provided for this section.</p>];
    } else if (elements.length === 0) {
        return [<p key={`no-content-available-${Date.now()}`} className="text-muted-foreground font-body my-2">No content available for this section.</p>];
    }
    return elements;
  };


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
    
    setIsExportingPdf(true); // This will trigger UI changes (ScrollArea height) and button loading state

    // Allow DOM to update with ScrollArea at full height
    setTimeout(async () => {
      if (!itineraryContentRef.current) { // Double check ref after timeout
        setIsExportingPdf(false);
        toast({ title: "Error", description: "Export cancelled, content not found after delay.", variant: "destructive"});
        return;
      }
      try {
        const canvas = await html2canvas(itineraryContentRef.current, { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#ffffff',
          // Use the full scroll height of the content for the canvas
          windowHeight: itineraryContentRef.current.scrollHeight,
          windowWidth: itineraryContentRef.current.scrollWidth,
          scrollY: 0, // Capture from the top of the element
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfMargin = 10; 
        const pdfWidth = pdf.internal.pageSize.getWidth() - 2 * pdfMargin;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width; // Total height of the image scaled to PDF width
        const pageContentHeight = pdf.internal.pageSize.getHeight() - 2 * pdfMargin; // Usable height on one PDF page
        
        let currentImagePartY = 0; // The Y offset within the source canvas image
        let pageNumber = 0;

        while (currentImagePartY < imgProps.height) {
          if (pageNumber > 0) {
            pdf.addPage();
          }
          
          const sourceX = 0;
          const sourceY = currentImagePartY;
          const sourceWidth = imgProps.width;
          // Calculate how much of the source image height can fit on this PDF page
          const sourceHeightThatFitsOnPage = Math.min(imgProps.height - currentImagePartY, (pageContentHeight / pdfHeight) * imgProps.height);

          // Add the image segment to the PDF
          // We are adding the *entire* canvas image (imgData) each time, but jsPDF clips it based on pdfHeight.
          // For multi-page, we need to adjust the y-position of where the *entire* image is placed on the *new* page.
          // The y-position for addImage on subsequent pages should be negative, shifting the full image upwards.
          const yPositionOnPdfPage = pageNumber === 0 ? pdfMargin : pdfMargin - (currentImagePartY / imgProps.height * pdfHeight);

          pdf.addImage(imgData, 'PNG', pdfMargin, yPositionOnPdfPage, pdfWidth, pdfHeight);
          
          currentImagePartY += sourceHeightThatFitsOnPage;
          pageNumber++;

          // Safety break for very long content, though jsPDF handles many pages
          if (pageNumber > 50) { 
            toast({ title: "Warning", description: "PDF export truncated due to excessive length.", variant: "destructive" });
            break; 
          }
        }

        pdf.save('wanderai-itinerary.pdf');
        toast({ title: "Export Successful", description: "Your itinerary has been downloaded as a PDF.", className: "bg-primary text-primary-foreground" });
      } catch (err) {
        console.error("Error exporting PDF:", err);
        toast({ title: "PDF Export Error", description: (err as Error).message || "Could not export itinerary to PDF.", variant: "destructive"});
      } finally {
        setIsExportingPdf(false); // Revert UI changes and button loading state
      }
    }, 300); // Increased delay slightly for DOM updates
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
          <Button onClick={() => setShowRefineForm(!showRefineForm)} variant="outline" className="text-accent border-accent hover:bg-accent/10 font-body w-full sm:w-auto" disabled={isRefining || isExportingPdf}>
            <Edit3 className="mr-2 h-4 w-4" /> {showRefineForm ? "Cancel Refine" : "Refine Itinerary"}
          </Button>
          <Button onClick={handleExportPdf} variant="outline" className="text-primary border-primary hover:bg-primary/10 font-body w-full sm:w-auto" disabled={isRefining || isExportingPdf}>
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

        <div ref={itineraryContentRef} className="bg-white text-black p-4 rounded-md border border-border">
          {/* ScrollArea's height is now conditional for PDF export */}
          <ScrollArea className={`p-1 ${isExportingPdf ? 'h-auto overflow-y-visible' : 'h-[600px] overflow-y-auto'}`}> 
            {otherSections.map((section, idx) => (
              <div key={`other-${idx}-${Date.now()}`} className="mb-6 p-4 border border-border rounded-lg shadow-sm bg-background text-foreground">
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
                  <AccordionItem value={`day-${idx}`} key={`day-${idx}-${Date.now()}`} className="mb-2 border-b-0 last:mb-0">
                     <Card className="shadow-sm overflow-hidden bg-background text-foreground">
                        <AccordionTrigger className="p-4 hover:no-underline hover:bg-secondary/50 transition-colors rounded-t-lg">
                          <h3 className="text-xl font-headline font-semibold text-primary flex items-center">
                            <section.icon className="mr-3 h-6 w-6 text-primary/80" />
                            {section.title}
                          </h3>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-2 rounded-b-lg border-t border-border">
                          {renderContent(section.content)}
                        </AccordionContent>
                     </Card>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
            {daySections.length === 0 && otherSections.length === 0 && itinerary && itinerary.trim() !== "" && (
                 <div className="mb-6 p-4 border border-border rounded-lg shadow-sm bg-background text-foreground">
                    <h3 className="text-xl font-headline font-semibold text-primary mb-3 flex items-center">
                        <BookOpenText className="mr-3 h-6 w-6 text-primary/80" />
                        Generated Itinerary
                    </h3>
                    {renderContent(itinerary.split('\n'))}
                 </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
    

    

    

    

    

    

    