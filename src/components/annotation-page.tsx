
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  DndContext,
  useSensor,
  PointerSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { AnnotationToolbar } from "./annotation-toolbar";
import { DraggableAnnotation } from "./draggable-annotation";
import { DraggableIconAnnotation } from "./draggable-icon-annotation";
import type { Annotation, TextAnnotation, IconAnnotation } from "@/lib/types";

// pdf.js worker configuration
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
}

interface AnnotationPageProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: PDFDocument;
  pageIndex: number;
  onSave: (annotatedDoc: PDFDocument) => void;
}

export function AnnotationPage({
  isOpen,
  onClose,
  pdfDoc,
  pageIndex,
  onSave,
}: AnnotationPageProps) {
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'pen' | 'check' | 'cross'>("select");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pageDimensions, setPageDimensions] = useState<{width: number, height: number, renderedWidth: number, renderedHeight: number}>({width: 0, height: 0, renderedWidth: 0, renderedHeight: 0});

  // Style for the currently active tool
  const [textColor, setTextColor] = useState("#000000");
  const [fontSize, setFontSize] = useState(16);
  const [strokeColor, setStrokeColor] = useState("#008000");
  const [strokeWidth, setStrokeWidth] = useState(3);

  const pageContainerRef = useRef<HTMLDivElement>(null);
  
  const sensors = [useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5,
    },
  })];
  
  const RENDER_SCALE = 3; // Increase for better quality

  const renderPage = useCallback(async () => {
    setIsLoading(true);
    const tempDoc = await pdfDoc.copy();
    const pdfBytes = await tempDoc.save();
    const pdfjsDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;
    const page = await pdfjsDoc.getPage(pageIndex + 1);
    const originalViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    setPageDimensions({
        width: originalViewport.width,
        height: originalViewport.height,
        renderedWidth: viewport.width,
        renderedHeight: viewport.height,
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) {
      setIsLoading(false);
      return;
    }

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    setPageImageUrl(canvas.toDataURL());
    setIsLoading(false);
  }, [pdfDoc, pageIndex]);

  useEffect(() => {
    if (isOpen) {
      renderPage();
      setAnnotations([]); // Reset annotations when a new page is opened
    }
  }, [isOpen, pdfDoc, pageIndex, renderPage]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const finalDoc = await pdfDoc.copy();
      const page = finalDoc.getPage(pageIndex);
      const { width, height } = page.getSize();
      const font = await finalDoc.embedFont(StandardFonts.Helvetica);

      for (const anno of annotations) {
        const scaleFactor = pageDimensions.width / (pageDimensions.renderedWidth * zoom);
        
        if (anno.type === "text") {
          const textAnno = anno as TextAnnotation;
          const [r, g, b] = textAnno.fontColor
            .substring(1)
            .match(/.{2}/g)!
            .map((hex) => parseInt(hex, 16) / 255);
            
          const x = textAnno.x * scaleFactor;
          const y = height - (textAnno.y * scaleFactor) - (textAnno.fontSize * 1); // Adjust for font size offset from bottom
            
          page.drawText(textAnno.text, {
            x,
            y,
            font: font,
            size: textAnno.fontSize,
            color: rgb(r, g, b),
          });
        }
        if (anno.type === "icon") {
          const iconAnno = anno as IconAnnotation;
           const [r, g, b] = iconAnno.strokeColor
            .substring(1)
            .match(/.{2}/g)!
            .map((hex) => parseInt(hex, 16) / 255);
          
          const iconSize = iconAnno.size * scaleFactor;
          const x = iconAnno.x * scaleFactor;
          const y = height - (iconAnno.y * scaleFactor) - iconSize;

          if (iconAnno.iconType === 'check') {
             page.drawSvgPath(
              `M${x} ${y + iconSize / 2} L${x + iconSize / 3} ${y} L${x + iconSize} ${y + iconSize * 0.8}`, {
                borderColor: rgb(r, g, b),
                borderWidth: iconAnno.strokeWidth,
              }
            )
          }
          if (iconAnno.iconType === 'cross') {
             page.drawSvgPath(
              `M${x} ${y} L${x + iconSize} ${y + iconSize} M${x} ${y + iconSize} L${x + iconSize} ${y}`, {
                borderColor: rgb(r, g, b),
                borderWidth: iconAnno.strokeWidth,
              }
            )
          }
        }
        // TODO: Implement drawing annotation saving
      }
      onSave(finalDoc);
    } catch(e) {
      console.error("Failed to save annotations", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pageContainerRef.current) return;
    
    const rect = pageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "text") {
      const newAnnotation: TextAnnotation = {
        id: `text-${Date.now()}`,
        type: "text",
        x: x,
        y: y,
        width: 150,
        height: 30,
        text: "Type here...",
        fontSize,
        fontColor: textColor,
        isEditing: true,
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
      setSelectedAnnotationId(newAnnotation.id);
      setActiveTool("select"); // Switch to select tool to allow moving the new text box
    } else if (activeTool === 'check' || activeTool === 'cross') {
      const newAnnotation: IconAnnotation = {
        id: `icon-${Date.now()}`,
        type: 'icon',
        iconType: activeTool,
        x: x - 15, // center icon
        y: y - 15, // center icon
        size: 30,
        strokeColor: strokeColor,
        strokeWidth: strokeWidth,
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      setActiveTool('select');
    } else {
      // Deselect if clicking on the page background
      if (e.target === pageContainerRef.current || (e.target as HTMLElement).tagName === 'IMG') {
        setSelectedAnnotationId(null);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    setAnnotations((prev) =>
      prev.map((anno) =>
        anno.id === active.id
          ? { ...anno, x: anno.x + delta.x, y: anno.y + delta.y }
          : anno
      )
    );
  };
  
  const updateAnnotationText = (id: string, newText: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? {...a, text: newText} : a));
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Annotate Page {pageIndex + 1}</DialogTitle>
        </DialogHeader>

        <div className="flex-grow flex flex-col gap-2 min-h-0">
          <AnnotationToolbar
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            textColor={textColor}
            setTextColor={setTextColor}
            fontSize={fontSize}
            setFontSize={setFontSize}
            strokeColor={strokeColor}
            setStrokeColor={setStrokeColor}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
            zoom={zoom}
            setZoom={setZoom}
          />
          <div className="flex-grow relative overflow-auto border rounded-md bg-muted/20">
            {isLoading || !pageImageUrl ? (
              <div className="flex h-full items-center justify-center">
                <Loader className="h-8 w-8 animate-spin" />
              </div>
            ) : (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div
                      ref={pageContainerRef}
                      className="relative mx-auto"
                      style={{ 
                        width: pageDimensions.renderedWidth * zoom,
                        height: pageDimensions.renderedHeight * zoom
                       }}
                      onClick={handlePageClick}
                    >
                      <img
                        src={pageImageUrl}
                        alt={`Page ${pageIndex + 1}`}
                        className="w-full h-full"
                      />
                       {annotations.map((anno) => {
                        if (anno.type === 'text') {
                          return (
                            <DraggableAnnotation
                              key={anno.id}
                              annotation={anno}
                              isSelected={selectedAnnotationId === anno.id}
                              onSelect={() => setSelectedAnnotationId(anno.id)}
                              onDelete={() => deleteAnnotation(anno.id)}
                              onTextChange={(newText) => updateAnnotationText(anno.id, newText)}
                            />
                          );
                        }
                        if (anno.type === 'icon') {
                          return (
                            <DraggableIconAnnotation
                              key={anno.id}
                              annotation={anno}
                              isSelected={selectedAnnotationId === anno.id}
                              onSelect={() => setSelectedAnnotationId(anno.id)}
                              onDelete={() => deleteAnnotation(anno.id)}
                            />
                          )
                        }
                        return null;
                      })}
                    </div>
                </DndContext>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Save Annotations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
