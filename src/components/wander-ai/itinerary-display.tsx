
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
import { BookOpenText, Edit3, Sparkles, Lightbulb, Utensils, BedDouble, MountainSnow, Building2, Download, FileText, MapPin, AlertTriangle } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

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

const sectionKeywordsForDisplay: Record<string, { title: string, icon: React.ElementType, isDayKeyword?: boolean, pdfIcon?: string }> = {
  "Day \\d+": { title: "Day {N}", icon: CalendarDaysIcon, isDayKeyword: true, pdfIcon: "🗓️" },
  "Overview": { title: "Overview", icon: FileText, isDayKeyword: false, pdfIcon: "📄" },
  "Activities": { title: "Activities & Attractions", icon: MountainSnow, pdfIcon: "🏔️" },
  "Attractions": { title: "Activities & Attractions", icon: MountainSnow, pdfIcon: "🏞️" },
  "Food Recommendations": { title: "Food Recommendations", icon: Utensils, pdfIcon: "🍽️" },
  "Food": { title: "Food Recommendations", icon: Utensils, pdfIcon: "🍲" },
  "Hotel Suggestions": { title: "Hotel Suggestions", icon: BedDouble, pdfIcon: "🏨" },
  "Accommodation": { title: "Hotel Suggestions", icon: BedDouble, pdfIcon: "🛏️" },
  "Hotels": { title: "Hotel Suggestions", icon: BedDouble, pdfIcon: "🏨" },
  "Local Tips": { title: "Local Tips & Advice", icon: Lightbulb, pdfIcon: "💡" },
  "Tips": { title: "Local Tips & Advice", icon: Lightbulb, pdfIcon: "📌" },
  "Transportation": { title: "Transportation", icon: Building2, pdfIcon: "🚗" }
};

interface HtmlSection {
  title: string;
  icon: React.ElementType;
  content: string[];
  isDaySection?: boolean;
  id: string;
  isIntro?: boolean;
  isOverview?: boolean;
}

function parseItineraryForHtmlDisplay(itineraryText: string): HtmlSection[] {
  const parsedSections: HtmlSection[] = [];
  const lines = itineraryText.split('\n').filter(line => line.trim() !== '' || line === ''); 

  let currentSection: Omit<HtmlSection, 'id'> | null = null;
  let currentPrimaryTitle = "Introduction"; 
  let sectionCounter = 0;

  const dayRegex = new RegExp(`^(Day\\s+\\d+.*?)[:]?$`, "i");
  const overviewRegex = new RegExp(`^(Overview)[:]?$`, "i");

  lines.forEach(line => {
    const trimmedLine = line.trim();
    let isNewPrimarySectionStart = false;

    const dayMatch = trimmedLine.match(dayRegex);
    if (dayMatch) {
      if (currentSection) parsedSections.push({...currentSection, id: `html-section-day-${sectionCounter++}`});
      currentPrimaryTitle = dayMatch[1].trim();
      currentSection = {
        title: currentPrimaryTitle,
        icon: sectionKeywordsForDisplay["Day \\d+"].icon,
        content: [],
        isDaySection: true,
      };
      isNewPrimarySectionStart = true;
    } else {
      const overviewMatch = trimmedLine.match(overviewRegex);
      if (overviewMatch) {
        if (currentSection) parsedSections.push({...currentSection, id: `html-section-overview-${sectionCounter++}`});
        currentPrimaryTitle = "Overview";
        currentSection = {
          title: sectionKeywordsForDisplay["Overview"].title,
          icon: sectionKeywordsForDisplay["Overview"].icon,
          content: [],
          isDaySection: false,
          isOverview: true,
        };
        isNewPrimarySectionStart = true;
      }
    }

    if (!isNewPrimarySectionStart) {
      if (!currentSection) {
        currentSection = {
          title: currentPrimaryTitle, 
          icon: BookOpenText, 
          content: [line],
          isDaySection: false, 
          isIntro: true,
        };
      } else {
        currentSection.content.push(line);
      }
    }
  });

  if (currentSection) {
     const finalIdSuffix = currentSection.isDaySection ? `day-${sectionCounter++}` : (currentSection.isOverview ? `overview-${sectionCounter++}` : `intro-${sectionCounter++}`);
     parsedSections.push({...currentSection, id: `html-section-${finalIdSuffix}`});
  }
  
  if (parsedSections.length > 0 && !parsedSections[0].isDaySection && !parsedSections[0].isOverview && !parsedSections[0].isIntro) {
    parsedSections[0].isIntro = true;
    parsedSections[0].title = "Introduction";
    parsedSections[0].icon = BookOpenText;
    parsedSections[0].id = `html-section-intro-implicit-${parsedSections[0].id.split('-').pop()}`;
  } else if (parsedSections.findIndex(s => s.isIntro) === -1 && parsedSections.length > 0 && !parsedSections[0].isDaySection && !parsedSections[0].isOverview) {
     parsedSections[0].isIntro = true;
     parsedSections[0].title = "Introduction";
     parsedSections[0].icon = BookOpenText;
     parsedSections[0].id = `html-section-intro-fallback-${parsedSections[0].id.split('-').pop()}`;
  }

  if (parsedSections.some(s => s.isOverview)) {
    const introIdx = parsedSections.findIndex(s => s.isIntro && s.content.every(c => c.trim() === ''));
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

  const renderContentForHtml = (contentLines: string[]): JSX.Element[] => {
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
        for (const keyword in sectionKeywordsForDisplay) {
          if (sectionKeywordsForDisplay[keyword].isDayKeyword || keyword.toLowerCase() === "overview") continue;
          const subheadingRegex = new RegExp(`^(${keyword.replace(/\\/g, '\\\\').replace(/\s/g, '\\s')}(?:\\s*Recommendations|\\s*Suggestions)?)\\s*:?(.*)`, "i");
          const match = trimmedStartLine.match(subheadingRegex);

          if (match) {
            flushList();
            const subheadingTitle = match[1].trim();
            const { icon: IconComponent } = sectionKeywordsForDisplay[keyword];
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
    const PAGE_MARGIN_MM = 15;
    const PDF_PAGE_WIDTH = pdf.internal.pageSize.getWidth();
    const PDF_PAGE_HEIGHT = pdf.internal.pageSize.getHeight();
    const MAX_CONTENT_WIDTH_MM = PDF_PAGE_WIDTH - 2 * PAGE_MARGIN_MM;

    // --- Logo Capture ---
    let svgDataUrl = '';
    const svgLogoString = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#87CEEB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"></path><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"></path></svg>`;
    
    const tempSvgContainer = document.createElement('div');
    tempSvgContainer.id = 'temp-svg-container-for-pdf-export';
    tempSvgContainer.style.position = 'absolute';
    tempSvgContainer.style.left = '-9999px';
    tempSvgContainer.style.width = '64px'; 
    tempSvgContainer.style.height = '64px';
    tempSvgContainer.innerHTML = svgLogoString;
    document.body.appendChild(tempSvgContainer);

    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Increased delay for rendering

      const svgCanvas = await html2canvas(tempSvgContainer, { // Capture the container
        scale: 2, // Capture at higher res
        backgroundColor: null, // Transparent background
        width: 64, 
        height: 64,
        logging: false,
      });
      svgDataUrl = svgCanvas.toDataURL('image/png');
    } catch (e) {
      console.error("Error converting SVG logo to canvas image:", e);
      toast({ title: "PDF Logo Error", description: `Could not render the logo. Error: ${(e as Error).message}. Using text fallback.`, variant: "destructive" });
    } finally {
      if (document.body.contains(tempSvgContainer)) {
        document.body.removeChild(tempSvgContainer);
      }
    }
    // --- End Logo Capture ---

    const LOGO_HEIGHT_MM = 8;
    const LOGO_WIDTH_MM = 8; 
    const HEADER_TEXT_SPACING_MM = 2;
    const HEADER_TOTAL_HEIGHT_MM = Math.max(LOGO_HEIGHT_MM, 10) + 5; // Space for logo and text

    const FOOTER_LINE_HEIGHT_MM = 0.5;
    const FOOTER_TEXT_HEIGHT_MM = 3; // For font size 8pt
    const FOOTER_TOTAL_HEIGHT_MM = FOOTER_LINE_HEIGHT_MM + FOOTER_TEXT_HEIGHT_MM + 5;

    const CONTENT_START_Y_MM = PAGE_MARGIN_MM + HEADER_TOTAL_HEIGHT_MM;
    const MAX_CONTENT_HEIGHT_ON_PAGE_MM = PDF_PAGE_HEIGHT - CONTENT_START_Y_MM - FOOTER_TOTAL_HEIGHT_MM - PAGE_MARGIN_MM;
    
    const generationTimestamp = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
    let currentPageNum = 0;
    let currentYOnPage = CONTENT_START_Y_MM; // This will be reset by addNewPage

    const addNewPage = () => {
      if (currentPageNum > 0) {
        pdf.addPage();
      }
      currentPageNum++;
      currentYOnPage = CONTENT_START_Y_MM; // Reset Y for new page
      drawPageHeaderAndFooter();
    };

    const drawPageHeaderAndFooter = () => {
      // Header: Logo top-left, Text to its right
      const logoX = PAGE_MARGIN_MM;
      const logoY = PAGE_MARGIN_MM;
      if (svgDataUrl) {
        try { 
          pdf.addImage(svgDataUrl, 'PNG', logoX, logoY, LOGO_WIDTH_MM, LOGO_HEIGHT_MM); 
        } catch (imgError) { 
          console.error("Error adding SVG logo image to PDF page:", imgError);
          pdf.setFont("Helvetica", "normal").setFontSize(8).setTextColor(128,0,0).text("[Logo Error]", logoX, logoY + LOGO_HEIGHT_MM / 2);
        }
      } else { 
        pdf.setFont("Helvetica", "bold").setFontSize(10).setTextColor(0,0,0).text("✈", logoX, logoY + LOGO_HEIGHT_MM / 2 + 1); // Fallback text/emoji logo
      }
      
      const textStartX = logoX + LOGO_WIDTH_MM + HEADER_TEXT_SPACING_MM;
      pdf.setFont("Helvetica", "bold"); pdf.setFontSize(12); pdf.setTextColor(135, 206, 235); // Primary color #87CEEB
      pdf.text("WanderAI", textStartX, logoY + (LOGO_HEIGHT_MM / 2) -1); 
      
      pdf.setFont("Helvetica", "italic"); pdf.setFontSize(8); pdf.setTextColor(128, 128, 128); // Muted gray
      pdf.text("Your Personal AI Travel Planner", textStartX, logoY + (LOGO_HEIGHT_MM / 2) + 3);
      pdf.setTextColor(0,0,0); 

      // Footer
      const footerLineY = PDF_PAGE_HEIGHT - PAGE_MARGIN_MM - FOOTER_TOTAL_HEIGHT_MM + 3; 
      pdf.setDrawColor(200, 200, 200); 
      pdf.line(PAGE_MARGIN_MM, footerLineY, PDF_PAGE_WIDTH - PAGE_MARGIN_MM, footerLineY);

      pdf.setFont("Helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(100, 100, 100); 
      
      const pageNumText = `Page ${currentPageNum}`;
      const pageNumTextWidth = pdf.getStringUnitWidth(pageNumText) * pdf.getFontSize() / pdf.internal.scaleFactor;
      pdf.text(pageNumText, PDF_PAGE_WIDTH / 2 - pageNumTextWidth / 2, footerLineY + FOOTER_TEXT_HEIGHT_MM + 1);

      const appInfoText = "WanderAI";
      pdf.text(appInfoText, PAGE_MARGIN_MM, footerLineY + FOOTER_TEXT_HEIGHT_MM + 1);
      
      const dateTextWidth = pdf.getStringUnitWidth(generationTimestamp) * pdf.getFontSize() / pdf.internal.scaleFactor;
      pdf.text(generationTimestamp, PDF_PAGE_WIDTH - PAGE_MARGIN_MM - dateTextWidth, footerLineY + FOOTER_TEXT_HEIGHT_MM + 1);
      pdf.setTextColor(0,0,0); 
    };
    
    // Helper to add text, handle wrapping and page breaks
    const addStyledText = (text: string, x: number, options: {
        font?: string, style?: string, size?: number, color?: number[] | string, 
        maxWidth?: number, isListItem?: boolean, lineSpacingFactor?: number, 
        isSubheadingIcon?: string 
      } = {}): void => {
      
      if (typeof text !== 'string' || !text.trim()) { // Skip empty or whitespace-only lines for content
          currentYOnPage += (options.size || 10) / 2.83 * 0.5; // Add a small gap for intended empty lines in content
          return;
      }
      
      const fontName = options.font || "Helvetica";
      const fontStyle = options.style || "normal";
      const fontSize = options.size || 10; // Default to 10pt for body
      const textColor = options.color || [0,0,0]; // Default black
      const maxWidth = options.maxWidth || MAX_CONTENT_WIDTH_MM;
      const lineSpacing = options.lineSpacingFactor || 1.3;
      const bulletPoint = "•";
      const bulletIndent = 5; // mm

      pdf.setFont(fontName, fontStyle);
      pdf.setFontSize(fontSize);
      if (Array.isArray(textColor)) pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      else pdf.setTextColor(textColor);

      let currentX = x;
      let effectiveMaxWidth = maxWidth;

      if (options.isListItem) {
        currentX += bulletIndent;
        effectiveMaxWidth -= bulletIndent;
      }
      if (options.isSubheadingIcon) {
        const iconText = options.isSubheadingIcon + " ";
        pdf.text(iconText, x, currentYOnPage);
        currentX += pdf.getStringUnitWidth(iconText) * fontSize / pdf.internal.scaleFactor;
        effectiveMaxWidth -= (pdf.getStringUnitWidth(iconText) * fontSize / pdf.internal.scaleFactor);
      }

      const lines = pdf.splitTextToSize(text, effectiveMaxWidth);
      const calculatedLineHeight = (fontSize / 2.83) * lineSpacing; // pt to mm, then apply spacing factor

      lines.forEach((lineContent: string, index: number) => {
        if (currentYOnPage + calculatedLineHeight > PDF_PAGE_HEIGHT - PAGE_MARGIN_MM - FOOTER_TOTAL_HEIGHT_MM) {
          addNewPage(); // Resets currentYOnPage and draws header/footer
          // Redraw bullet/icon if it's a continuing list item/subheading on new page
          if (options.isListItem) {
            pdf.setFont(fontName, fontStyle).setFontSize(fontSize); // Reset font as it might change in addNewPage
            if (Array.isArray(textColor)) pdf.setTextColor(textColor[0], textColor[1], textColor[2]); else pdf.setTextColor(textColor);
            pdf.text(bulletPoint, x, currentYOnPage);
          }
          if (options.isSubheadingIcon && index === 0) { // Only for the first line of subheading on new page
             pdf.setFont(fontName, fontStyle).setFontSize(fontSize);
             if (Array.isArray(textColor)) pdf.setTextColor(textColor[0], textColor[1], textColor[2]); else pdf.setTextColor(textColor);
             pdf.text(options.isSubheadingIcon + " ", x, currentYOnPage);
          }
        }
        if (options.isListItem && index === 0) { // Draw bullet only for the first line of a list item
          pdf.text(bulletPoint, x, currentYOnPage);
        }
        pdf.text(lineContent, currentX, currentYOnPage);
        currentYOnPage += calculatedLineHeight;
      });
    };
    
    // --- Itinerary Parsing and PDF Drawing ---
    const parseAndDrawItineraryToPdf = (fullItineraryText: string) => {
        addNewPage(); // Start with the first page (header/footer drawn)

        const majorSections = fullItineraryText.split(/(?=^Day\s+\d+.*?:\s*$|^Overview:\s*$)/im);
        
        let introContent = "";
        if (majorSections.length > 0 && !majorSections[0].match(/^(Day\s+\d+.*?:\s*$|Overview:\s*$)/im)) {
            introContent = majorSections.shift()?.trim() || "";
        }
        
        let isFirstMajorContent = true;

        if (introContent) {
             addStyledText("Introduction", PAGE_MARGIN_MM, {size: 16, style: "bold", color: [60,60,60]});
             currentYOnPage += 2; // Space after title
             introContent.split('\n').forEach(line => {
                 addStyledText(line, PAGE_MARGIN_MM, {size: 10});
             });
             currentYOnPage += 5; // Space after intro section
             isFirstMajorContent = false;
        }

        for (const sectionText of majorSections) {
            if (!sectionText.trim()) continue;

            const sectionLines = sectionText.trim().split('\n');
            const mainSectionTitleLine = sectionLines.shift()?.trim().replace(/:$/, '') || "Unnamed Section";
            
            const isOverview = mainSectionTitleLine.toLowerCase().startsWith("overview");
            const isDay = mainSectionTitleLine.toLowerCase().startsWith("day");

            if (!isFirstMajorContent || isDay || (isOverview && !isFirstMajorContent)) { // Force new page for Day X, or Overview if not first
                if (currentYOnPage + 20 > MAX_CONTENT_HEIGHT_ON_PAGE_MM) { // check if there's enough space for title
                     addNewPage();
                } else if (isDay || (isOverview && !isFirstMajorContent)) { // explicit new page for these
                     addNewPage();
                }
            }
            isFirstMajorContent = false;
            
            const mainTitlePdfIcon = isDay ? sectionKeywordsForDisplay["Day \\d+"].pdfIcon : (isOverview ? sectionKeywordsForDisplay["Overview"].pdfIcon : "");
            addStyledText(mainTitlePdfIcon + " " + mainSectionTitleLine, PAGE_MARGIN_MM, {size: 18, style: "bold", color: [135, 206, 235]});
            currentYOnPage += 3; 

            let currentSubheadingPdfIcon = "";
            for (const line of sectionLines) {
                const trimmedLine = line.trim();
                if (!trimmedLine && !line.includes("\n\n")) { // Skip empty lines unless it's a double newline (paragraph break)
                    currentYOnPage += 2; // Small gap for single empty line
                    continue;
                }

                let isSubheadingMatch = false;
                for (const keyword in sectionKeywordsForDisplay) {
                    if (sectionKeywordsForDisplay[keyword].isDayKeyword || keyword.toLowerCase() === "overview") continue;
                    
                    const subheadingRegex = new RegExp(`^(${keyword.replace(/\\/g, '\\\\').replace(/\s/g, '\\s')}(?:\\s*Recommendations|\\s*Suggestions)?)\\s*:?(.*)`, "i");
                    const subMatch = trimmedLine.match(subheadingRegex);

                    if (subMatch) {
                        currentYOnPage += 4; // Space before subheading
                        currentSubheadingPdfIcon = sectionKeywordsForDisplay[keyword].pdfIcon || "";
                        addStyledText(subMatch[1].trim(), PAGE_MARGIN_MM, {
                            size: 14, style: "bold", color: [70, 130, 180], // Steel Blue
                            isSubheadingIcon: currentSubheadingPdfIcon
                        });
                        currentYOnPage += 1; 
                        if (subMatch[2] && subMatch[2].trim()) {
                             addStyledText(subMatch[2].trim().replace(/\*\*(.*?)\*\*/g, '$1'), PAGE_MARGIN_MM, {size: 10});
                        }
                        isSubheadingMatch = true;
                        break;
                    }
                }
                if (isSubheadingMatch) continue;

                const listItemMatch = trimmedLine.match(/^\s*[-*\u2022•]\s*(.*)/);
                const boldListItemContent = listItemMatch && listItemMatch[1].match(/^\*\*(.*)\*\*$/);

                if (listItemMatch) {
                    const itemText = boldListItemContent ? boldListItemContent[1] : listItemMatch[1];
                    addStyledText(itemText.replace(/\*\*(.*?)\*\*/g, '$1'), PAGE_MARGIN_MM, {
                        size: 10, 
                        isListItem: true, 
                        style: boldListItemContent ? "bold" : "normal"
                    });
                } else if (trimmedLine) { // Regular paragraph
                    // Handle bold within paragraph by splitting - simplified
                    const parts = trimmedLine.split(/(\*\*.*?\*\*)/g).filter(part => part.length > 0);
                    let tempX = PAGE_MARGIN_MM;
                    const fontSizeForWidthCalc = 10; // Size of body text
                    const scaleFactor = pdf.internal.scaleFactor;

                    parts.forEach(part => {
                        const isBoldPart = part.startsWith('**') && part.endsWith('**');
                        const textToDraw = isBoldPart ? part.slice(2, -2) : part;
                        
                        // This part is tricky for multi-line bold segments with current addStyledText, 
                        // jsPDF doesn't easily allow changing style mid-line.
                        // So, we draw parts sequentially. For simplicity, complex inline styling is limited.
                        addStyledText(textToDraw, tempX, {
                            size: fontSizeForWidthCalc, 
                            style: isBoldPart ? "bold" : "normal"
                        });
                        // Approximating width advance - this won't work perfectly if addStyledText itself causes newlines
                        // tempX += pdf.getStringUnitWidth(textToDraw) * fontSizeForWidthCalc / scaleFactor;
                    });
                     // currentYOnPage += 2; // Ensure space after a paragraph block if it wasn't a list
                }
            }
            currentYOnPage += 5; // Space after a major section's content
        }
    };

    try {
        parseAndDrawItineraryToPdf(itinerary);
        if (currentPageNum === 0) { // Fallback if nothing was drawn
            addNewPage();
            addStyledText("No content to export or itinerary is empty.", PAGE_MARGIN_MM, {size: 12, color: [255,0,0]});
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
        <CardHeader><CardTitle className="text-destructive font-headline flex items-center"><AlertTriangle className="mr-2"/>Error</CardTitle></CardHeader>
        <CardContent><p className="text-destructive-foreground font-body">{error}</p></CardContent>
      </Card>
    );
  }

  if (!itinerary) return null;

  const htmlSectionsToDisplay = parseItineraryForHtmlDisplay(itinerary);
  
  const introSection = htmlSectionsToDisplay.find(s => s.isIntro);
  const overviewSection = htmlSectionsToDisplay.find(s => s.isOverview);
  const daySections = htmlSectionsToDisplay.filter(s => s.isDaySection).sort((a,b) => {
      const dayA = parseInt(a.title.match(/Day (\d+)/i)?.[1] || "0");
      const dayB = parseInt(b.title.match(/Day (\d+)/i)?.[1] || "0");
      return dayA - dayB;
  });
  const otherNonDaySections = htmlSectionsToDisplay.filter(s => 
      s.id !== introSection?.id && s.id !== overviewSection?.id && !s.isDaySection
  );
  
  const allSectionsInOrderForHtml: HtmlSection[] = [];
  if (introSection) allSectionsInOrderForHtml.push(introSection);
  if (overviewSection) allSectionsInOrderForHtml.push(overviewSection);
  allSectionsInOrderForHtml.push(...daySections);
  allSectionsInOrderForHtml.push(...otherNonDaySections);


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
        
        <div ref={itineraryContentRef} className="bg-background text-foreground p-1 rounded-md border border-input">
          <ScrollArea className="h-[600px] overflow-y-auto p-1">
            <div className="space-y-1">
              {allSectionsInOrderForHtml.map((section, index) => {
                const sectionHtmlId = section.id || `pdf-export-section-${index}`; 
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
                                    {renderContentForHtml(section.content)}
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    </Accordion>
                   );
                } else { 
                    return (
                        <Card id={sectionHtmlId} key={sectionHtmlId} className="mb-1 p-3 shadow-sm bg-background/90 text-foreground">
                            <h3 className="text-lg font-headline font-semibold text-primary mb-2 flex items-center">
                                <section.icon className="mr-2 h-5 w-5 text-primary/80 shrink-0" />
                                {section.title}
                            </h3>
                            {renderContentForHtml(section.content)}
                        </Card>
                    );
                }
              })}
              {allSectionsInOrderForHtml.length === 0 && itinerary && itinerary.trim() !== "" && (
                  <Card id="html-section-fallback" className="mb-1 p-3 shadow-sm bg-background/90 text-foreground">
                      <h3 className="text-lg font-headline font-semibold text-primary mb-2 flex items-center">
                          <BookOpenText className="mr-2 h-5 w-5 text-primary/80 shrink-0" />
                          Generated Itinerary
                      </h3>
                      {renderContentForHtml(itinerary.split('\n'))}
                  </Card>
              )}
            </div> 
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

