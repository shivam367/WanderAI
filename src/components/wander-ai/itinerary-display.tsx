
// src/components/wander-ai/itinerary-display.tsx
"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
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

// PDF Styling Constants
const PDF_PRIMARY_COLOR_RGB = [135, 206, 235]; // Sky Blue from theme
const PDF_SECONDARY_COLOR_RGB = [70, 130, 180]; // Steel Blue, good for subheadings
const PDF_TEXT_COLOR_DARK_RGB = [50, 50, 50]; // Dark Gray for body
const PDF_TEXT_COLOR_MUTED_RGB = [100, 100, 100]; // Muted gray for less emphasis
const PDF_LINE_COLOR_RGB = [200, 200, 200]; // Light gray for lines

const svgLogoString = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#87CEEB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"></path><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"></path></svg>`;

// For HTML display (on-screen) - This remains unchanged for now, focus is on PDF
const sectionKeywordsForHtmlDisplay: Record<string, { title: string, icon: React.ElementType, isDayKeyword?: boolean }> = {
  "Day \\d+": { title: "Day {N}", icon: CalendarDaysIcon, isDayKeyword: true },
  "Overview": { title: "Overview", icon: FileText, isDayKeyword: false},
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
        icon: sectionKeywordsForHtmlDisplay["Day \\d+"].icon,
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
          title: sectionKeywordsForHtmlDisplay["Overview"].title,
          icon: sectionKeywordsForHtmlDisplay["Overview"].icon,
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
        for (const keyword in sectionKeywordsForHtmlDisplay) {
          if (sectionKeywordsForHtmlDisplay[keyword].isDayKeyword || keyword.toLowerCase() === "overview") continue;
          const subheadingRegex = new RegExp(`^(${keyword.replace(/\\/g, '\\\\').replace(/\s/g, '\\s')}(?:\\s*Recommendations|\\s*Suggestions)?)\\s*:?(.*)`, "i");
          const match = trimmedStartLine.match(subheadingRegex);

          if (match) {
            flushList();
            const subheadingTitle = match[1].trim();
            const { icon: IconComponent } = sectionKeywordsForHtmlDisplay[keyword];
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
    const pdfPageWidth = pdf.internal.pageSize.getWidth();
    const pdfPageHeight = pdf.internal.pageSize.getHeight();
    
    const PAGE_MARGIN_MM = 15;
    const HEADER_HEIGHT_MM = 25; // Increased for more space for logo and title
    const FOOTER_HEIGHT_MM = 20;
    const MAX_CONTENT_WIDTH_MM = pdfPageWidth - 2 * PAGE_MARGIN_MM;
    const CONTENT_START_Y_MM = PAGE_MARGIN_MM + HEADER_HEIGHT_MM;
    const MAX_CONTENT_HEIGHT_ON_PAGE_MM = pdfPageHeight - CONTENT_START_Y_MM - FOOTER_HEIGHT_MM - PAGE_MARGIN_MM; // Reserve space for footer and bottom margin

    let currentYOnPage = CONTENT_START_Y_MM;
    let currentPageNum = 0;
    const generationTimestamp = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
    const ptToMm = (pt: number) => pt * 0.352778;

    let svgDataUrl = '';

    // SVG Logo Capture
    const tempSvgContainer = document.createElement('div');
    tempSvgContainer.id = 'temp-svg-container-for-pdf-export';
    tempSvgContainer.style.position = 'absolute';
    tempSvgContainer.style.left = '-9999px'; // Off-screen
    tempSvgContainer.style.width = '64px'; // Explicit dimensions for container
    tempSvgContainer.style.height = '64px';
    tempSvgContainer.innerHTML = svgLogoString;
    document.body.appendChild(tempSvgContainer);

    try {
      await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay

      const svgCanvas = await html2canvas(tempSvgContainer, { // Capture the CONTAINER DIV
        scale: 2,
        backgroundColor: null,
        useCORS: true, 
        width: 64, 
        height: 64,
        logging: false,
      });
      svgDataUrl = svgCanvas.toDataURL('image/png');
      if (!svgDataUrl.startsWith('data:image/png')) {
        throw new Error('Generated dataURL is not a PNG image.');
      }
    } catch (e) {
      console.error("Error converting SVG logo to canvas image:", e);
      toast({ title: "PDF Logo Error", description: `Could not render the logo. Error: ${(e as Error).message}. Using text fallback.`, variant: "destructive" });
      svgDataUrl = ''; // Reset on error
    } finally {
      if (document.body.contains(tempSvgContainer)) {
        document.body.removeChild(tempSvgContainer);
      }
    }

    const drawPageHeaderAndFooter = () => {
      // Header
      const logoX = PAGE_MARGIN_MM;
      const logoY = PAGE_MARGIN_MM;
      const logoHeightMm = 12; 
      const logoWidthMm = 12;  
      const headerTextSpacingMm = 3;

      if (svgDataUrl) {
        try {
          pdf.addImage(svgDataUrl, 'PNG', logoX, logoY, logoWidthMm, logoHeightMm);
        } catch (imgError) {
          console.error("Error adding SVG logo image to PDF page:", imgError);
          pdf.setFont("Helvetica", "normal").setFontSize(8).setTextColor(128,0,0).text("[Logo Error]", logoX, logoY + logoHeightMm / 2);
        }
      } else {
        pdf.setFont("Helvetica-Bold").setFontSize(10).setTextColor(PDF_TEXT_COLOR_DARK_RGB[0], PDF_TEXT_COLOR_DARK_RGB[1], PDF_TEXT_COLOR_DARK_RGB[2]).text("[LOGO]", logoX, logoY + logoHeightMm / 2 + 1);
      }
      
      const textStartX = logoX + logoWidthMm + headerTextSpacingMm;
      pdf.setFont("Helvetica-Bold").setFontSize(20).setTextColor(PDF_PRIMARY_COLOR_RGB[0], PDF_PRIMARY_COLOR_RGB[1], PDF_PRIMARY_COLOR_RGB[2]);
      pdf.text("WanderAI", textStartX, logoY + ptToMm(20)/2 + 2); 
      
      pdf.setFont("Helvetica-Oblique").setFontSize(10).setTextColor(PDF_TEXT_COLOR_MUTED_RGB[0], PDF_TEXT_COLOR_MUTED_RGB[1], PDF_TEXT_COLOR_MUTED_RGB[2]);
      pdf.text("Your Personal AI Travel Planner", textStartX, logoY + ptToMm(20)/2 + 2 + ptToMm(10) + 2);

      // Footer
      const footerLineY = pdfPageHeight - FOOTER_HEIGHT_MM + 3; 
      pdf.setDrawColor(PDF_LINE_COLOR_RGB[0], PDF_LINE_COLOR_RGB[1], PDF_LINE_COLOR_RGB[2]);
      pdf.line(PAGE_MARGIN_MM, footerLineY, pdfPageWidth - PAGE_MARGIN_MM, footerLineY);

      pdf.setFont("Helvetica", "normal").setFontSize(9).setTextColor(PDF_TEXT_COLOR_MUTED_RGB[0], PDF_TEXT_COLOR_MUTED_RGB[1], PDF_TEXT_COLOR_MUTED_RGB[2]);
      
      const pageNumText = `Page ${currentPageNum}`;
      const pageNumTextWidth = pdf.getStringUnitWidth(pageNumText) * pdf.getFontSize() / pdf.internal.scaleFactor;
      pdf.text(pageNumText, pdfPageWidth / 2 - pageNumTextWidth / 2, footerLineY + ptToMm(9) + 3);

      pdf.text("WanderAI", PAGE_MARGIN_MM, footerLineY + ptToMm(9) + 3);
      
      const dateTextWidth = pdf.getStringUnitWidth(generationTimestamp) * pdf.getFontSize() / pdf.internal.scaleFactor;
      pdf.text(generationTimestamp, pdfPageWidth - PAGE_MARGIN_MM - dateTextWidth, footerLineY + ptToMm(9) + 3);
      pdf.setTextColor(PDF_TEXT_COLOR_DARK_RGB[0], PDF_TEXT_COLOR_DARK_RGB[1], PDF_TEXT_COLOR_DARK_RGB[2]);
    };
    
    const addNewPage = () => {
      if (currentPageNum > 0) {
        pdf.addPage();
      }
      currentPageNum++;
      drawPageHeaderAndFooter();
      currentYOnPage = CONTENT_START_Y_MM;
    };

    const addStyledText = (
        text: string,
        x: number,
        options: {
            size?: number;
            font?: "Helvetica" | "Helvetica-Bold" | "Helvetica-Oblique" | "Helvetica-BoldOblique";
            color?: number[];
            style?: 'normal' | 'bold' | 'italic' | 'bolditalic';
            maxWidth?: number;
            lineSpacingFactor?: number;
            isListItem?: boolean;
            bulletChar?: string;
            icon?: string;
            isTitle?: boolean; // For main section titles
            isSubheading?: boolean; // For sub-sections like Activities
        } = {}
    ): void => {
        if (typeof text !== 'string' || !text.trim()) {
            if (options.isListItem) currentYOnPage += ptToMm(options.size || 12) * (options.lineSpacingFactor || 1.5) * 0.5;
            return;
        }
    
        const fontSize = options.size || 11; // Default body text size
        const fontStyle = options.style || 'normal';
        pdf.setFont('Helvetica', fontStyle);
        pdf.setFontSize(fontSize);
        const textColor = options.color || PDF_TEXT_COLOR_DARK_RGB;
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
    
        let effectiveMaxWidth = (options.maxWidth || MAX_CONTENT_WIDTH_MM);
        let currentDrawX = x;
    
        if (options.icon) {
            const iconText = options.icon + "  "; // Icon and two spaces
            const iconWidth = pdf.getStringUnitWidth(iconText) * fontSize / pdf.internal.scaleFactor;
            if (currentYOnPage + ptToMm(fontSize) > MAX_CONTENT_HEIGHT_ON_PAGE_MM) addNewPage();
            pdf.text(iconText, currentDrawX, currentYOnPage);
            currentDrawX += iconWidth;
            effectiveMaxWidth -= iconWidth;
        } else if (options.isListItem) {
            const bullet = (options.bulletChar || "•") + "  "; // Bullet and two spaces
            const bulletWidth = pdf.getStringUnitWidth(bullet) * fontSize / pdf.internal.scaleFactor;
            if (currentYOnPage + ptToMm(fontSize) > MAX_CONTENT_HEIGHT_ON_PAGE_MM) addNewPage();
            pdf.text(bullet, x, currentYOnPage);
            currentDrawX = x + bulletWidth;
            effectiveMaxWidth -= bulletWidth;
        }
    
        const lines = pdf.splitTextToSize(text, effectiveMaxWidth);
        const lineSpacing = ptToMm(fontSize) * (options.lineSpacingFactor || (options.isTitle || options.isSubheading ? 1.4 : 1.6));
        const paragraphSpacingAfter = ptToMm(fontSize) * (options.isTitle ? 0.8 : (options.isSubheading ? 0.5 : 0.3));
    
        lines.forEach((lineContent: string) => {
            if (currentYOnPage + lineSpacing > MAX_CONTENT_HEIGHT_ON_PAGE_MM) {
                addNewPage();
                // Redraw icon/bullet if continuing on new page
                pdf.setFont('Helvetica', fontStyle); // Reset font for new page part
                pdf.setFontSize(fontSize);
                pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
                let restartX = x;
                if (options.icon) {
                    const iconText = options.icon! + "  ";
                    const iconWidth = pdf.getStringUnitWidth(iconText) * fontSize / pdf.internal.scaleFactor;
                    pdf.text(iconText, restartX, currentYOnPage);
                    restartX += iconWidth;
                } else if (options.isListItem) {
                    const bullet = (options.bulletChar || "•") + "  ";
                    const bulletWidth = pdf.getStringUnitWidth(bullet) * fontSize / pdf.internal.scaleFactor;
                    pdf.text(bullet, x, currentYOnPage);
                    restartX = x + bulletWidth;
                }
                pdf.text(lineContent, restartX, currentYOnPage);
            } else {
                pdf.text(lineContent, currentDrawX, currentYOnPage);
            }
            currentYOnPage += lineSpacing;
        });
        currentYOnPage += paragraphSpacingAfter;
    };

    addNewPage(); // Start the first page

    // Parse Itinerary into Sections
    const rawSections = itinerary.split(/(?=^\s*(?:Introduction|Overview|Day\s+\d+.*?):\s*$)/im);
    const sections: { title: string, contentLines: string[], type: 'intro' | 'overview' | 'day' | 'unknown' }[] = [];

    rawSections.forEach(sectionText => {
        if (!sectionText.trim()) return;
        const lines = sectionText.trim().split('\n');
        const titleLine = lines.shift()?.trim().replace(/:$/, '') || "Details";
        let type: 'intro' | 'overview' | 'day' | 'unknown' = 'unknown';
        if (titleLine.toLowerCase().startsWith("introduction")) type = 'intro';
        else if (titleLine.toLowerCase().startsWith("overview")) type = 'overview';
        else if (titleLine.toLowerCase().match(/^day\s+\d+/i)) type = 'day';
        
        sections.push({ title: titleLine, contentLines: lines.filter(l => l.trim() || l===""), type });
    });
    
    // Sort to ensure intro is first, then overview, then days
    sections.sort((a, b) => {
        if (a.type === 'intro') return -1;
        if (b.type === 'intro') return 1;
        if (a.type === 'overview') return -1;
        if (b.type === 'overview') return 1;
        if (a.type === 'day' && b.type === 'day') {
            const dayA = parseInt(a.title.match(/Day (\d+)/i)?.[1] || "0");
            const dayB = parseInt(b.title.match(/Day (\d+)/i)?.[1] || "0");
            return dayA - dayB;
        }
        return 0;
    });


    sections.forEach((section, index) => {
        if (index > 0 && (section.type === 'overview' || section.type === 'day')) {
            addNewPage(); // Overview and each Day starts on a new page
        }

        // Draw horizontal line before main section titles (except for the very first content block on page 1 at the very top)
        if (currentYOnPage > (CONTENT_START_Y_MM + ptToMm(5))) { 
            if (currentYOnPage + ptToMm(5) < MAX_CONTENT_HEIGHT_ON_PAGE_MM) { 
                pdf.setDrawColor(PDF_LINE_COLOR_RGB[0], PDF_LINE_COLOR_RGB[1], PDF_LINE_COLOR_RGB[2]);
                pdf.line(PAGE_MARGIN_MM, currentYOnPage - ptToMm(3), pdfPageWidth - PAGE_MARGIN_MM, currentYOnPage - ptToMm(3));
                currentYOnPage += ptToMm(4); 
            }
        }

        addStyledText(section.title, PAGE_MARGIN_MM, {
            size: 18, style: 'bold', color: PDF_PRIMARY_COLOR_RGB, isTitle: true
        });
        currentYOnPage += ptToMm(2); // Add a bit more space after main title

        const subheadingRegex = /^\s*(Activities|Attractions|Food(?:\s*Recommendations)?|Hotel(?:\s*Suggestions)?|Accommodation|Local\s*Tips|Tips|Transportation)\s*:\s*(.*)/i;
        const listRegex = /^\s*(?:[-*\u2022]|\d+\.)\s+(.*)/;

        section.contentLines.forEach(line => {
            const trimmedLine = line.trim();
            const subheadingMatch = trimmedLine.match(subheadingRegex);
            const listItemMatch = trimmedLine.match(listRegex);

            let icon = "";
            if (subheadingMatch) {
                const subKey = subheadingMatch[1].toLowerCase();
                if (subKey.includes("activit") || subKey.includes("attraction")) icon = "🏔️";
                else if (subKey.includes("food")) icon = "🍽️";
                else if (subKey.includes("hotel") || subKey.includes("accommodation")) icon = "🏨";
                else if (subKey.includes("tip")) icon = "💡";
                else if (subKey.includes("transport")) icon = "🚗";
                
                addStyledText(subheadingMatch[1].trim() + ":", PAGE_MARGIN_MM, {
                    size: 14, style: 'bold', color: PDF_SECONDARY_COLOR_RGB, isSubheading: true, icon: icon
                });
                const textAfterTitle = subheadingMatch[2]?.trim();
                if (textAfterTitle) {
                     // Process for bold parts in the rest of the subheading line
                    const parts = textAfterTitle.split(/(\*\*.*?\*\*)/g).filter(p => p.length > 0);
                    parts.forEach(part => {
                        const isBold = part.startsWith("**") && part.endsWith("**");
                        const textPart = isBold ? part.slice(2, -2) : part;
                        addStyledText(textPart, PAGE_MARGIN_MM + (isBold ? 0 : ptToMm(5)), { size: 11, style: isBold ? 'bold' : 'normal' });
                    });
                }
            } else if (listItemMatch) {
                const itemContent = listItemMatch[1];
                // Handle bold text within list items
                const parts = itemContent.split(/(\*\*.*?\*\*)/g).filter(p => p.length > 0);
                let currentX = PAGE_MARGIN_MM; // Initial X for the list item line
                
                // Draw bullet first
                addStyledText("", PAGE_MARGIN_MM, { isListItem: true, size: 11 }); // This advances Y and draws bullet
                currentX += pdf.getStringUnitWidth("•  ") * 11 / pdf.internal.scaleFactor;


                let firstPart = true;
                parts.forEach(part => {
                    const isBold = part.startsWith("**") && part.endsWith("**");
                    const textPart = isBold ? part.slice(2, -2) : part;
                    // For the first part of a list item, we use the currentY, subsequent parts on same line will use same Y.
                    // The addStyledText handles Y advancement for new lines from wrapping.
                    // We need to manage X position if multiple bold/non-bold segments are on the SAME visual line.
                    // However, jsPDF's splitTextToSize handles wrapping, so we treat each part as potentially starting a new render call.
                    // The 'isListItem' flag will only apply to the first part to draw the bullet. Subsequent parts on the same conceptual "line" won't get a new bullet.
                    addStyledText(textPart, PAGE_MARGIN_MM, { 
                        size: 11, 
                        style: isBold ? 'bold' : 'normal', 
                        isListItem: firstPart, // Only the first part gets the bullet
                        maxWidth: MAX_CONTENT_WIDTH_MM - (firstPart ? (pdf.getStringUnitWidth("•  ") * 11 / pdf.internal.scaleFactor) : 0) // Adjust maxWidth for bullet
                    });
                    firstPart = false; 
                });


            } else if (trimmedLine.startsWith("**") && trimmedLine.endsWith("**")) {
                addStyledText(trimmedLine.slice(2, -2), PAGE_MARGIN_MM, { size: 11, style: 'bold' });
            } else if (trimmedLine) {
                addStyledText(trimmedLine, PAGE_MARGIN_MM, { size: 11, style: 'normal' });
            } else { // Empty line for spacing
                currentYOnPage += ptToMm(11) * 0.5; // Half line space for empty lines
            }
        });
        currentYOnPage += ptToMm(8); // Space after a major section's content
    });
    
    if (currentPageNum === 0 && sections.length === 0) { 
        addNewPage(); 
        addStyledText("No itinerary content was found to generate the PDF.", PAGE_MARGIN_MM, {size: 12, color: [255,0,0]});
    }

    try {
      pdf.save('wanderai-itinerary.pdf');
      toast({ title: "Export Successful", description: `Your itinerary (${currentPageNum} page(s)) has been downloaded.`, className: "bg-primary text-primary-foreground" });
    } catch (err) {
      console.error("Error saving PDF:", err);
      toast({ title: "PDF Save Error", description: (err as Error).message || "Could not save PDF.", variant: "destructive" });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // HTML Display (On-screen) - Unchanged from before for this fix
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
  
  const allSectionsInOrderForHtml: HtmlSection[] = [];
  const introSectionHtml = htmlSectionsToDisplay.find(s => s.isIntro);
  const overviewSectionHtml = htmlSectionsToDisplay.find(s => s.isOverview);
  const daySectionsHtml = htmlSectionsToDisplay.filter(s => s.isDaySection).sort((a,b) => {
      const dayA = parseInt(a.title.match(/Day (\d+)/i)?.[1] || "0");
      const dayB = parseInt(b.title.match(/Day (\d+)/i)?.[1] || "0");
      return dayA - dayB;
  });
  const otherNonDaySectionsHtml = htmlSectionsToDisplay.filter(s => 
      s.id !== introSectionHtml?.id && s.id !== overviewSectionHtml?.id && !s.isDaySection
  );
  
  if (introSectionHtml) allSectionsInOrderForHtml.push(introSectionHtml);
  if (overviewSectionHtml) allSectionsInOrderForHtml.push(overviewSectionHtml);
  allSectionsInOrderForHtml.push(...daySectionsHtml);
  allSectionsInOrderForHtml.push(...otherNonDaySectionsHtml);


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
              {allSectionsInOrderForHtml.map((section) => { 
                const sectionHtmlId = section.id || `html-display-section-${Math.random().toString(36).substr(2, 9)}`; 
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

