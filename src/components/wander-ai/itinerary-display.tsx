
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
import { BookOpenText, Edit3, Sparkles, Lightbulb, Utensils, BedDouble, MountainSnow, Building2, Download, FileText, AlertTriangle, MessageSquare } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { ItineraryChatbot } from "./itinerary-chatbot"; // Import the chatbot

const CalendarDaysIcon = ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;

const svgLogoString = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4682B4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"></path><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l.9-.45a2 2 0 0 1 2.09.2l4.02 3a2 2 0 0 0 2.1.2l4.19-2.06a2.41 2.41 0 0 1 1.73-.17L21 7a1.4 1.4 0 0 1 .87 1.99l-.38.76c-.23.46-.6.84-1.07 1.08L7.58 17.2a2 2 0 0 1-1.22.18Z"></path></svg>`;

interface ItineraryDisplayProps {
  itinerary: string | null;
  destination?: string; // Added destination prop for the chatbot
  isLoading: boolean;
  isRefining: boolean;
  setIsRefining: (refining: boolean) => void;
  onItineraryRefined: (refinedItinerary: string) => void;
  error: string | null;
  canRefine?: boolean;
}

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
  }

  if (parsedSections.length > 0 && !parsedSections[0].isDaySection && !parsedSections[0].isOverview && !parsedSections[0].isIntro) {
    parsedSections[0].isIntro = true;
    if (!parsedSections[0].title) parsedSections[0].title = "Introduction";
    if (!parsedSections[0].icon) parsedSections[0].icon = BookOpenText;
  } else if (parsedSections.length === 0 && itineraryText.trim().length > 0) {
     parsedSections.push({
        title: "Itinerary Details",
        icon: BookOpenText,
        content: itineraryText.split('\n'),
        isDaySection: false,
        isIntro: true,
        id: `html-section-implicit-intro-${sectionCounter++}`
     });
  }

  if (parsedSections.some(s => s.isOverview)) {
    const introIdx = parsedSections.findIndex(s => s.isIntro && s.content.every(c => c.trim() === ''));
    if (introIdx !== -1) {
        parsedSections.splice(introIdx, 1);
    }
  }
  
  return parsedSections.filter(s => s.content.some(c => c.trim() !== '') || (s.isDaySection && s.content.length >= 0) );
}


export function ItineraryDisplay({ itinerary, destination, isLoading, isRefining, setIsRefining, onItineraryRefined, error, canRefine = true }: ItineraryDisplayProps) {
  const { toast } = useToast();
  const [showRefineForm, setShowRefineForm] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); // State for chatbot visibility
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const itineraryContentRef = useRef<HTMLDivElement>(null);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);


  const refineForm = useForm<RefineFormInputType>({
    resolver: zodResolver(RefineItineraryInputSchema),
    defaultValues: { userFeedback: "" },
  });

  const processLineForBoldHtml = (line: string, keyPrefix: string): React.ReactNode[] => {
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
           let processedNodes = processLineForBoldHtml(listItemText, `li-content-${elements.length}-${currentListItemGroup.length}-line-${lineIdx}`);
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
                {processLineForBoldHtml(lineContentForProcessing, `p-content-${elements.length}-line-${lineIdx}`)}
              </p>
            );
        } else if (originalLine === '') {
           elements.push(<p key={`p-empty-${elements.length}-line-${lineIdx}-${Date.now()}`} className="my-1">&nbsp;</p>);
        }
      }
    });

    flushList();

    if (elements.length === 0 && contentLines.some(l => l.trim() !== '')) {
        return [<p key={`raw-fallback-${Date.now()}`} className="text-foreground/90 font-body my-2 leading-relaxed whitespace-pre-line">{contentLines.join('\n')}</p>];
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

    const PDF_PAGE_WIDTH_MM = 210;
    const PDF_PAGE_HEIGHT_MM = 297;
    const PAGE_MARGIN_MM = 15;
    const HEADER_HEIGHT_MM = 20; // Space for header content below margin
    const FOOTER_HEIGHT_MM = 15; // Space for footer content above margin
    const MAX_CONTENT_WIDTH_MM = PDF_PAGE_WIDTH_MM - 2 * PAGE_MARGIN_MM;
    const CONTENT_START_Y_MM = PAGE_MARGIN_MM + HEADER_HEIGHT_MM;
    const MAX_Y_BEFORE_FOOTER_MM = PDF_PAGE_HEIGHT_MM - PAGE_MARGIN_MM - FOOTER_HEIGHT_MM;

    const FONT_SIZE_MAIN_TITLE = 18;
    const FONT_SIZE_SUB_HEADING = 14;
    const FONT_SIZE_BODY = 11;
    const FONT_SIZE_LIST_ITEM = 11;
    const FONT_SIZE_FOOTER_TEXT = 9;
    const FONT_SIZE_HEADER_TAGLINE = 9;
    const FONT_SIZE_HEADER_TITLE = 16;

    const FONT_STYLE_NORMAL = "Helvetica";
    const FONT_STYLE_BOLD = "Helvetica-Bold";

    const PDF_COLOR_PRIMARY_HEADING = [70, 130, 180];
    const PDF_COLOR_SECONDARY_HEADING = [100, 149, 237];
    const PDF_COLOR_TEXT_DEFAULT = [51, 51, 51];
    const PDF_COLOR_MUTED_TEXT = [102, 102, 102];
    const PDF_COLOR_LINE = [180, 180, 180];

    const LINE_SPACING_FACTOR_HEADING = 1.2;
    const LINE_SPACING_FACTOR_BODY = 1.3;
    const LINE_SPACING_FACTOR_LIST = 1.3;

    const SPACE_ABOVE_SEPARATOR_MM = 3;
    const SEPARATOR_LINE_THICKNESS_MM = 0.3;
    const SPACE_BELOW_SEPARATOR_TO_TITLE_MM = 6;
    const SPACE_AFTER_MAIN_TITLE_MM = 4;
    const SPACE_BEFORE_SUB_HEADING_MM = 3;
    const SPACE_AFTER_SUB_HEADING_MM = 1.5;
    const SPACE_AFTER_PARAGRAPH_MM = 2;
    const SPACE_AFTER_LIST_ITEM_MM = 1;
    const EMPTY_LINE_SPACING_MM = 3;
    const SPACE_BEFORE_PARAGRAPH_MM = 2;

    const yRef = { current: CONTENT_START_Y_MM };
    const currentPageNumRef = { current: 1 };
    const totalPagesPlaceholder = "__TOTAL_PAGES__";

    const tempSvgContainer = document.createElement('div');
    tempSvgContainer.id = 'temp-svg-container-for-pdf-export';
    tempSvgContainer.style.position = 'absolute';
    tempSvgContainer.style.left = '-9999px';
    tempSvgContainer.style.top = '-9999px';
    tempSvgContainer.style.width = '64px';
    tempSvgContainer.style.height = '64px';
    document.body.appendChild(tempSvgContainer);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const svgCanvas = await html2canvas(tempSvgContainer, {
        scale: 3, backgroundColor: null, useCORS: true, width: 64, height: 64, logging: false,
      });
      svgDataUrl = svgCanvas.toDataURL('image/png');
    } catch (e) { console.error("Error converting SVG logo to canvas image:", e); }
    finally { if (document.body.contains(tempSvgContainer)) document.body.removeChild(tempSvgContainer); }

    const drawPageHeader = (pdfInstance: jsPDF, logoUrl: string | null) => {
        const logoX = PAGE_MARGIN_MM;
        const logoY = PAGE_MARGIN_MM; // Start drawing header content from top margin
        const logoHeightMm = 12;
        const logoWidthMm = 12;
        const headerTextSpacingMm = 3;

        if (logoUrl) {
            try { pdfInstance.addImage(logoUrl, 'PNG', logoX, logoY, logoWidthMm, logoHeightMm); }
            catch (imgError) { console.error("Error adding SVG logo to PDF:", imgError); }
        } else {
            pdfInstance.setFont(FONT_STYLE_BOLD).setFontSize(12).setTextColor(PDF_COLOR_PRIMARY_HEADING[0], PDF_COLOR_PRIMARY_HEADING[1], PDF_COLOR_PRIMARY_HEADING[2]).text("WAI", logoX, logoY + logoHeightMm / 2 + 1);
        }

        const textStartX = logoX + logoWidthMm + headerTextSpacingMm;
        pdfInstance.setFont(FONT_STYLE_BOLD).setFontSize(FONT_SIZE_HEADER_TITLE).setTextColor(PDF_COLOR_PRIMARY_HEADING[0], PDF_COLOR_PRIMARY_HEADING[1], PDF_COLOR_PRIMARY_HEADING[2]);
        pdfInstance.text("WanderAI", textStartX, logoY + (logoHeightMm/2) );
        pdfInstance.setFont(FONT_STYLE_NORMAL).setFontSize(FONT_SIZE_HEADER_TAGLINE).setTextColor(PDF_COLOR_MUTED_TEXT[0], PDF_COLOR_MUTED_TEXT[1], PDF_COLOR_MUTED_TEXT[2]);
        pdfInstance.text("Your Personal AI Travel Planner", textStartX, logoY + (logoHeightMm/2) + 5);
    };

    const drawPageFooter = (pdfInstance: jsPDF, pageNum: number, totalPagesArg: string | number, isSecondPass: boolean = false) => {
        const footerLineY = PDF_PAGE_HEIGHT_MM - PAGE_MARGIN_MM - FOOTER_HEIGHT_MM + 2;
        const footerTextY = footerLineY + 5; // Text slightly below the line
        const generationTimestampStr = format(new Date(), "MMM d, yyyy, h:mm a");
        const pageNumText = `Page ${pageNum} of ${totalPagesArg}`;
    
        // On the second pass, clear the entire footer text line area before redrawing
        if (isSecondPass) {
            const clearX = PAGE_MARGIN_MM;
            const clearWidth = PDF_PAGE_WIDTH_MM - 2 * PAGE_MARGIN_MM;
            const textLineHeightMm = FONT_SIZE_FOOTER_TEXT * 0.352778 * 1.2; // pt to mm, with line spacing
            const clearY = footerTextY - (textLineHeightMm * 0.85) ; // Start clearing slightly above the baseline
            const clearHeight = textLineHeightMm * 1.2; // Ensure full coverage of the text line
    
            pdfInstance.setFillColor(255, 255, 255); // White
            pdfInstance.rect(clearX, clearY, clearWidth, clearHeight, 'F');
        } else { // First pass, draw the line
            pdfInstance.setDrawColor(PDF_COLOR_LINE[0], PDF_COLOR_LINE[1], PDF_COLOR_LINE[2]);
            pdfInstance.setLineWidth(0.3);
            pdfInstance.line(PAGE_MARGIN_MM, footerLineY, PDF_PAGE_WIDTH_MM - PAGE_MARGIN_MM, footerLineY);
        }
    
        pdfInstance.setFont(FONT_STYLE_NORMAL).setFontSize(FONT_SIZE_FOOTER_TEXT).setTextColor(PDF_COLOR_MUTED_TEXT[0], PDF_COLOR_MUTED_TEXT[1], PDF_COLOR_MUTED_TEXT[2]);
        
        pdfInstance.text("WanderAI", PAGE_MARGIN_MM, footerTextY);
    
        const dateTextWidth = pdfInstance.getStringUnitWidth(generationTimestampStr) * FONT_SIZE_FOOTER_TEXT / pdfInstance.internal.scaleFactor;
        pdfInstance.text(generationTimestampStr, PDF_PAGE_WIDTH_MM - PAGE_MARGIN_MM - dateTextWidth, footerTextY);
    
        const currentTextWidth = pdfInstance.getStringUnitWidth(pageNumText) * FONT_SIZE_FOOTER_TEXT / pdfInstance.internal.scaleFactor;
        pdfInstance.text(pageNumText, (PDF_PAGE_WIDTH_MM / 2) - (currentTextWidth / 2), footerTextY);
    };
    
    const checkAndAddNewPageIfNeeded = (neededHeight: number) => {
        if (yRef.current + neededHeight > MAX_Y_BEFORE_FOOTER_MM) {
            pdf.addPage();
            currentPageNumRef.current++;
            drawPageHeader(pdf, svgDataUrl);
            drawPageFooter(pdf, currentPageNumRef.current, totalPagesPlaceholder, false); // First pass for new page
            yRef.current = CONTENT_START_Y_MM;
            return true;
        }
        return false;
    };

    const renderTextWithStyles = (
        textToRender: string,
        x: number,
        style: {
            fontSize: number;
            fontName?: typeof FONT_STYLE_NORMAL | typeof FONT_STYLE_BOLD;
            color?: number[];
            maxWidth?: number;
            lineSpacingFactor?: number;
            isListItem?: boolean;
            bulletChar?: string;
        }
    ) => {
        const {
            fontSize: effectiveFontSize,
            fontName: effectiveFontName = FONT_STYLE_NORMAL,
            color: effectiveColor = PDF_COLOR_TEXT_DEFAULT,
            maxWidth: textRenderWidth = MAX_CONTENT_WIDTH_MM,
            lineSpacingFactor = LINE_SPACING_FACTOR_BODY,
            isListItem = false,
            bulletChar = "•",
        } = style;

        const originalFont = { name: pdf.getFont().fontName, style: pdf.getFont().fontStyle, size: pdf.getFontSize() };
        const originalTextColor = pdf.getTextColor();

        pdf.setFont(effectiveFontName, effectiveFontName === FONT_STYLE_BOLD ? "bold" : "normal")
           .setFontSize(effectiveFontSize)
           .setTextColor(effectiveColor[0], effectiveColor[1], effectiveColor[2]);

        const singleLineHeightMm = (effectiveFontSize * 0.352778) * lineSpacingFactor; 

        const textLines = pdf.splitTextToSize(textToRender, textRenderWidth - (isListItem ? effectiveFontSize * 0.5 : 0));

        textLines.forEach((line: string) => {
            checkAndAddNewPageIfNeeded(singleLineHeightMm);

            let currentXPosForSegment = isListItem ? x + effectiveFontSize * 0.5 : x;
            if (isListItem) {
                const bulletFontSize = Math.min(effectiveFontSize, 12);
                const tempFont = { name: pdf.getFont().fontName, style: pdf.getFont().fontStyle, size: pdf.getFontSize() };
                const tempColor = pdf.getTextColor();

                pdf.setFont(FONT_STYLE_NORMAL, "normal").setFontSize(bulletFontSize).setTextColor(effectiveColor[0], effectiveColor[1], effectiveColor[2]);
                pdf.text(bulletChar, x, yRef.current); 

                pdf.setFont(tempFont.name, tempFont.style).setFontSize(tempFont.size).setTextColor(tempColor[0],tempColor[1],tempColor[2]);
                pdf.setFont(effectiveFontName, effectiveFontName === FONT_STYLE_BOLD ? "bold" : "normal").setFontSize(effectiveFontSize);
            }

            const boldRegex = /(\*\*.*?\*\*)/g;
            const parts = line.split(boldRegex);
            let lineIsEmpty = true;

            parts.forEach(part => {
                const isBold = part.startsWith('**') && part.endsWith('**');
                const textSegment = isBold ? part.slice(2, -2) : part;
                if(textSegment.trim() !== "") lineIsEmpty = false;

                pdf.setFont(effectiveFontName, isBold ? "bold" : "normal"); 
                pdf.text(textSegment, currentXPosForSegment, yRef.current, { charSpace: 0 });
                currentXPosForSegment += pdf.getStringUnitWidth(textSegment) * effectiveFontSize / pdf.internal.scaleFactor;
            });
            if (!lineIsEmpty || isListItem) { 
                 yRef.current += singleLineHeightMm;
            }
        });
        pdf.setFont(originalFont.name, originalFont.style).setFontSize(originalFont.size).setTextColor(originalTextColor[0], originalTextColor[1], originalTextColor[2]);
    };

    drawPageHeader(pdf, svgDataUrl);
    drawPageFooter(pdf, currentPageNumRef.current, totalPagesPlaceholder, false); // First pass for initial page

    const itineraryLines = itinerary.split('\n');
    let isPreviousLineBlank = false;
    let isFirstContentElement = true; 

    const mainSectionTitleRegex = /^(Introduction|Overview|Day\s+\d+.*?):?$/i;
    const subHeadingRegex = /^\s*(Activities|Attractions|Food(?: Recommendations)?|Hotel(?: Suggestions)?|Accommodation|Local Tips|Tips(?: & Advice)?|Transportation)\s*:\s*(.*)/i;
    const subHeadingOnlyRegex = /^\s*(Activities|Attractions|Food(?: Recommendations)?|Hotel(?: Suggestions)?|Accommodation|Local Tips|Tips(?: & Advice)?|Transportation)\s*:\s*$/i;
    const listItemRegex = /^\s*(?:[-*\u2022]|\d+\.|\d+\))\s*(.*)/;

    for (let i = 0; i < itineraryLines.length; i++) {
        const line = itineraryLines[i];
        const trimmedLine = line.trim();

        if (trimmedLine === "") {
            if (!isPreviousLineBlank) { 
                checkAndAddNewPageIfNeeded(EMPTY_LINE_SPACING_MM);
                yRef.current += EMPTY_LINE_SPACING_MM;
                isPreviousLineBlank = true;
            }
            continue; 
        }
        isPreviousLineBlank = false; 

        const mainTitleMatch = trimmedLine.match(mainSectionTitleRegex);
        if (mainTitleMatch) {
            const titleText = mainTitleMatch[1].trim();
            if (!isFirstContentElement) {
                checkAndAddNewPageIfNeeded(SPACE_ABOVE_SEPARATOR_MM);
                yRef.current += SPACE_ABOVE_SEPARATOR_MM;

                checkAndAddNewPageIfNeeded(SEPARATOR_LINE_THICKNESS_MM);
                const lineYPos = yRef.current; 
                pdf.setDrawColor(PDF_COLOR_LINE[0], PDF_COLOR_LINE[1], PDF_COLOR_LINE[2]);
                pdf.setLineWidth(SEPARATOR_LINE_THICKNESS_MM);
                pdf.line(PAGE_MARGIN_MM, lineYPos, PDF_PAGE_WIDTH_MM - PAGE_MARGIN_MM, lineYPos);
                yRef.current = lineYPos + SEPARATOR_LINE_THICKNESS_MM; 
            }
            
            checkAndAddNewPageIfNeeded(SPACE_BELOW_SEPARATOR_TO_TITLE_MM); 
            yRef.current += SPACE_BELOW_SEPARATOR_TO_TITLE_MM;

            renderTextWithStyles(titleText, PAGE_MARGIN_MM, {
                fontSize: FONT_SIZE_MAIN_TITLE, fontName: FONT_STYLE_BOLD, color: PDF_COLOR_PRIMARY_HEADING, lineSpacingFactor: LINE_SPACING_FACTOR_HEADING
            });
            checkAndAddNewPageIfNeeded(SPACE_AFTER_MAIN_TITLE_MM); 
            yRef.current += SPACE_AFTER_MAIN_TITLE_MM;
            isFirstContentElement = false;
            continue;
        }

        const subHeadingOnlyMatch = trimmedLine.match(subHeadingOnlyRegex);
        const subHeadingMatch = trimmedLine.match(subHeadingRegex);

        if (subHeadingOnlyMatch || (subHeadingMatch && subHeadingMatch[1])) {
            checkAndAddNewPageIfNeeded(SPACE_BEFORE_SUB_HEADING_MM);
            yRef.current += SPACE_BEFORE_SUB_HEADING_MM;

            const subText = (subHeadingOnlyMatch ? subHeadingOnlyMatch[1] : subHeadingMatch![1]).trim();
            const remainingContent = subHeadingOnlyMatch ? "" : (subHeadingMatch![2] || "").trim();

            renderTextWithStyles(subText + (remainingContent && subText.slice(-1) !== ':' ? ":" : ""), PAGE_MARGIN_MM, { 
                fontSize: FONT_SIZE_SUB_HEADING, fontName: FONT_STYLE_BOLD, color: PDF_COLOR_SECONDARY_HEADING, lineSpacingFactor: LINE_SPACING_FACTOR_HEADING
            });
            
            if (remainingContent) {
                 renderTextWithStyles(remainingContent, PAGE_MARGIN_MM + 2, { 
                    fontSize: FONT_SIZE_BODY, color: PDF_COLOR_TEXT_DEFAULT, lineSpacingFactor: LINE_SPACING_FACTOR_BODY
                 });
            } else {
                checkAndAddNewPageIfNeeded(SPACE_AFTER_SUB_HEADING_MM);
                yRef.current += SPACE_AFTER_SUB_HEADING_MM;
            }
            isFirstContentElement = false;
            continue;
        }

        const listItemMatch = trimmedLine.match(listItemRegex);
        if (listItemMatch) {
            const itemText = listItemMatch[1].trim();
            renderTextWithStyles(itemText, PAGE_MARGIN_MM, {
                fontSize: FONT_SIZE_LIST_ITEM, isListItem: true, color: PDF_COLOR_TEXT_DEFAULT, lineSpacingFactor: LINE_SPACING_FACTOR_LIST
            });
             checkAndAddNewPageIfNeeded(SPACE_AFTER_LIST_ITEM_MM); 
             yRef.current += SPACE_AFTER_LIST_ITEM_MM;
            isFirstContentElement = false;
            continue;
        }
        
        checkAndAddNewPageIfNeeded(SPACE_BEFORE_PARAGRAPH_MM); 
        yRef.current += SPACE_BEFORE_PARAGRAPH_MM;
        renderTextWithStyles(trimmedLine, PAGE_MARGIN_MM, {
            fontSize: FONT_SIZE_BODY, color: PDF_COLOR_TEXT_DEFAULT, lineSpacingFactor: LINE_SPACING_FACTOR_BODY
        });
        checkAndAddNewPageIfNeeded(SPACE_AFTER_PARAGRAPH_MM); 
        yRef.current += SPACE_AFTER_PARAGRAPH_MM;
        isFirstContentElement = false;
    }

    const finalTotalPages = currentPageNumRef.current;
    for (let pageIdx = 1; pageIdx <= finalTotalPages; pageIdx++) {
        pdf.setPage(pageIdx);
        drawPageFooter(pdf, pageIdx, finalTotalPages.toString(), true); // Second pass for all pages
    }

    try {
      pdf.save('wanderai-itinerary.pdf');
      toast({ title: "Export Successful", description: `Your itinerary (${finalTotalPages} page(s)) has been downloaded.`, className: "bg-primary text-primary-foreground" });
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
    <>
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
             {itinerary && destination && (
              <Button
                onClick={() => setIsChatOpen(true)}
                variant="outline"
                className="text-primary border-primary hover:bg-primary/10 font-body w-full sm:w-auto"
                disabled={isRefining || isExportingPdf}
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Chat About Trip
              </Button>
            )}
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

          <ScrollArea className="h-[600px] overflow-y-auto p-1" viewportRef={scrollAreaViewportRef}>
              <div className="space-y-1">
                {allSectionsInOrderForHtml.map((section) => {
                  const sectionHtmlId = section.id || `html-display-section-${Math.random().toString(36).substring(2, 9)}`;
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
      {itinerary && destination && (
        <ItineraryChatbot
          itineraryContent={itinerary}
          destination={destination}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </>
  );
}
