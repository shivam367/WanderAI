
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
import { format } from 'date-fns';

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
  id: string; // Unique ID for targeting with html2canvas
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

  let currentSection: Omit<Section, 'id'> | null = null;
  let currentPrimaryTitle = "Introduction"; 
  let sectionCounter = 0;

  const dayRegex = new RegExp(`^(Day\\s+\\d+.*?)[:]?$`, "i");
  const overviewRegex = new RegExp(`^(Overview)[:]?$`, "i");

  lines.forEach(line => {
    const trimmedLine = line.trim();
    let isNewPrimarySectionStart = false;

    const dayMatch = trimmedLine.match(dayRegex);
    if (dayMatch) {
      if (currentSection) parsedSections.push({...currentSection, id: `pdf-section-${sectionCounter++}`});
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
        if (currentSection) parsedSections.push({...currentSection, id: `pdf-section-${sectionCounter++}`});
        currentPrimaryTitle = "Overview";
        currentSection = {
          title: sectionKeywords["Overview"].title,
          icon: sectionKeywords["Overview"].icon,
          content: [],
          isDaySection: false,
        };
        isNewPrimarySectionStart = true;
      }
    }

    if (!isNewPrimarySectionStart) {
      if (!currentSection) {
        // Try to assign an ID to the initial non-day, non-overview block if it exists
        const introId = `pdf-section-intro-${sectionCounter}`;
        currentSection = {
          title: currentPrimaryTitle, // "Introduction"
          icon: BookOpenText, 
          content: [line],
          isDaySection: false, 
        };
         // We don't push here yet, might be more intro lines.
         // If the next line is a Day/Overview, this currentSection will be pushed.
      } else {
        currentSection.content.push(line);
      }
    }
  });

  if (currentSection) {
     // If the last section was an intro, ensure its ID is unique if not already set by counter
     const finalId = currentSection.title === "Introduction" && parsedSections.every(s => s.title !== "Introduction") 
                     ? `pdf-section-intro-${sectionCounter++}` 
                     : `pdf-section-${sectionCounter++}`;
     parsedSections.push({...currentSection, id: finalId});
  }
  
  // Ensure "Introduction" section (if it exists and is the first one) has a predictable ID for export
  const introIndex = parsedSections.findIndex(s => s.title === "Introduction" && !s.isDaySection);
  if (introIndex === 0 && parsedSections[introIndex].id.startsWith('pdf-section-') && !parsedSections[introIndex].id.includes('-intro-')) {
    parsedSections[introIndex].id = `pdf-section-intro-${parsedSections[introIndex].id.split('-').pop()}`;
  } else if (introIndex === -1 && parsedSections.length > 0 && !parsedSections[0].isDaySection && parsedSections[0].title !== "Overview") {
    // If no explicit "Introduction" title but there's content before Overview/Day 1
    if (!parsedSections[0].id.includes('-intro-')) {
        parsedSections[0].id = `pdf-section-intro-implicit-${parsedSections[0].id.split('-').pop()}`;
    }
    parsedSections[0].title = "Introduction"; // Label it as Introduction
    parsedSections[0].icon = BookOpenText;
  }
  
  // Remove empty introduction sections if an overview exists
  if (parsedSections.some(s => s.title === "Overview")) {
    const introIdx = parsedSections.findIndex(s => s.title === "Introduction" && s.content.every(c => c.trim() === ''));
    if (introIdx !== -1) {
        parsedSections.splice(introIdx, 1);
    }
  }
  
  return parsedSections.filter(s => s.content.some(c => c.trim() !== '') || (s.isDaySection && s.content.length >= 0) );
}


export function ItineraryDisplay({ itinerary, isLoading, isRefining, setIsRefining, onItineraryRefined, error, canRefine = true }: ItineraryDisplayProps) {
  const { toast } = useToast();
  const [showRefineForm, setShowRefineForm] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  
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
    if (!itinerary) {
      toast({ title: "Error", description: "No itinerary content to export.", variant: "destructive" });
      return;
    }
    setIsExportingPdf(true);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const PAGE_MARGIN_MM = 10; 
    const PDF_PAGE_WIDTH = pdf.internal.pageSize.getWidth();
    const PDF_PAGE_HEIGHT = pdf.internal.pageSize.getHeight();
    const MAX_CONTENT_WIDTH_MM = PDF_PAGE_WIDTH - 2 * PAGE_MARGIN_MM;

    let svgDataUrl = '';
    const svgLogoString = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#87CEEB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"></path><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"></path></svg>`;
    
    const tempSvgContainer = document.createElement('div');
    tempSvgContainer.id = 'temp-svg-container-for-pdf-export';
    tempSvgContainer.style.position = 'absolute';
    tempSvgContainer.style.left = '-9999px'; // Off-screen
    tempSvgContainer.style.width = '64px'; 
    tempSvgContainer.style.height = '64px';
    tempSvgContainer.innerHTML = svgLogoString;
    document.body.appendChild(tempSvgContainer);

    try {
      const svgElementToCapture = tempSvgContainer.querySelector('svg');
      if (svgElementToCapture) {
        const svgCanvas = await html2canvas(svgElementToCapture, { // Capture the SVG element itself
          scale: 2, // Capture at higher resolution for better quality
          backgroundColor: null, // Transparent background for the logo
          width: 64, 
          height: 64, 
          logging: false, 
        });
        svgDataUrl = svgCanvas.toDataURL('image/png');
      } else {
        throw new Error("SVG element not found in temporary container.");
      }
    } catch (e) {
      console.error("Error converting SVG logo to canvas image:", e);
      toast({ title: "PDF Logo Error", description: "Could not render the logo for the PDF. Check console.", variant: "destructive" });
    } finally {
      if (document.body.contains(tempSvgContainer)) {
          document.body.removeChild(tempSvgContainer);
      }
    }

    const LOGO_HEIGHT_MM = 8;
    const LOGO_WIDTH_MM = 8;
    const HEADER_TEXT_SPACING_MM = 2; 
    const HEADER_TOTAL_HEIGHT_MM = LOGO_HEIGHT_MM + 5; // Max height of logo or text + spacing

    const FOOTER_LINE_Y_OFFSET_FROM_BOTTOM_MARGIN = 10;
    const FOOTER_TEXT_Y_OFFSET_FROM_BOTTOM_MARGIN = 7;
    const FOOTER_TOTAL_HEIGHT_MM = 15; 

    const CONTENT_START_Y_MM = PAGE_MARGIN_MM + HEADER_TOTAL_HEIGHT_MM;
    const MAX_CONTENT_HEIGHT_ON_PAGE_MM = PDF_PAGE_HEIGHT - CONTENT_START_Y_MM - FOOTER_TOTAL_HEIGHT_MM - PAGE_MARGIN_MM;
    
    const generationTimestamp = format(new Date(), "MMMM d, yyyy 'at' h:mm a");

    const drawPageHeaderAndFooter = (currentPageNum: number) => {
      // Header
      const logoX = PAGE_MARGIN_MM;
      const logoY = PAGE_MARGIN_MM;
      if (svgDataUrl) {
        try { 
          pdf.addImage(svgDataUrl, 'PNG', logoX, logoY, LOGO_WIDTH_MM, LOGO_HEIGHT_MM); 
        } catch (imgError) { 
          console.error("Error adding SVG logo image to PDF page:", imgError); 
          pdf.setFont("Helvetica", "normal").setFontSize(8).text("[Logo]", logoX, logoY + LOGO_HEIGHT_MM / 2);
        }
      } else {
        pdf.setFont("Helvetica", "normal").setFontSize(8).text("[Logo]", logoX, logoY + LOGO_HEIGHT_MM / 2);
      }
      
      const textStartX = logoX + LOGO_WIDTH_MM + HEADER_TEXT_SPACING_MM;
      pdf.setFont("Helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(135, 206, 235); // Primary color #87CEEB
      pdf.text("WanderAI", textStartX, logoY + (LOGO_HEIGHT_MM / 2) - 1); 
      
      pdf.setFont("Helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(105, 105, 105); // Muted gray
      pdf.text("Your Personal AI Travel Planner", textStartX, logoY + (LOGO_HEIGHT_MM / 2) + 3); 
      pdf.setTextColor(0,0,0); // Reset to black for other text

      // Footer
      const footerLineY = PDF_PAGE_HEIGHT - PAGE_MARGIN_MM - FOOTER_LINE_Y_OFFSET_FROM_BOTTOM_MARGIN;
      pdf.setDrawColor(200, 200, 200); // Light gray line
      pdf.line(PAGE_MARGIN_MM, footerLineY, PDF_PAGE_WIDTH - PAGE_MARGIN_MM, footerLineY);

      pdf.setFont("Helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(128, 128, 128); // Gray text
      
      const pageNumText = `Page ${currentPageNum}`;
      const pageNumTextWidth = pdf.getStringUnitWidth(pageNumText) * pdf.getFontSize() / pdf.internal.scaleFactor;
      pdf.text(pageNumText, PDF_PAGE_WIDTH / 2 - pageNumTextWidth / 2, PDF_PAGE_HEIGHT - PAGE_MARGIN_MM - FOOTER_TEXT_Y_OFFSET_FROM_BOTTOM_MARGIN);

      const appInfoText = "WanderAI";
      pdf.text(appInfoText, PAGE_MARGIN_MM, PDF_PAGE_HEIGHT - PAGE_MARGIN_MM - FOOTER_TEXT_Y_OFFSET_FROM_BOTTOM_MARGIN);
      
      const dateTextWidth = pdf.getStringUnitWidth(generationTimestamp) * pdf.getFontSize() / pdf.internal.scaleFactor;
      pdf.text(generationTimestamp, PDF_PAGE_WIDTH - PAGE_MARGIN_MM - dateTextWidth, PDF_PAGE_HEIGHT - PAGE_MARGIN_MM - FOOTER_TEXT_Y_OFFSET_FROM_BOTTOM_MARGIN);
      pdf.setTextColor(0,0,0); // Reset text color
    };

    let currentPageNum = 0;
    let currentYOnPage = CONTENT_START_Y_MM; 
    const MAX_PDF_PAGES_PER_SECTION = 20; // Safety break

    const addContentToPage = async (elementId: string, isFirstSectionOverall: boolean, forceNewPageForThisSection: boolean) => {
      const element = document.getElementById(elementId);
      if (!element) {
        console.warn(`Element with ID ${elementId} not found for PDF export.`);
        return false; 
      }
      
      const accordionContentParent = element.closest('.radix-accordion-content');
      const scrollAreaViewPort = element.closest('.radix-scroll-area-viewport');
      let originalAccordionStyle = '';
      let originalElementDisplay = element.style.display;
      let originalScrollAreaViewportStyle = '';
      const tempPadding = '20px'; // Added padding to prevent cutting off bottom
      const originalElementPaddingBottom = element.style.paddingBottom;


      if (accordionContentParent instanceof HTMLElement) {
          originalAccordionStyle = accordionContentParent.style.cssText;
          accordionContentParent.style.setProperty('display', 'block', 'important');
          accordionContentParent.style.setProperty('height', 'auto', 'important');
          accordionContentParent.style.setProperty('visibility', 'visible', 'important');
          accordionContentParent.style.setProperty('overflow', 'visible', 'important');
      }
      if (element.classList.contains('radix-accordion-trigger') && element.offsetParent === null) {
        element.style.display = 'flex'; // Ensure trigger is displayable for capture if it's the target
      }
      if (scrollAreaViewPort instanceof HTMLElement) { // For the main scroll area
        originalScrollAreaViewportStyle = scrollAreaViewPort.style.cssText;
        scrollAreaViewPort.style.height = 'auto';
        scrollAreaViewPort.style.overflowY = 'visible';
      }
      
      element.style.paddingBottom = tempPadding; // Apply temporary padding

      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        width: element.offsetWidth, // Use offsetWidth
        height: element.scrollHeight, // scrollHeight will include padding
        windowWidth: element.scrollWidth, // Consider full scrollable width of element
        windowHeight: element.scrollHeight, // Consider full scrollable height of element
        logging: false,
      });

      element.style.paddingBottom = originalElementPaddingBottom; // Restore padding
      if (accordionContentParent instanceof HTMLElement) {
        accordionContentParent.style.cssText = originalAccordionStyle;
      }
      element.style.display = originalElementDisplay;
      if (scrollAreaViewPort instanceof HTMLElement) {
        scrollAreaViewPort.style.cssText = originalScrollAreaViewportStyle;
      }


      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeightRatio = imgProps.height / imgProps.width;
      
      // This is the total height the *entire captured image section* would take up in the PDF if drawn at full width
      const scaledImgHeightFullMm = MAX_CONTENT_WIDTH_MM * imgHeightRatio;
      if (scaledImgHeightFullMm <= 0) return true; // Nothing to draw for this section

      let imgPartStartYpx = 0; // Current Y position in the source canvas image (in pixels)

      if (isFirstSectionOverall) {
        currentPageNum = 1;
        drawPageHeaderAndFooter(currentPageNum);
        currentYOnPage = CONTENT_START_Y_MM;
      } else if (forceNewPageForThisSection) {
        pdf.addPage();
        currentPageNum++;
        drawPageHeaderAndFooter(currentPageNum);
        currentYOnPage = CONTENT_START_Y_MM;
      } else {
        // Check if there's enough space on the current page for a meaningful start
        const estimatedSpaceNeededForFirstChunk = Math.min(scaledImgHeightFullMm, MAX_CONTENT_HEIGHT_ON_PAGE_MM / 3); // Heuristic: need at least 1/3 page
        if (currentYOnPage + estimatedSpaceNeededForFirstChunk > (CONTENT_START_Y_MM + MAX_CONTENT_HEIGHT_ON_PAGE_MM) ) {
            pdf.addPage();
            currentPageNum++;
            drawPageHeaderAndFooter(currentPageNum);
            currentYOnPage = CONTENT_START_Y_MM;
        } else if (currentYOnPage > CONTENT_START_Y_MM) { 
            currentYOnPage += 3; // Small gap before next section on same page
        }
      }

      let pagesRenderedForThisSection = 0;

      while (imgPartStartYpx < imgProps.height) {
        if (pagesRenderedForThisSection >= MAX_PDF_PAGES_PER_SECTION) {
            console.warn(`PDF export truncated for section ${elementId} due to excessive pages.`);
            break;
        }
        
        let remainingPageHeightMm = (CONTENT_START_Y_MM + MAX_CONTENT_HEIGHT_ON_PAGE_MM) - currentYOnPage;
        
        if (remainingPageHeightMm <= 1) { // If practically no space left
            pdf.addPage();
            currentPageNum++;
            drawPageHeaderAndFooter(currentPageNum);
            currentYOnPage = CONTENT_START_Y_MM;
            remainingPageHeightMm = MAX_CONTENT_HEIGHT_ON_PAGE_MM; 
            pagesRenderedForThisSection++;
        }
        
        // This is the height of the *rest* of the image section, scaled to PDF width
        const remainingImageSectionHeightMm = ((imgProps.height - imgPartStartYpx) / imgProps.width) * MAX_CONTENT_WIDTH_MM;

        // How much of the image can we draw on the current PDF page?
        // It's the minimum of the space left on the page, and the actual remaining height of the image section.
        const heightOfImgPartToDrawMm = Math.min(
            remainingPageHeightMm,
            remainingImageSectionHeightMm
        );

        if (heightOfImgPartToDrawMm <= 0) { // No drawable content or no space
            break; 
        }
        // Convert the mm height to draw back to px height for the source canvas crop
        const heightOfImgPartToDrawPx = (heightOfImgPartToDrawMm / MAX_CONTENT_WIDTH_MM) * imgProps.width;

        pdf.addImage(
          imgData, 'PNG',
          PAGE_MARGIN_MM, currentYOnPage, // X, Y on PDF page
          MAX_CONTENT_WIDTH_MM, heightOfImgPartToDrawMm, // Width, Height on PDF page
          undefined, 'NONE', 0, // alias, compression, rotation
          // Source image cropping (all are in pixels of the source canvas)
          0, // sx (source X)
          imgPartStartYpx, // sy (source Y)
          imgProps.width, // sWidth (source width)
          heightOfImgPartToDrawPx // sHeight (source height)
        );
        
        imgPartStartYpx += heightOfImgPartToDrawPx;
        currentYOnPage += heightOfImgPartToDrawMm;

        // If there's more of this section's image to draw, and we're at the bottom of the current PDF page
        if (imgPartStartYpx < imgProps.height) { 
          if (currentYOnPage >= (CONTENT_START_Y_MM + MAX_CONTENT_HEIGHT_ON_PAGE_MM -1) ) { // -1 for a small buffer
             pdf.addPage();
             currentPageNum++;
             drawPageHeaderAndFooter(currentPageNum);
             currentYOnPage = CONTENT_START_Y_MM;
             pagesRenderedForThisSection++;
          }
        }
      }
      return true; // Successfully processed this section
    };

    try {
      const parsedSections = parseItinerary(itinerary || "");
      
      // Reorder sections: Intro, then Overview, then Day sections, then others.
      const introSection = parsedSections.find(s => s.title.toLowerCase() === "introduction" && !s.isDaySection);
      const overviewSection = parsedSections.find(s => s.title.toLowerCase() === "overview" && !s.isDaySection);
      const daySections = parsedSections.filter(s => s.isDaySection).sort((a, b) => {
          const dayA = parseInt(a.title.match(/Day (\d+)/i)?.[1] || "0");
          const dayB = parseInt(b.title.match(/Day (\d+)/i)?.[1] || "0");
          return dayA - dayB;
      });
      const otherSections = parsedSections.filter(s => 
          s.id !== introSection?.id && s.id !== overviewSection?.id && !s.isDaySection
      );

      const sectionsToExport: Section[] = [];
      if (introSection) sectionsToExport.push(introSection);
      if (overviewSection) sectionsToExport.push(overviewSection);
      sectionsToExport.push(...daySections);
      sectionsToExport.push(...otherSections);


      if (sectionsToExport.length === 0 && itinerary && itinerary.trim() !== "") {
         // Fallback for plain text itinerary if parsing somehow fails to produce sections
         sectionsToExport.push({
            id: "pdf-section-fallback", title: "Generated Itinerary", icon: BookOpenText, 
            content: itinerary.split('\n'), isDaySection: false 
         });
      }

      let isFirstContentBlockOverall = true;

      for (const section of sectionsToExport) {
        let forceNewPageForThisSection = false;
        const isIntro = section.title.toLowerCase() === "introduction";
        const isOverview = section.title.toLowerCase() === "overview";
        const isDay = section.isDaySection;
        
        if (isFirstContentBlockOverall) {
          forceNewPageForThisSection = false; // First block never forces a new page beyond the initial one
        } else if (isOverview || isDay) {
          // Overview, Day 1, Day 2... all start on new pages if they are not the very first content block.
          forceNewPageForThisSection = true;
        }
        // Other non-day, non-overview, non-intro sections will flow normally after the previous section.

        const success = await addContentToPage(section.id, isFirstContentBlockOverall, forceNewPageForThisSection);
        if (success) {
            isFirstContentBlockOverall = false;
        }
      }
      
      if (currentPageNum === 0) { // If no content was actually added (e.g., all sections were empty or had errors)
        currentPageNum = 1;
        drawPageHeaderAndFooter(currentPageNum);
        pdf.text("No content to export.", PAGE_MARGIN_MM, CONTENT_START_Y_MM + 10);
      }

      pdf.save('wanderai-itinerary.pdf');
      toast({ title: "Export Successful", description: `Your itinerary (${currentPageNum} page(s)) has been downloaded.`, className: "bg-primary text-primary-foreground" });

    } catch (err) {
      console.error("Error during PDF export:", err);
      toast({ title: "PDF Export Error", description: (err as Error).message || "Could not export itinerary. Check console.", variant: "destructive" });
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
  const introSection = parsedSections.find(s => s.title.toLowerCase() === "introduction" && !s.isDaySection);
  const overviewSection = parsedSections.find(s => s.title.toLowerCase() === "overview" && !s.isDaySection);
  const daySections = parsedSections.filter(s => s.isDaySection).sort((a,b) => {
      const dayA = parseInt(a.title.match(/Day (\d+)/i)?.[1] || "0");
      const dayB = parseInt(b.title.match(/Day (\d+)/i)?.[1] || "0");
      return dayA - dayB;
  });
  const otherNonDaySections = parsedSections.filter(s => 
      s.id !== introSection?.id && s.id !== overviewSection?.id && !s.isDaySection
  );
  
  const allSectionsInOrder: Section[] = [];
  if (introSection) allSectionsInOrder.push(introSection);
  if (overviewSection) allSectionsInOrder.push(overviewSection);
  allSectionsInOrder.push(...daySections);
  allSectionsInOrder.push(...otherNonDaySections);


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
        
        <div className="bg-background text-foreground p-1 rounded-md border border-input">
          <ScrollArea className="h-[600px] overflow-y-auto p-1" id="itinerary-scroll-area-for-pdf">
            <div className="space-y-1" id="itinerary-content-for-pdf">
              {allSectionsInOrder.map((section) => {
                const sectionHtmlId = section.id; 
                if (section.isDaySection) {
                   return (
                    <Accordion type="multiple" className="w-full" defaultValue={[sectionHtmlId]} key={sectionHtmlId}>
                        <AccordionItem value={sectionHtmlId} className="mb-1 border-b-0 last:mb-0">
                            <Card id={sectionHtmlId} className="shadow-sm overflow-hidden bg-background/90 text-foreground my-1">
                                <AccordionTrigger className="p-3 hover:no-underline hover:bg-secondary/30 transition-colors rounded-t-lg w-full">
                                    <h3 className="text-lg font-headline font-semibold text-primary flex items-center">
                                    <section.icon className="mr-2 h-5 w-5 text-primary/80 shrink-0" />
                                    {section.title}
                                    </h3>
                                </AccordionTrigger>
                                <AccordionContent className="p-3 pt-1 rounded-b-lg border-t border-border/50">
                                    {renderContent(section.content)}
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    </Accordion>
                   );
                } else { // For Introduction, Overview, and any other non-day sections
                    return (
                        <Card id={sectionHtmlId} key={sectionHtmlId} className="mb-1 p-3 shadow-sm bg-background/90 text-foreground">
                            <h3 className="text-lg font-headline font-semibold text-primary mb-2 flex items-center">
                                <section.icon className="mr-2 h-5 w-5 text-primary/80 shrink-0" />
                                {section.title}
                            </h3>
                            {renderContent(section.content)}
                        </Card>
                    );
                }
              })}
              {allSectionsInOrder.length === 0 && itinerary && itinerary.trim() !== "" && (
                  // Fallback rendering if parsing into sections somehow fails but itinerary text exists
                  <Card id="pdf-section-fallback" className="mb-1 p-3 shadow-sm bg-background/90 text-foreground">
                      <h3 className="text-lg font-headline font-semibold text-primary mb-2 flex items-center">
                          <BookOpenText className="mr-2 h-5 w-5 text-primary/80 shrink-0" />
                          Generated Itinerary
                      </h3>
                      {renderContent(itinerary.split('\n'))}
                  </Card>
              )}
            </div> 
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

