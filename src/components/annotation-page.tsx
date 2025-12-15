
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { Dispatch, SetStateAction } from 'react';
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
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { DraggableAnnotation } from "./draggable-annotation";
import { DraggableIconAnnotation } from "./draggable-icon-annotation";
import type { Annotation, TextAnnotation, IconAnnotation } from '@/lib/types';
import { toast } from "@/hooks/use-toast";

// pdf.js worker configuration
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
}

let uniqueIdCounter = 0;
const getUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${uniqueIdCounter++}`;

interface AnnotationPageProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: PDFDocument;
  pageIndex: number;
  onSave: (annotatedDoc: PDFDocument) => void;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
};

export function AnnotationPage({
  isOpen,
  onClose,
  pdfDoc,
  pageIndex,
  onSave,
}: AnnotationPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'pen' | 'check' | 'cross'>("select");
  const [zoom, setZoom] = useState(1);

  // Style for the currently active tool
  const [textColor, setTextColor] = useState("#000000");
  const [fontSize, setFontSize] = useState(16);
  const [strokeColor, setStrokeColor] = useState("#008000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });

  const RENDER_SCALE = 3; // Increase for better quality

  const renderPage = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
        const tempDoc = await pdfDoc.copy();
        const pdfBytes = await tempDoc.save();
        const pdfjsDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;
        const page = await pdfjsDoc.getPage(pageIndex + 1);
        
        const containerWidth = 800; 
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: scale * RENDER_SCALE });
        
        setPageDimensions({ width: scaledViewport.width / RENDER_SCALE, height: scaledViewport.height / RENDER_SCALE });

        const tempCanvas = document.createElement("canvas");
        tempCanvas.height = scaledViewport.height;
        tempCanvas.width = scaledViewport.width;
        const context = tempCanvas.getContext("2d");

        if (!context) {
          setIsLoading(false);
          console.error("Could not get 2d context for page rendering.");
          return;
        }

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };
        await page.render(renderContext).promise;
        
        const imageUrl = tempCanvas.toDataURL();
        setPageImageUrl(imageUrl);

    } catch (e) {
      console.error("Failed to render page", e);
      toast({
        variant: "destructive",
        title: "Error Rendering Page",
        description: "Could not display the PDF page for annotation.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [pdfDoc, pageIndex, isOpen]);

  // Main effect to render the page
  useEffect(() => {
    renderPage();
  }, [isOpen, pdfDoc, pageIndex, renderPage]);

  // Effect to handle keyboard events for deleting annotations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isEditingText = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedAnnotationId && !isEditingText) {
        e.preventDefault(); 
        handleDeleteAnnotation(selectedAnnotationId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedAnnotationId, annotations]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (target.id === 'annotation-container' && selectedAnnotationId) {
        setSelectedAnnotationId(null);
    }

    if (activeTool === 'text') {
        const rect = target.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        addTextAnnotation(x, y);
    } else if (activeTool === 'check' || activeTool === 'cross') {
        const rect = target.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        addIconAnnotation(x, y, activeTool);
    }
  };
  
  const addTextAnnotation = (x: number, y: number) => {
    const newAnnotation: TextAnnotation = {
        id: getUniqueId('text'),
        type: 'text',
        x,
        y,
        text: 'Type here...',
        fontSize,
        fontColor: textColor,
        width: 150,
        height: 35,
        isEditing: true,
    };
    setAnnotations(prev => [...prev, newAnnotation]);
    setSelectedAnnotationId(newAnnotation.id);
  };
  
  const addIconAnnotation = (x: number, y: number, iconType: 'check' | 'cross') => {
    const newAnnotation: IconAnnotation = {
        id: getUniqueId(iconType),
        type: 'icon',
        iconType,
        x,
        y,
        size: 50,
        strokeColor,
        strokeWidth,
    };
    setAnnotations(prev => [...prev, newAnnotation]);
    setSelectedAnnotationId(newAnnotation.id);
    setActiveTool('select');
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const draggedId = active.id as string;
    
    setAnnotations(prev => 
        prev.map(ann => {
            if (ann.id === draggedId) {
                return {
                    ...ann,
                    x: ann.x + delta.x / zoom,
                    y: ann.y + delta.y / zoom,
                }
            }
            return ann;
        })
    );
  };
  
  const handleDeleteAnnotation = (idToDelete: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== idToDelete));
    setSelectedAnnotationId(null);
  };

  const handleUpdateTextAnnotation = (id: string, newText: string) => {
    setAnnotations(prev =>
      prev.map(ann => (ann.id === id && ann.type === 'text' ? { ...ann, text: newText } : ann))
    );
  };

  const handleUpdateAnnotationSize = (id: string, newSize: { width: number, height: number}) => {
    setAnnotations(prev =>
      prev.map(ann => (ann.id === id && ann.type === 'text' ? { ...ann, ...newSize } : ann))
    );
  };


  const handleSave = async () => {
    setIsLoading(true);
    try {
      const finalDoc = await pdfDoc.copy();
      const page = finalDoc.getPage(pageIndex);
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      const scaleX = pageWidth / pageDimensions.width;
      const scaleY = pageHeight / pageDimensions.height;

      const helveticaFont = await finalDoc.embedFont(StandardFonts.Helvetica);

      for (const annotation of annotations) {
        if (annotation.type === 'text') {
            const color = hexToRgb(annotation.fontColor);
            if (!color) continue;
            page.drawText(annotation.text, {
                x: annotation.x * scaleX,
                y: pageHeight - (annotation.y * scaleY) - (annotation.fontSize * scaleY),
                font: helveticaFont,
                size: annotation.fontSize * scaleY,
                color: rgb(color.r / 255, color.g / 255, color.b / 255),
            });
        } else if (annotation.type === 'icon') {
            const color = hexToRgb(annotation.strokeColor);
            if (!color) continue;

            const x = annotation.x * scaleX;
            const y = pageHeight - (annotation.y * scaleY) - (annotation.size * scaleY);
            const size = annotation.size * scaleX;
            const lineThickness = annotation.strokeWidth;
            
            if (annotation.iconType === 'check') {
                page.drawLine({
                    start: { x: x + size * 0.1, y: y + size * 0.5 },
                    end: { x: x + size * 0.4, y: y + size * 0.2 },
                    thickness: lineThickness,
                    color: rgb(color.r/255, color.g/255, color.b/255),
                });
                 page.drawLine({
                    start: { x: x + size * 0.4, y: y + size * 0.2 },
                    end: { x: x + size * 0.9, y: y + size * 0.8 },
                    thickness: lineThickness,
                    color: rgb(color.r/255, color.g/255, color.b/255),
                });
            } else if (annotation.iconType === 'cross') {
                page.drawLine({
                    start: { x: x, y: y },
                    end: { x: x + size, y: y + size },
                    thickness: lineThickness,
                    color: rgb(color.r/255, color.g/255, color.b/255),
                });
                page.drawLine({
                    start: { x: x, y: y + size },
                    end: { x: x + size, y: y },
                    thickness: lineThickness,
                    color: rgb(color.r/255, color.g/255, color.b/255),
                });
            }
        }
      }
      onSave(finalDoc);
    } catch(e) {
      console.error("Failed to save annotations", e);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "Could not save annotations to the PDF.",
      });
    } finally {
      setIsLoading(false);
      onClose();
    }
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
            onDelete={() => selectedAnnotationId && handleDeleteAnnotation(selectedAnnotationId)}
          />
          <div className="flex-grow relative overflow-auto border rounded-md bg-muted/20 flex justify-start">
            {isLoading && (
              <div className="absolute inset-0 z-20 flex h-full items-center justify-center bg-background/50">
                <Loader className="h-8 w-8 animate-spin" />
              </div>
            )}
            <DndContext onDragEnd={handleDragEnd}>
              <div
                className="relative"
                style={{
                  width: pageDimensions.width,
                  height: pageDimensions.height,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                  <div
                    id="annotation-container"
                    className="absolute inset-0"
                    style={{
                      width: pageDimensions.width,
                      height: pageDimensions.height,
                    }}
                    onClick={handleContainerClick}
                  >
                    {pageImageUrl ? (
                        <img src={pageImageUrl} alt={`Page ${pageIndex + 1}`} style={{ width: '100%', height: 'auto'}} />
                    ) : !isLoading && (
                        <div className="w-full h-full flex items-center justify-center text-destructive-foreground">Failed to load page preview.</div>
                    )}
                  </div>
                
                {annotations.map(annotation => {
                    if (annotation.type === 'text') {
                        return <DraggableAnnotation 
                                    key={annotation.id}
                                    annotation={annotation}
                                    isSelected={annotation.id === selectedAnnotationId}
                                    onSelect={() => setSelectedAnnotationId(annotation.id)}
                                    onDelete={() => handleDeleteAnnotation(annotation.id)}
                                    onTextChange={(newText) => handleUpdateTextAnnotation(annotation.id, newText)}
                                    onResizeStop={(size) => handleUpdateAnnotationSize(annotation.id, size)}
                                />;
                    }
                    if (annotation.type === 'icon') {
                        return <DraggableIconAnnotation
                                    key={annotation.id}
                                    annotation={annotation}
                                    isSelected={annotation.id === selectedAnnotationId}
                                    onSelect={() => setSelectedAnnotationId(annotation.id)}
                                    onDelete={() => handleDeleteAnnotation(annotation.id)}
                                />;
                    }
                    return null;
                })}
              </div>
            </DndContext>
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
