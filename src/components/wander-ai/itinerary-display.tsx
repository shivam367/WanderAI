
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
import { BookOpenText, Edit3, Sparkles, Lightbulb, Utensils, BedDouble, MountainSnow, Building2, Download, FileText, AlertTriangle } from "lucide-react";
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

// PDF Styling Constants & Page Dimensions (A4 in mm)
const PDF_PAGE_WIDTH_MM = 210;
const PDF_PAGE_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 15; // Equal padding on sides
const HEADER_HEIGHT_MM = 20; // Space for logo, title, tagline
const FOOTER_HEIGHT_MM = 15; // Space for line, page number, date

const MAX_CONTENT_WIDTH_MM = PDF_PAGE_WIDTH_MM - 2 * PAGE_MARGIN_MM; // 210 - 30 = 180mm
const CONTENT_START_Y_MM = PAGE_MARGIN_MM + HEADER_HEIGHT_MM; // 15 + 20 = 35mm
const MAX_Y_BEFORE_FOOTER_MM = PDF_PAGE_HEIGHT_MM - PAGE_MARGIN_MM - FOOTER_HEIGHT_MM; // 297 - 15 - 15 = 267mm

const PDF_PRIMARY_COLOR_RGB = [135, 206, 235]; // Sky Blue #87CEEB
const PDF_SECONDARY_COLOR_RGB = [100, 149, 237]; // Cornflower Blue
const PDF_TEXT_COLOR_RGB = [50, 50, 50]; // Dark Gray
const PDF_MUTED_TEXT_COLOR_RGB = [120, 120, 120];
const PDF_LINE_COLOR_RGB = [200, 200, 200];

const PDF_MAIN_TITLE_SIZE = 20;
const PDF_SUB_HEADING_SIZE = 15;
const PDF_BODY_TEXT_SIZE = 11; // Adjusted for balance
const PDF_LIST_ITEM_SIZE = 11;

const LINE_SPACING_MULTIPLIER = 1.25; // For normal text and list items
const SPACE_AFTER_PARAGRAPH_MM = 1.5; // Reduced
const SPACE_AFTER_MAIN_TITLE_MM = 3;
const SPACE_AFTER_SUB_HEADING_MM = 1.5; // Reduced
const SPACE_BEFORE_MAIN_TITLE_SECTION_MM = 5;

const svgLogoString = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#87CEEB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"></path><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"></path></svg>`;

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
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);

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
    let svgDataUrl: string | null = null;
    let currentYOnPage = CONTENT_START_Y_MM;
    let currentPageNum = 1;

    const tempSvgContainer = document.createElement('div');
    tempSvgContainer.id = 'temp-svg-container-for-pdf-export';
    tempSvgContainer.style.position = 'absolute';
    tempSvgContainer.style.left = '-9999px';
    tempSvgContainer.style.top = '-9999px';
    tempSvgContainer.style.width = '64px';
    tempSvgContainer.style.height = '64px';
    tempSvgContainer.style.backgroundColor = 'transparent';
    document.body.appendChild(tempSvgContainer);
    tempSvgContainer.innerHTML = svgLogoString;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const svgCanvas = await html2canvas(tempSvgContainer, {
        scale: 2, backgroundColor: null, useCORS: true, width: 64, height: 64, logging: false,
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

    const drawPageHeaderAndFooter = (pdfInstance: jsPDF, pageNum: number, logoUrl: string | null) => {
      const logoX = PAGE_MARGIN_MM;
      const logoY = PAGE_MARGIN_MM;
      const logoHeightMm = 12;
      const logoWidthMm = 12;
      const headerTextSpacingMm = 3;

      if (logoUrl) {
        try {
          pdfInstance.addImage(logoUrl, 'PNG', logoX, logoY, logoWidthMm, logoHeightMm);
        } catch (imgError) { console.error("Error adding SVG logo to PDF:", imgError); }
      } else {
         pdfInstance.setFont("Helvetica", "bold").setFontSize(12).setTextColor(...PDF_PRIMARY_COLOR_RGB).text("WAI", logoX, logoY + logoHeightMm / 2 + 1);
      }

      const textStartX = logoX + logoWidthMm + headerTextSpacingMm;
      pdfInstance.setFont("Helvetica", "bold").setFontSize(16).setTextColor(...PDF_PRIMARY_COLOR_RGB);
      pdfInstance.text("WanderAI", textStartX, logoY + (logoHeightMm/2) );
      pdfInstance.setFont("Helvetica", "normal").setFontSize(9).setTextColor(...PDF_MUTED_TEXT_COLOR_RGB);
      pdfInstance.text("Your Personal AI Travel Planner", textStartX, logoY + (logoHeightMm/2) + 5);

      const footerLineY = PDF_PAGE_HEIGHT_MM - PAGE_MARGIN_MM - FOOTER_HEIGHT_MM + 2;
      pdfInstance.setDrawColor(...PDF_LINE_COLOR_RGB);
      pdfInstance.line(PAGE_MARGIN_MM, footerLineY, PDF_PAGE_WIDTH_MM - PAGE_MARGIN_MM, footerLineY);

      pdfInstance.setFont("Helvetica", "normal").setFontSize(8).setTextColor(...PDF_MUTED_TEXT_COLOR_RGB);
      const footerTextY = footerLineY + 5;
      pdfInstance.text("WanderAI", PAGE_MARGIN_MM, footerTextY);

      const pageNumText = `Page ${pageNum}`;
      const pageNumTextWidth = pdfInstance.getStringUnitWidth(pageNumText) * pdfInstance.getFontSize() / pdfInstance.internal.scaleFactor;
      pdfInstance.text(pageNumText, PDF_PAGE_WIDTH_MM / 2 - pageNumTextWidth / 2, footerTextY);

      const generationTimestamp = format(new Date(), "MMM d, yyyy, h:mm a");
      const dateTextWidth = pdfInstance.getStringUnitWidth(generationTimestamp) * pdfInstance.getFontSize() / pdfInstance.internal.scaleFactor;
      pdfInstance.text(generationTimestamp, PDF_PAGE_WIDTH_MM - PAGE_MARGIN_MM - dateTextWidth, footerTextY);
    };
    
    const addNewPageHelper = () => {
        pdf.addPage();
        currentPageNum++;
        drawPageHeaderAndFooter(pdf, currentPageNum, svgDataUrl);
        currentYOnPage = CONTENT_START_Y_MM;
    };

    const addStyledTextToPdf = (
      text: string,
      x: number,
      options: {
          fontSize?: number;
          fontName?: 'Helvetica' | 'Times-Roman' | 'Courier';
          fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
          color?: number[];
          maxWidth?: number;
          isListItem?: boolean;
          lineSpacingMultiplier?: number; // Changed from lineSpacingFactor
      } = {}
    ) => {
        const {
            fontSize = PDF_BODY_TEXT_SIZE,
            fontName = 'Helvetica',
            fontStyle = 'normal',
            color = PDF_TEXT_COLOR_RGB,
            maxWidth = MAX_CONTENT_WIDTH_MM,
            isListItem = false,
            lineSpacingMultiplier = LINE_SPACING_MULTIPLIER,
        } = options;

        const effectiveLineHeight = fontSize * lineSpacingMultiplier / pdf.internal.scaleFactor;
        
        pdf.setFont(fontName, fontStyle).setFontSize(fontSize).setTextColor(color[0], color[1], color[2]);
        
        const textLines = pdf.splitTextToSize(text, isListItem ? maxWidth - 6 : maxWidth); // 6mm indent for list items

        for (const line of textLines) {
            if (currentYOnPage + effectiveLineHeight > MAX_Y_BEFORE_FOOTER_MM) {
                addNewPageHelper();
            }

            let currentX = x;
            if (isListItem) {
                pdf.setFont("Helvetica", "normal").setFontSize(PDF_LIST_ITEM_SIZE);
                pdf.text("•", currentX, currentYOnPage); // Bullet point
                currentX += 5; 
            }
            
            const parts = line.split(/(\*\*.*?\*\*)/g).filter(part => part.length > 0);
            let tempX = currentX;

            parts.forEach(part => {
                const isBoldPart = part.startsWith('**') && part.endsWith('**');
                const partText = isBoldPart ? part.slice(2, -2) : part;
                
                let currentPartFontStyle = fontStyle;
                if (isBoldPart) {
                    if (fontStyle === 'italic') currentPartFontStyle = 'bolditalic';
                    else if (fontStyle === 'bolditalic') currentPartFontStyle = 'bolditalic'; // Already bolditalic
                    else currentPartFontStyle = 'bold';
                }
                
                pdf.setFont(fontName, currentPartFontStyle).setFontSize(fontSize);
                pdf.text(partText, tempX, currentYOnPage);
                tempX += pdf.getStringUnitWidth(partText) * fontSize / pdf.internal.scaleFactor;
            });
            currentYOnPage += effectiveLineHeight;
        }
    };
        
    drawPageHeaderAndFooter(pdf, currentPageNum, svgDataUrl);

    const itineraryLines = itinerary.split('\n');
    let isFirstMajorSection = true;
    let isOverviewSectionProcessed = false;

    const mainSectionTitleRegex = /^(Introduction|Overview|Day\s+\d+.*?):?$/i;
    const subHeadingRegex = /^\s*(Activities|Attractions|Food(?: Recommendations)?|Hotel(?: Suggestions)?|Accommodation|Tips(?: & Advice)?|Transportation)\s*:?\s*(.*)/i;
    const listItemRegex = /^\s*[-*\u2022\d]\s*(.*)/;
    let isPreviousLineBlank = false;

    for (let i = 0; i < itineraryLines.length; i++) {
        const line = itineraryLines[i];
        const trimmedLine = line.trim();

        if (trimmedLine === "") {
            if (!isPreviousLineBlank) { 
                const spaceForSingleBlankLine = PDF_BODY_TEXT_SIZE * 0.6 / pdf.internal.scaleFactor;
                if (currentYOnPage + spaceForSingleBlankLine <= MAX_Y_BEFORE_FOOTER_MM) {
                    currentYOnPage += spaceForSingleBlankLine;
                }
            }
            isPreviousLineBlank = true;
            continue; 
        }
        isPreviousLineBlank = false;

        const mainTitleMatch = trimmedLine.match(mainSectionTitleRegex);
        const isCurrentSectionOverview = mainTitleMatch?.[1].toLowerCase() === 'overview';
        const isCurrentSectionDay = !!mainTitleMatch && !isCurrentSectionOverview && mainTitleMatch?.[1].toLowerCase() !== 'introduction';

        if (mainTitleMatch) {
            if ((isCurrentSectionOverview && !isOverviewSectionProcessed) || isCurrentSectionDay) {
                 if (currentYOnPage > CONTENT_START_Y_MM + 5 || !isFirstMajorSection) { 
                    addNewPageHelper();
                 }
            }
            if (isCurrentSectionOverview) isOverviewSectionProcessed = true;
            
            if (currentYOnPage + SPACE_BEFORE_MAIN_TITLE_SECTION_MM > MAX_Y_BEFORE_FOOTER_MM && currentYOnPage !== CONTENT_START_Y_MM) {
                 addNewPageHelper();
            }
            currentYOnPage += SPACE_BEFORE_MAIN_TITLE_SECTION_MM;
             if (currentYOnPage > MAX_Y_BEFORE_FOOTER_MM) addNewPageHelper(); // Check again after adding space

            pdf.setDrawColor(...PDF_LINE_COLOR_RGB);
            pdf.line(PAGE_MARGIN_MM, currentYOnPage - 2, PAGE_MARGIN_MM + MAX_CONTENT_WIDTH_MM, currentYOnPage - 2); 
            if (currentYOnPage - 2 > MAX_Y_BEFORE_FOOTER_MM) addNewPageHelper(); // check before drawing line
            currentYOnPage += 2;
            if (currentYOnPage > MAX_Y_BEFORE_FOOTER_MM) addNewPageHelper(); // check after drawing line

            addStyledTextToPdf(mainTitleMatch[1].trim(), PAGE_MARGIN_MM, {
                fontSize: PDF_MAIN_TITLE_SIZE, fontStyle: "bold", color: PDF_PRIMARY_COLOR_RGB
            });
            currentYOnPage += SPACE_AFTER_MAIN_TITLE_MM;
            isFirstMajorSection = false;
        } else {
            const subHeadingMatch = trimmedLine.match(subHeadingRegex);
            if (subHeadingMatch) {
                 if (currentYOnPage + SPACE_AFTER_SUB_HEADING_MM + (PDF_SUB_HEADING_SIZE * LINE_SPACING_MULTIPLIER / pdf.internal.scaleFactor) > MAX_Y_BEFORE_FOOTER_MM && currentYOnPage !== CONTENT_START_Y_MM) {
                     addNewPageHelper();
                 }
                 currentYOnPage += SPACE_AFTER_SUB_HEADING_MM / 2;

                const subText = subHeadingMatch[1].trim();
                addStyledTextToPdf(subText, PAGE_MARGIN_MM, {
                    fontSize: PDF_SUB_HEADING_SIZE, fontStyle: "bold", color: PDF_SECONDARY_COLOR_RGB
                });
                currentYOnPage += SPACE_AFTER_SUB_HEADING_MM / 2;

                const remainingTextOnSubheadingLine = subHeadingMatch[2]?.trim();
                if (remainingTextOnSubheadingLine) {
                    addStyledTextToPdf(remainingTextOnSubheadingLine, PAGE_MARGIN_MM, {
                        fontSize: PDF_BODY_TEXT_SIZE, fontStyle: "normal"
                    });
                    currentYOnPage += SPACE_AFTER_PARAGRAPH_MM;
                }

            } else if (listItemRegex.test(trimmedLine)) {
                const itemText = trimmedLine.match(listItemRegex)?.[1] || trimmedLine;
                addStyledTextToPdf(itemText.trim(), PAGE_MARGIN_MM, {
                    isListItem: true, fontSize: PDF_LIST_ITEM_SIZE, fontStyle: "normal"
                });
            } else { 
                addStyledTextToPdf(trimmedLine, PAGE_MARGIN_MM, {
                    fontSize: PDF_BODY_TEXT_SIZE, fontStyle: "normal"
                });
                if (i < itineraryLines.length -1 && itineraryLines[i+1].trim() !== "" && !itineraryLines[i+1].trim().match(mainSectionTitleRegex) && !itineraryLines[i+1].trim().match(subHeadingRegex)) {
                    currentYOnPage += SPACE_AFTER_PARAGRAPH_MM;
                }
            }
        }
    }

    try {
      pdf.save('wanderai-itinerary.pdf');
      toast({ title: "Export Successful", description: `Your itinerary (${currentPageNum} page(s)) has been downloaded.`, className: "bg-primary text-primary-foreground" });
    } catch (saveErr) {
      console.error("Error saving PDF:", saveErr);
      toast({ title: "PDF Save Error", description: "Could not save the PDF.", variant: "destructive" });
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
      <CardContent ref={itineraryContentRef} className="bg-background text-foreground p-1 rounded-md border border-input">
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

        <ScrollArea className="h-[600px] overflow-y-auto p-1">
            <div ref={scrollAreaViewportRef} className="space-y-1">
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
      </CardContent>
    </Card>
  );
}

