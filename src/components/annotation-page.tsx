"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader, Trash2 } from "lucide-react";
import { AnnotationToolbar, type AnnotationToolType } from "./annotation-toolbar";
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { DraggableAnnotation } from "./draggable-annotation";
import { DraggableIconAnnotation } from "./draggable-icon-annotation";
import { DraggableSignatureAnnotation } from "./draggable-signature-annotation";
import { DraggableMaskAnnotation } from "./draggable-mask-annotation";
import { SignatureDialog } from "./signature-dialog";
import type {
  Annotation,
  TextAnnotation,
  IconAnnotation,
  DrawingAnnotation,
  SignatureAnnotation,
  RedactionMaskAnnotation,
  BlackoutMarkerAnnotation,
  HighlighterAnnotation,
  HighlighterColor,
} from '@/lib/types';
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

let uniqueIdCounter = 0;
const getUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${uniqueIdCounter++}`;

const HIGHLIGHTER_COLOR_MAP: Record<HighlighterColor, string> = {
  yellow: '#facc15',
  green: '#4ade80',
  pink: '#f472b6',
  blue: '#38bdf8',
};

interface AnnotationPageProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: PDFDocument;
  pageIndex: number;
  initialAnnotations: Annotation[];
  onSave: (annotations: Annotation[]) => void;
  onAnnotationsChange?: (annotations: Annotation[]) => void;
}

export function AnnotationPage({
  isOpen,
  onClose,
  pdfDoc,
  pageIndex,
  initialAnnotations,
  onSave,
  onAnnotationsChange,
}: AnnotationPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationToolType>("select");
  const [zoom, setZoom] = useState(1);

  const [textColor, setTextColor] = useState("#000000");
  const [fontSize, setFontSize] = useState(16);
  const [strokeColor, setStrokeColor] = useState("#ff0000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [highlighterColor, setHighlighterColor] = useState<HighlighterColor>("yellow");

  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 800, height: 1100 });

  const [isDrawing, setIsDrawing] = useState(false);
  const drawingPathRef = useRef<{ x: number; y: number }[]>([]);

  const RENDER_SCALE = 2.5;

  useEffect(() => {
    setAnnotations(initialAnnotations);
  }, [initialAnnotations]);

  const renderPage = useCallback(async () => {
    if (!isOpen) return;
    setIsLoading(true);
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      }

      const tempDoc = await pdfDoc.copy();
      const pdfBytes = await tempDoc.save();
      const pdfjsDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;
      const page = await pdfjsDoc.getPage(pageIndex + 1);

      const containerWidth = 800;
      const viewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale: scale * RENDER_SCALE });

      setPageDimensions({
        width: scaledViewport.width / RENDER_SCALE,
        height: scaledViewport.height / RENDER_SCALE,
      });

      const tempCanvas = document.createElement("canvas");
      tempCanvas.height = scaledViewport.height;
      tempCanvas.width = scaledViewport.width;
      const context = tempCanvas.getContext("2d");

      if (!context) {
        setIsLoading(false);
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

  useEffect(() => {
    renderPage();
  }, [isOpen, pdfDoc, pageIndex, renderPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isEditingText =
        activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedAnnotationId && !isEditingText) {
        e.preventDefault();
        handleDeleteAnnotation(selectedAnnotationId);
      }

      if (e.key === 'Escape') {
        setSelectedAnnotationId(null);
      }

      if (!isEditingText) {
        if (e.key === 'v' || e.key === 'V') setActiveTool('select');
        if (e.key === 't' || e.key === 'T') setActiveTool('text');
        if (e.key === 'p' || e.key === 'P') setActiveTool('pen');
        if (e.key === 'h' || e.key === 'H') setActiveTool('highlighter');
        if (e.key === 'b' || e.key === 'B') setActiveTool('blackout');
        if (e.key === 'm' || e.key === 'M') setActiveTool('mask');
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          setIsSignatureModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedAnnotationId]);

  const getCoordinates = (clientX: number, clientY: number, currentTarget: HTMLElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;
    return { x, y };
  };

  const isFreehandTool =
    activeTool === 'pen' || activeTool === 'blackout' || activeTool === 'highlighter';

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFreehandTool) return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e.clientX, e.clientY, e.currentTarget);
    drawingPathRef.current = [{ x, y }];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !isFreehandTool) return;
    const { x, y } = getCoordinates(e.clientX, e.clientY, e.currentTarget);
    drawingPathRef.current.push({ x, y });

    setAnnotations((prev) => {
      const filtered = prev.filter((a) => a.id !== 'temp-freehand');

      if (activeTool === 'highlighter') {
        const tempHighlighter: HighlighterAnnotation = {
          id: 'temp-freehand',
          type: 'highlighter',
          paths: [drawingPathRef.current],
          color: highlighterColor,
          strokeWidth: 24,
          opacity: 0.35,
        };
        return [...filtered, tempHighlighter];
      }

      if (activeTool === 'blackout') {
        const tempBlackout: BlackoutMarkerAnnotation = {
          id: 'temp-freehand',
          type: 'blackout',
          paths: [drawingPathRef.current],
          strokeWidth: 16,
        };
        return [...filtered, tempBlackout];
      }

      const tempDrawing: DrawingAnnotation = {
        id: 'temp-freehand',
        type: 'drawing',
        paths: [drawingPathRef.current],
        strokeColor,
        strokeWidth,
      };
      return [...filtered, tempDrawing];
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !isFreehandTool) return;
    setIsDrawing(false);

    if (drawingPathRef.current.length > 0) {
      if (activeTool === 'highlighter') {
        const finalHighlighter: HighlighterAnnotation = {
          id: getUniqueId('highlighter'),
          type: 'highlighter',
          paths: [drawingPathRef.current],
          color: highlighterColor,
          strokeWidth: 24,
          opacity: 0.35,
        };
        setAnnotations((prev) => [
          ...prev.filter((a) => a.id !== 'temp-freehand'),
          finalHighlighter,
        ]);
      } else if (activeTool === 'blackout') {
        const finalBlackout: BlackoutMarkerAnnotation = {
          id: getUniqueId('blackout'),
          type: 'blackout',
          paths: [drawingPathRef.current],
          strokeWidth: 16,
        };
        setAnnotations((prev) => [
          ...prev.filter((a) => a.id !== 'temp-freehand'),
          finalBlackout,
        ]);
      } else {
        const finalAnnotation: DrawingAnnotation = {
          id: getUniqueId('drawing'),
          type: 'drawing',
          paths: [drawingPathRef.current],
          strokeColor,
          strokeWidth,
        };
        setAnnotations((prev) => [
          ...prev.filter((a) => a.id !== 'temp-freehand'),
          finalAnnotation,
        ]);
      }
    }
    drawingPathRef.current = [];
  };

  // Touch drawing handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isFreehandTool) return;
    setIsDrawing(true);
    const touch = e.touches[0];
    const { x, y } = getCoordinates(touch.clientX, touch.clientY, e.currentTarget);
    drawingPathRef.current = [{ x, y }];
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawing || !isFreehandTool) return;
    const touch = e.touches[0];
    const { x, y } = getCoordinates(touch.clientX, touch.clientY, e.currentTarget);
    drawingPathRef.current.push({ x, y });

    setAnnotations((prev) => {
      const filtered = prev.filter((a) => a.id !== 'temp-freehand');
      if (activeTool === 'highlighter') {
        return [
          ...filtered,
          {
            id: 'temp-freehand',
            type: 'highlighter',
            paths: [drawingPathRef.current],
            color: highlighterColor,
            strokeWidth: 24,
            opacity: 0.35,
          },
        ];
      }
      if (activeTool === 'blackout') {
        return [
          ...filtered,
          {
            id: 'temp-freehand',
            type: 'blackout',
            paths: [drawingPathRef.current],
            strokeWidth: 16,
          },
        ];
      }
      return [
        ...filtered,
        {
          id: 'temp-freehand',
          type: 'drawing',
          paths: [drawingPathRef.current],
          strokeColor,
          strokeWidth,
        },
      ];
    });
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (target.id === 'annotation-container' && selectedAnnotationId) {
      setSelectedAnnotationId(null);
    }

    if (e.target !== e.currentTarget) return;

    if (activeTool === 'text') {
      const { x, y } = getCoordinates(e.clientX, e.clientY, e.currentTarget);
      addTextAnnotation(x, y);
    } else if (activeTool === 'check' || activeTool === 'cross') {
      const { x, y } = getCoordinates(e.clientX, e.clientY, e.currentTarget);
      addIconAnnotation(x, y, activeTool);
    } else if (activeTool === 'mask') {
      const { x, y } = getCoordinates(e.clientX, e.clientY, e.currentTarget);
      addMaskAnnotation(x, y);
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
      width: 160,
      height: 40,
      isEditing: true,
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
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
    setAnnotations((prev) => [...prev, newAnnotation]);
    setSelectedAnnotationId(newAnnotation.id);
    setActiveTool('select');
  };

  const addMaskAnnotation = (x: number, y: number) => {
    const newAnnotation: RedactionMaskAnnotation = {
      id: getUniqueId('mask'),
      type: 'mask',
      x: Math.max(0, x - 80),
      y: Math.max(0, y - 25),
      width: 160,
      height: 50,
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
    setSelectedAnnotationId(newAnnotation.id);
    setActiveTool('select');
    toast({
      title: "Redaction Mask Added",
      description: "Drag to reposition or use the corner handle to resize.",
    });
  };

  const handleAddSignatureFromToolbar = (signatureDataUrl: string) => {
    const defaultWidth = 160;
    const defaultHeight = 70;
    const x = Math.max(20, (pageDimensions.width - defaultWidth) / 2);
    const y = Math.max(20, (pageDimensions.height - defaultHeight) / 2);

    const newAnnotation: SignatureAnnotation = {
      id: getUniqueId('sig'),
      type: 'signature',
      x,
      y,
      width: defaultWidth,
      height: defaultHeight,
      dataUrl: signatureDataUrl,
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
    setSelectedAnnotationId(newAnnotation.id);
    setActiveTool('select');

    toast({
      title: "Signature Placed",
      description: "You can drag to move or use the corner handle to resize.",
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const draggedId = active.id as string;

    setAnnotations((prev) =>
      prev.map((ann) => {
        if (ann.id === draggedId) {
          if (
            ann.type === 'text' ||
            ann.type === 'icon' ||
            ann.type === 'signature' ||
            ann.type === 'mask'
          ) {
            return {
              ...ann,
              x: ann.x + delta.x / zoom,
              y: ann.y + delta.y / zoom,
            };
          }
        }
        return ann;
      })
    );
  };

  const handleDeleteAnnotation = (idToDelete: string) => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== idToDelete));
    setSelectedAnnotationId(null);
  };

  const handleUpdateTextAnnotation = (id: string, newText: string) => {
    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === id && ann.type === 'text' ? { ...ann, text: newText } : ann
      )
    );
  };

  const handleUpdateAnnotationSize = (
    id: string,
    newSize: { width: number; height: number }
  ) => {
    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === id &&
        (ann.type === 'text' || ann.type === 'signature' || ann.type === 'mask')
          ? { ...ann, ...newSize }
          : ann
      )
    );
  };

  const handleClearAll = () => {
    if (annotations.length === 0) return;
    setAnnotations([]);
    setSelectedAnnotationId(null);
    toast({
      title: "Annotations Cleared",
      description: "All annotations have been removed from this page.",
    });
  };

  const getDrawingBBox = (
    annotation: DrawingAnnotation | BlackoutMarkerAnnotation | HighlighterAnnotation
  ) => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const path of annotation.paths) {
      for (const pt of path) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    }
    return { minX, minY, maxX, maxY };
  };

  const handleSave = () => {
    const cleanAnnotations = annotations.filter((a) => a.id !== 'temp-freehand');
    onSave(cleanAnnotations);
    onClose();
  };

  const handleCancel = () => {
    if (onAnnotationsChange) {
      onAnnotationsChange(initialAnnotations);
    }
    onClose();
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) handleCancel();
        }}
      >
        <DialogContent className="max-w-7xl h-[95vh] flex flex-col p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl font-bold">
              Annotate Page {pageIndex + 1}
            </DialogTitle>
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
              highlighterColor={highlighterColor}
              setHighlighterColor={setHighlighterColor}
              zoom={zoom}
              setZoom={setZoom}
              onDelete={() =>
                selectedAnnotationId && handleDeleteAnnotation(selectedAnnotationId)
              }
              hasSelection={!!selectedAnnotationId}
              onClearAll={annotations.length > 0 ? handleClearAll : undefined}
              onAddSignature={() => setIsSignatureModalOpen(true)}
            />
            <div className="flex-grow relative overflow-auto border rounded-2xl bg-muted/20 flex justify-start p-4">
              {isLoading && (
                <div className="absolute inset-0 z-20 flex h-full items-center justify-center bg-background/50 backdrop-blur-sm rounded-2xl">
                  <Loader className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <DndContext onDragEnd={handleDragEnd}>
                <div
                  className="relative shadow-md rounded-lg overflow-hidden bg-white dark:bg-slate-900 border"
                  style={{
                    width: pageDimensions.width,
                    height: pageDimensions.height,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <div
                    id="annotation-container"
                    className="absolute inset-0 select-none"
                    style={{
                      width: pageDimensions.width,
                      height: pageDimensions.height,
                      cursor: isFreehandTool
                        ? 'crosshair'
                        : activeTool === 'mask'
                        ? 'copy'
                        : 'default',
                      touchAction: isFreehandTool ? 'none' : 'auto',
                    }}
                    onClick={handleContainerClick}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleMouseUp}
                  >
                    {pageImageUrl ? (
                      <img
                        src={pageImageUrl}
                        alt={`Page ${pageIndex + 1}`}
                        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
                        draggable={false}
                      />
                    ) : (
                      !isLoading && (
                        <div className="w-full h-full flex items-center justify-center text-destructive-foreground">
                          Failed to load page preview.
                        </div>
                      )
                    )}

                    {/* SVG Layer 1: Fluorescent Highlighters (Multiply blend mode) */}
                    <svg
                      className={cn(
                        "absolute top-0 left-0 w-full h-full pointer-events-none",
                        activeTool === 'select' && "pointer-events-auto"
                      )}
                      style={{
                        width: pageDimensions.width,
                        height: pageDimensions.height,
                        mixBlendMode: 'multiply',
                      }}
                    >
                      {annotations.map((annotation) => {
                        if (annotation.type !== 'highlighter') return null;
                        const isSelected = annotation.id === selectedAnnotationId;
                        const fluoHex = HIGHLIGHTER_COLOR_MAP[annotation.color] || '#facc15';

                        return (
                          <g
                            key={annotation.id}
                            className={cn(activeTool === 'select' && "cursor-pointer")}
                            onClick={(e) => {
                              if (activeTool === 'select') {
                                e.stopPropagation();
                                setSelectedAnnotationId(annotation.id);
                              }
                            }}
                          >
                            {annotation.paths.map((path, pIndex) => (
                              <polyline
                                key={pIndex}
                                points={path.map((p) => `${p.x},${p.y}`).join(' ')}
                                fill="none"
                                stroke={isSelected ? '#2563eb' : fluoHex}
                                strokeWidth={annotation.strokeWidth || 24}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={isSelected ? 0.7 : annotation.opacity || 0.35}
                              />
                            ))}
                          </g>
                        );
                      })}
                    </svg>

                    {/* SVG Layer 2: Standard Drawings & Solid Blackout Markers */}
                    <svg
                      className={cn(
                        "absolute top-0 left-0 w-full h-full pointer-events-none",
                        activeTool === 'select' && "pointer-events-auto"
                      )}
                      style={{
                        width: pageDimensions.width,
                        height: pageDimensions.height,
                      }}
                    >
                      {annotations.map((annotation) => {
                        if (annotation.type !== 'drawing' && annotation.type !== 'blackout')
                          return null;
                        const isSelected = annotation.id === selectedAnnotationId;
                        const isBlackout = annotation.type === 'blackout';
                        const stroke = isSelected
                          ? '#2563eb'
                          : isBlackout
                          ? '#000000'
                          : annotation.strokeColor;
                        const width = isBlackout
                          ? annotation.strokeWidth || 16
                          : annotation.strokeWidth;

                        return (
                          <g
                            key={annotation.id}
                            className={cn(activeTool === 'select' && "cursor-pointer")}
                            onClick={(e) => {
                              if (activeTool === 'select') {
                                e.stopPropagation();
                                setSelectedAnnotationId(annotation.id);
                              }
                            }}
                          >
                            {annotation.paths.map((path, pIndex) => (
                              <polyline
                                key={pIndex}
                                points={path.map((p) => `${p.x},${p.y}`).join(' ')}
                                fill="none"
                                stroke={stroke}
                                strokeWidth={isSelected ? width + 2 : width}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={1}
                              />
                            ))}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* HTML/React Draggable & Resizable Elements */}
                  {annotations.map((annotation) => {
                    if (annotation.type === 'text') {
                      return (
                        <DraggableAnnotation
                          key={annotation.id}
                          annotation={annotation}
                          isSelected={annotation.id === selectedAnnotationId}
                          onSelect={() => setSelectedAnnotationId(annotation.id)}
                          onDelete={() => handleDeleteAnnotation(annotation.id)}
                          onTextChange={(newText) =>
                            handleUpdateTextAnnotation(annotation.id, newText)
                          }
                          onResizeStop={(size) =>
                            handleUpdateAnnotationSize(annotation.id, size)
                          }
                        />
                      );
                    }
                    if (annotation.type === 'icon') {
                      return (
                        <DraggableIconAnnotation
                          key={annotation.id}
                          annotation={annotation}
                          isSelected={annotation.id === selectedAnnotationId}
                          onSelect={() => setSelectedAnnotationId(annotation.id)}
                          onDelete={() => handleDeleteAnnotation(annotation.id)}
                        />
                      );
                    }
                    if (annotation.type === 'signature') {
                      return (
                        <DraggableSignatureAnnotation
                          key={annotation.id}
                          annotation={annotation}
                          isSelected={annotation.id === selectedAnnotationId}
                          onSelect={() => setSelectedAnnotationId(annotation.id)}
                          onDelete={() => handleDeleteAnnotation(annotation.id)}
                          onResizeStop={(size) =>
                            handleUpdateAnnotationSize(annotation.id, size)
                          }
                        />
                      );
                    }
                    if (annotation.type === 'mask') {
                      return (
                        <DraggableMaskAnnotation
                          key={annotation.id}
                          annotation={annotation}
                          isSelected={annotation.id === selectedAnnotationId}
                          onSelect={() => setSelectedAnnotationId(annotation.id)}
                          onDelete={() => handleDeleteAnnotation(annotation.id)}
                          onResizeStop={(size) =>
                            handleUpdateAnnotationSize(annotation.id, size)
                          }
                        />
                      );
                    }
                    if (
                      (annotation.type === 'drawing' ||
                        annotation.type === 'blackout' ||
                        annotation.type === 'highlighter') &&
                      annotation.id === selectedAnnotationId
                    ) {
                      const bbox = getDrawingBBox(annotation);
                      if (bbox.minX === Infinity) return null;
                      return (
                        <div
                          key={`del-${annotation.id}`}
                          className="absolute z-40 pointer-events-auto"
                          style={{
                            left: `${Math.min(pageDimensions.width - 28, bbox.maxX + 4)}px`,
                            top: `${Math.max(4, bbox.minY - 14)}px`,
                          }}
                        >
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-6 w-6 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnnotation(annotation.id);
                            }}
                            title="Delete stroke"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </DndContext>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              Save Annotations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog embedded inside Annotation view */}
      <SignatureDialog
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={(sigDataUrl) => handleAddSignatureFromToolbar(sigDataUrl)}
      />
    </>
  );
}
