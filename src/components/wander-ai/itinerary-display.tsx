
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
import { BookOpenText, Edit3, Sparkles, Lightbulb, Utensils, BedDouble, MountainSnow, Building2, Download, FileText } from "lucide-react";
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
  canRefine?: boolean;
}

interface Section {
  title: string;
  icon: React.ElementType;
  content: string[];
  isDaySection?: boolean;
}

const sectionKeywords: Record<string, { title: string, icon: React.ElementType, isDayKeyword?: boolean }> = {
  "Day \\d+": { title: "Day {N}", icon: CalendarDaysIcon, isDayKeyword: true },
  "Overview": { title: "Overview", icon: FileText, isDayKeyword: false },
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
  const lines = itineraryText.split('\n').filter(line => line.trim() !== '' || line === ''); 

  let currentSection: Section | null = null;
  let currentPrimaryTitle = "Introduction"; 

  const dayRegex = new RegExp(`^(Day\\s+\\d+.*?)[:]?$`, "i");
  const overviewRegex = new RegExp(`^(Overview)[:]?$`, "i");

  lines.forEach(line => {
    const trimmedLine = line.trim();
    let isNewPrimarySectionStart = false;

    const dayMatch = trimmedLine.match(dayRegex);
    if (dayMatch) {
      if (currentSection) parsedSections.push(currentSection);
      currentPrimaryTitle = dayMatch[1].trim();
      currentSection = {
        title: currentPrimaryTitle,
        icon: sectionKeywords["Day \\d+"].icon,
        content: [],
        isDaySection: true,
      };
      isNewPrimarySectionStart = true;
    } else {
      const overviewMatch = trimmedLine.match(overviewRegex);
      if (overviewMatch) {
        if (currentSection) parsedSections.push(currentSection);
        currentPrimaryTitle = "Overview";
        currentSection = {
          title: currentPrimaryTitle,
          icon: sectionKeywords["Overview"].icon,
          content: [],
          isDaySection: false,
        };
        isNewPrimarySectionStart = true;
      }
    }

    if (!isNewPrimarySectionStart) {
      if (!currentSection) {
        // This handles text that might appear before any recognized section like "Overview" or "Day X"
        currentSection = {
          title: currentPrimaryTitle, // Could be "Introduction" or the first line itself if it's not a keyword
          icon: BookOpenText, // Default icon for such introductory content
          content: [line],
          isDaySection: false, // Assuming non-day section initially
        };
      } else {
        currentSection.content.push(line);
      }
    }
  });

  if (currentSection) {
    parsedSections.push(currentSection);
  }
  
  // Clean up potentially empty "Introduction" section if an "Overview" also exists
  const introIndex = parsedSections.findIndex(s => s.title === "Introduction" && !s.isDaySection);
  if (introIndex !== -1 && parsedSections.some(s => s.title === "Overview")) {
    // If introduction content is just whitespace or effectively empty, remove it.
    if (parsedSections[introIndex].content.every(c => c.trim() === '')) {
      parsedSections.splice(introIndex, 1);
    }
  }
  
  return parsedSections.filter(s => s.content.some(c => c.trim() !== '') || (s.isDaySection && s.content.length >= 0) );
}


export function ItineraryDisplay({ itinerary, isLoading, isRefining, setIsRefining, onItineraryRefined, error, canRefine = true }: ItineraryDisplayProps) {
  const { toast } = useToast();
  const [showRefineForm, setShowRefineForm] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const itineraryContentRef = useRef<HTMLDivElement>(null); // Ref for the main content container

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
    let currentListItemGroup: React.ReactNode[][] = [];

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
      const trimmedStartLine = originalLine.trimStart();
      let lineContentForProcessing = originalLine;
      let isSubheadingProcessed = false;

      if (!trimmedStartLine.match(/^(Day\s+\d+|Overview)/i)) {
        for (const keyword in sectionKeywords) {
          if (sectionKeywords[keyword].isDayKeyword || keyword.toLowerCase() === "overview") continue;
          const subheadingRegex = new RegExp(`^(${keyword.replace(/\\/g, '\\\\').replace(/\s/g, '\\s')}(?:\\s*Recommendations|\\s*Suggestions)?)\\s*:?(.*)`, "i");
          const match = trimmedStartLine.match(subheadingRegex);

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
      }
      if (isSubheadingProcessed && !lineContentForProcessing) return;

      let isList = false;
      let listItemText = "";
      let makeListItemContentBold = false;

      const directListMatch = lineContentForProcessing.match(listRegex) || (isSubheadingProcessed ? "" : trimmedStartLine.match(listRegex));

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
         if (listItemText || makeListItemContentBold) {
           let processedNodes = processLineForBold(listItemText, `li-content-${elements.length}-${currentListItemGroup.length}-line-${lineIdx}`);
           if (makeListItemContentBold) {
             processedNodes = [<strong key={`bold-wrapper-${lineIdx}-${Date.now()}`}>{processedNodes.length > 0 ? processedNodes : <>&nbsp;</>}</strong>];
           }
           currentListItemGroup.push(processedNodes);
         }
      } else {
        flushList();
        if (lineContentForProcessing.trim()) {
            elements.push(
              <p key={`p-${elements.length}-line-${lineIdx}-${Date.now()}`} className="text-foreground/90 font-body my-2 leading-relaxed whitespace-pre-line">
                {processLineForBold(lineContentForProcessing, `p-content-${elements.length}-line-${lineIdx}`)}
              </p>
            );
        } else if (originalLine === '') {
           elements.push(<p key={`p-empty-${elements.length}-line-${lineIdx}-${Date.now()}`} className="my-1">&nbsp;</p>);
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
    setIsExportingPdf(true);

    let svgDataUrl = '';
    const svgLogoString = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#87CEEB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"></path><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"></path></svg>`;
    const svgContainer = document.createElement('div');
    svgContainer.style.position = 'absolute';
    svgContainer.style.left = '-9999px';
    svgContainer.style.top = '-9999px';
    svgContainer.style.width = '64px';
    svgContainer.style.height = '64px';
    svgContainer.innerHTML = svgLogoString;
    document.body.appendChild(svgContainer);

    try {
      const svgCanvas = await html2canvas(svgContainer, { backgroundColor: null, width: 64, height: 64, scale: 1 });
      svgDataUrl = svgCanvas.toDataURL('image/png');
    } catch (e) {
      console.error("Error converting SVG logo to canvas image:", e);
      toast({ title: "PDF Export Error", description: "Could not render logo for PDF. Check console for details.", variant: "destructive" });
    } finally {
      if (document.body.contains(svgContainer)) document.body.removeChild(svgContainer);
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const ptToMm = (pt: number) => pt * 0.352778;
    const pageMarginMm = 10;
    
    // Header details
    const logoPdfWidthMm = 10;
    const logoPdfHeightMm = 10;
    const textSpacingMm = 2;
    const appNameText = "WanderAI";
    const taglineText = "Your Personal AI Travel Planner";
    const appNameFontSizePt = 12;
    const taglineFontSizePt = 8;
    const headerTopMarginMm = pageMarginMm;
    const headerLeftMarginMm = pageMarginMm;
    const appNameXMm = headerLeftMarginMm + logoPdfWidthMm + textSpacingMm;
    const appNameBaselineYMm = headerTopMarginMm + (logoPdfHeightMm / 2) + (ptToMm(appNameFontSizePt) * 0.35); // Approx center of logo height
    const taglineBaselineYMm = appNameBaselineYMm + ptToMm(taglineFontSizePt) + ptToMm(1); // Below app name
    const headerBottomYMm = Math.max(headerTopMarginMm + logoPdfHeightMm, taglineBaselineYMm + ptToMm(taglineFontSizePt * 0.25));
    const contentStartYOnPageMm = headerBottomYMm + 5; // 5mm gap below header

    const drawPageHeader = () => {
      if (svgDataUrl) {
        try {
          pdf.addImage(svgDataUrl, 'PNG', headerLeftMarginMm, headerTopMarginMm, logoPdfWidthMm, logoPdfHeightMm);
        } catch (e) {
          console.error("Error adding SVG image to PDF:", e);
          pdf.setFont("Helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(150,0,0);
          pdf.text("[LOGO ERR]", headerLeftMarginMm, headerTopMarginMm + logoPdfHeightMm/2); pdf.setTextColor(0,0,0);
        }
      } else {
        pdf.setFont("Helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(128,128,128);
        pdf.text("[LOGO]", headerLeftMarginMm, headerTopMarginMm + logoPdfHeightMm/2); pdf.setTextColor(0,0,0);
      }
      pdf.setFont("Helvetica", "bold"); pdf.setFontSize(appNameFontSizePt); pdf.setTextColor(135, 206, 235); // Sky Blue
      pdf.text(appNameText, appNameXMm, appNameBaselineYMm);
      pdf.setFont("Helvetica", "normal"); pdf.setFontSize(taglineFontSizePt); pdf.setTextColor(105, 105, 105); // Dim Gray
      pdf.text(taglineText, appNameXMm, taglineBaselineYMm);
      pdf.setTextColor(0,0,0); // Reset color
    };
    
    const addElementContentToPdf = async (element: HTMLElement, isFirstBlockOverall: boolean) => {
      if (!element) return 0;
      let pagesUsedForThisBlock = 0;
      
      // Temporarily ensure the accordion content is visible for capture if it's inside one
      const accordionContentParent = element.closest('.radix-accordion-content');
      let originalAccordionStyle = '';
      if (accordionContentParent instanceof HTMLElement) {
          originalAccordionStyle = accordionContentParent.style.cssText;
          accordionContentParent.style.setProperty('display', 'block', 'important');
          accordionContentParent.style.setProperty('height', 'auto', 'important');
          accordionContentParent.style.setProperty('visibility', 'visible', 'important');
          accordionContentParent.style.setProperty('overflow', 'visible', 'important');
      }


      const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: element.offsetWidth, // Capture based on actual element width
          height: element.scrollHeight, // Capture full scrollable height of the element
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight,
      });

      if (accordionContentParent instanceof HTMLElement) {
          accordionContentParent.style.cssText = originalAccordionStyle;
      }

      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const imageStripWidthOnPageMm = pdf.internal.pageSize.getWidth() - 2 * pageMarginMm;
      const totalImageStripHeightPdfUnits = (imgProps.height * imageStripWidthOnPageMm) / imgProps.width;
      
      let currentImagePartYSrcPixels = 0;
      let isFirstPageOfThisBlock = true;

      while (currentImagePartYSrcPixels < imgProps.height) {
          if (isFirstPageOfThisBlock) {
              if (!isFirstBlockOverall) { // If not the very first block in the PDF, start a new page
                  pdf.addPage();
              }
              isFirstPageOfThisBlock = false;
          } else { // Subsequent pages for this current block
              pdf.addPage();
          }
          pagesUsedForThisBlock++;
          drawPageHeader();

          const currentPageHeightMm = pdf.internal.pageSize.getHeight();
          const pageRenderableHeightForImageMm = currentPageHeightMm - contentStartYOnPageMm - pageMarginMm;
          const scrollAmountPdfUnits = (currentImagePartYSrcPixels / imgProps.height) * totalImageStripHeightPdfUnits;
          const yOffsetForImageStripMm = contentStartYOnPageMm - scrollAmountPdfUnits;

          pdf.addImage(imgData, 'PNG', pageMarginMm, yOffsetForImageStripMm, imageStripWidthOnPageMm, totalImageStripHeightPdfUnits);

          if (totalImageStripHeightPdfUnits > 0) {
              currentImagePartYSrcPixels += (pageRenderableHeightForImageMm / totalImageStripHeightPdfUnits) * imgProps.height;
          } else {
              currentImagePartYSrcPixels = imgProps.height; // Prevent infinite loop if height is 0
          }
           if (pagesUsedForThisBlock > 20) { // Safety break per block
            console.warn("PDF export truncated for a block due to excessive length.");
            break;
          }
      }
      return pagesUsedForThisBlock;
    };

    let isFirstBlockBeingProcessed = true;
    const maxTotalPages = 50; // Safety break for total PDF pages
    let totalPagesGenerated = 0;

    // Determine the order of sections for PDF export
    const parsedSectionsForPdf = parseItinerary(itinerary || "");
    const sectionElementsToCapture: {id: string, element: HTMLElement | null}[] = [];

    const introElement = document.getElementById('pdf-export-intro');
    if (introElement) sectionElementsToCapture.push({id: 'pdf-export-intro', element: introElement});

    parsedSectionsForPdf.forEach((section, idx) => {
        if (section.title.toLowerCase() === "overview" && !section.isDaySection) {
            const overviewEl = document.getElementById(`pdf-export-overview-${idx}`);
            if (overviewEl) sectionElementsToCapture.push({id: `pdf-export-overview-${idx}`, element: overviewEl});
        } else if (section.isDaySection) {
            // Find the ID based on the original daySections array structure, if possible
            // This relies on the order of parsedSectionsForPdf matching the rendering order.
            // A more robust way would be to pass the index from parsedSectionsForPdf.
            // For now, let's assume the index in parsedSectionsForPdf corresponds to 'day-idx' if it's a day section.
            const dayCardEl = document.getElementById(`pdf-export-day-${idx}`); // Potential issue if idx doesn't map directly
            if (dayCardEl) sectionElementsToCapture.push({id:`pdf-export-day-${idx}`, element: dayCardEl});
        }
    });
    
    // Correctly map day section IDs from their original rendering index
    const daySectionElements = [];
    const renderedDaySections = parsedSections.filter(s => s.isDaySection); // The array used for rendering
    renderedDaySections.forEach((_, originalRenderIdx) => {
        const dayCardEl = document.getElementById(`pdf-export-day-${originalRenderIdx}`);
        if(dayCardEl && !sectionElementsToCapture.find(s => s.id === `pdf-export-day-${originalRenderIdx}`)){ // Ensure not duplicated if overview was also a 'day'
            daySectionElements.push({id: `pdf-export-day-${originalRenderIdx}`, element: dayCardEl});
        }
    });
    
    // Build the final list, ensuring Overview comes before Days if both exist.
    const finalElementsToCapture : {id: string, element: HTMLElement | null}[] = [];
    if (introElement) finalElementsToCapture.push({id: 'pdf-export-intro', element: introElement});
    
    const overviewRenderIdx = parsedSectionsForPdf.findIndex(s => s.title.toLowerCase() === "overview" && !s.isDaySection);
    if (overviewRenderIdx !== -1) {
        const overviewEl = document.getElementById(`pdf-export-overview-${overviewRenderIdx}`);
        if (overviewEl) finalElementsToCapture.push({id: `pdf-export-overview-${overviewRenderIdx}`, element: overviewEl});
    }
    
    renderedDaySections.forEach((_, originalRenderIdx) => {
        const dayCardEl = document.getElementById(`pdf-export-day-${originalRenderIdx}`);
        if(dayCardEl){
            finalElementsToCapture.push({id: `pdf-export-day-${originalRenderIdx}`, element: dayCardEl});
        }
    });
    
    // Remove duplicates by ID, preserving order
    const uniqueFinalElementsToCapture = finalElementsToCapture.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
    );


    try {
        for (const { element } of uniqueFinalElementsToCapture) {
            if (totalPagesGenerated >= maxTotalPages) {
                toast({ title: "Warning", description: "PDF export truncated due to maximum page limit.", variant: "destructive" });
                break;
            }
            if (element) {
                const pagesUsed = await addElementContentToPdf(element, isFirstBlockBeingProcessed);
                if (pagesUsed > 0) {
                    isFirstBlockBeingProcessed = false; // Only the very first block doesn't trigger an initial addPage
                    totalPagesGenerated += pagesUsed;
                }
            }
        }

        if (totalPagesGenerated === 0 && uniqueFinalElementsToCapture.length === 0) { // Nothing was processed
            drawPageHeader(); // Draw header on the first page
            pdf.text("No content to export.", pageMarginMm, contentStartYOnPageMm + 10);
            totalPagesGenerated = 1;
        } else if (totalPagesGenerated === 0 && uniqueFinalElementsToCapture.length > 0) { // Content existed but addElementToPdf returned 0 pages (e.g. all elements were null or empty)
            drawPageHeader();
            pdf.text("Selected content was empty or could not be rendered.", pageMarginMm, contentStartYOnPageMm + 10);
            totalPagesGenerated = 1;
        }


        pdf.save('wanderai-itinerary.pdf');
        toast({ title: "Export Successful", description: `Your itinerary (${totalPagesGenerated} page(s)) has been downloaded as a PDF.`, className: "bg-primary text-primary-foreground" });

    } catch (err) {
        console.error("Error during PDF export loop:", err);
        toast({ title: "PDF Export Error", description: (err as Error).message || "Could not export itinerary to PDF. Check console.", variant: "destructive"});
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
  const otherSections = parsedSections.filter(s => !s.isDaySection && s.title.toLowerCase() === "overview");
  // Ensure introSection correctly captures content that isn't "Overview" or a "Day" section
  const introSection = parsedSections.find(s => !s.isDaySection && s.title.toLowerCase() !== "overview");


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
          {canRefine && (
            <Button onClick={() => setShowRefineForm(!showRefineForm)} variant="outline" className="text-accent border-accent hover:bg-accent/10 font-body w-full sm:w-auto" disabled={isRefining || isExportingPdf}>
              <Edit3 className="mr-2 h-4 w-4" /> {showRefineForm ? "Cancel Refine" : "Refine Itinerary"}
            </Button>
          )}
          <Button onClick={handleExportPdf} variant="outline" className="text-primary border-primary hover:bg-primary/10 font-body w-full sm:w-auto" disabled={isRefining || isExportingPdf}>
            {isExportingPdf ? <LoadingSpinner size={20} /> : <><Download className="mr-2 h-4 w-4" /> Export to PDF</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {canRefine && showRefineForm && (
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
        
        {/* This div is the one `itineraryContentRef` refers to. It contains all displayable itinerary parts. */}
        <div ref={itineraryContentRef} className="bg-white text-black p-4 rounded-md border border-border">
           {/* The ScrollArea is primarily for on-screen viewing. PDF capture targets elements within. */}
          <ScrollArea className="h-[600px] overflow-y-auto p-1">
            <div className="space-y-4"> {/* Added space-y-4 for better visual separation of blocks */}
              {introSection && (
                  <div id="pdf-export-intro" key={`intro-${Date.now()}`} className="mb-6 p-4 border border-input rounded-lg shadow-sm bg-background text-foreground">
                      <h3 className="text-xl font-headline font-semibold text-primary mb-3 flex items-center">
                          <introSection.icon className="mr-3 h-6 w-6 text-primary/80" />
                          {introSection.title}
                      </h3>
                      {renderContent(introSection.content)}
                  </div>
              )}
              {otherSections.map((section, idx) => (
                // Ensure overview sections are uniquely identifiable if multiple could exist (though typically one)
                <div id={`pdf-export-overview-${idx}`} key={`overview-${idx}-${Date.now()}`} className="mb-6 p-4 border border-input rounded-lg shadow-sm bg-background text-foreground">
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
                       {/* ID added to the Card which contains all visual elements for a day */}
                      <Card id={`pdf-export-day-${idx}`} className="shadow-sm overflow-hidden bg-background text-foreground">
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
              {/* Fallback for itineraries that might not be parsed into sections by parseItinerary */}
              {daySections.length === 0 && otherSections.length === 0 && !introSection && itinerary && itinerary.trim() !== "" && (
                  <div id="pdf-export-fallback-full" className="mb-6 p-4 border border-input rounded-lg shadow-sm bg-background text-foreground">
                      <h3 className="text-xl font-headline font-semibold text-primary mb-3 flex items-center">
                          <BookOpenText className="mr-3 h-6 w-6 text-primary/80" />
                          Generated Itinerary
                      </h3>
                      {renderContent(itinerary.split('\n'))}
                  </div>
              )}
            </div> 
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

