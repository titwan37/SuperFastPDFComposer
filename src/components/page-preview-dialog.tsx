"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist/types/src/display/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader, RotateCw, FileSignature, FileEdit, RotateCcw, ChevronLeft, ChevronRight, Download, RefreshCw, Check, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { Annotation } from "@/lib/types";

interface PagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDocProxy: PDFDocumentProxy | null;
  pageNumber: number;
  onSign: () => void;
  onAnnotate: () => void;
  onRotateRight: () => void;
  onRotateLeft: () => void;
  onSelectAndDrop: () => void;
  isTargetPage: boolean;
  onNavigate: (direction: 'prev' | 'next') => void;
  totalPages: number;
  optimizationQuality: number;
  setOptimizationQuality: (quality: number) => void;
  annotations?: Annotation[];
}

export function PagePreviewDialog({
  isOpen,
  onClose,
  pdfDocProxy,
  pageNumber,
  onSign,
  onAnnotate,
  onRotateRight,
  onRotateLeft,
  onSelectAndDrop,
  isTargetPage,
  onNavigate,
  totalPages,
  optimizationQuality,
  setOptimizationQuality,
  annotations = [],
}: PagePreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 1100 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const renderPage = useCallback(async () => {
    if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
    }
    
    if (!pdfDocProxy || !canvasRef.current) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    try {
      const page = await pdfDocProxy.getPage(pageNumber);
      const desiredWidth = 800;
      const viewport = page.getViewport({ scale: 1 });
      const scale = desiredWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      setDimensions({
        width: scaledViewport.width,
        height: scaledViewport.height,
      });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) {
        setIsLoading(false);
        return;
      }
      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
      renderTaskRef.current = null;

    } catch (e: any) {
      if (e.name !== 'RenderingCancelledException') {
        console.error("Failed to render page preview", e);
      }
    } finally {
      setIsLoading(false);
    }
  }, [pdfDocProxy, pageNumber]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        renderPage();
      }, 50);
      return () => clearTimeout(timer);
    }

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [isOpen, pageNumber, pdfDocProxy, renderPage]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-6 rounded-3xl">
        <DialogHeader className="flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <DialogTitle className="font-headline text-lg font-bold">
              Page {pageNumber} Preview
            </DialogTitle>
            {annotations.length > 0 && (
              <span className="text-[11px] font-semibold bg-primary/15 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                {annotations.filter(a => a.type === 'signature').length > 0 ? 'Signed' : 'Annotated'} ({annotations.length})
              </span>
            )}
          </div>
          
            <TooltipProvider>
              <div className="flex items-center gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={renderPage}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Refresh Preview</p></TooltipContent>
                </Tooltip>
                {!isTargetPage && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={onSelectAndDrop}>
                                <Download className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Select and Drop Page</p></TooltipContent>
                    </Tooltip>
                )}
                {isTargetPage && (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={onRotateLeft}>
                                <RotateCcw className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Rotate 90° Left</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={onRotateRight}>
                            <RotateCw className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Rotate 90° Right</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={onSign} className="border-primary/40 text-primary hover:bg-primary/10">
                            <FileSignature className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Sign Page</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={onAnnotate}>
                            <FileEdit className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Annotate Page</p></TooltipContent>
                        </Tooltip>
                    </>
                )}
              </div>
            </TooltipProvider>
          
        </DialogHeader>
        <div className="relative group flex-grow flex items-center justify-center p-4 overflow-auto bg-muted/20 rounded-2xl border">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20 rounded-2xl">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                  "absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-30",
                  pageNumber <= 1 && "hidden"
              )}
              onClick={() => onNavigate('prev')}
              disabled={pageNumber <= 1}
              >
              <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-30",
                  pageNumber >= totalPages && "hidden"
              )}
              onClick={() => onNavigate('next')}
              disabled={pageNumber >= totalPages}
              >
              <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Page Display with Annotation Overlay */}
          <div
            className="relative shadow-lg rounded-lg overflow-hidden bg-white dark:bg-slate-900 border"
            style={{
              width: `${dimensions.width}px`,
              maxWidth: '100%',
              maxHeight: '100%',
              display: isLoading ? 'none' : 'block',
            }}
          >
            <canvas
              ref={canvasRef}
              className="block w-full h-auto"
            />
            {annotations.length > 0 && (
              <div className="absolute inset-0 pointer-events-none select-none">
                {/* SVG for drawing annotations */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {annotations.map(ann => {
                    if (ann.type !== 'drawing') return null;
                    return ann.paths.map((path, idx) => (
                      <polyline
                        key={`${ann.id}-${idx}`}
                        points={path.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke={ann.strokeColor}
                        strokeWidth={ann.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ));
                  })}
                </svg>

                {/* Text, Icon, and Signature Overlays */}
                {annotations.map(ann => {
                  if (ann.type === 'signature') {
                    return (
                      <div
                        key={ann.id}
                        className="absolute flex items-center justify-center"
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          width: `${ann.width}px`,
                          height: `${ann.height}px`,
                        }}
                      >
                        <img
                          src={ann.dataUrl}
                          alt="Signature"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      </div>
                    );
                  }
                  if (ann.type === 'text') {
                    return (
                      <div
                        key={ann.id}
                        className="absolute whitespace-pre-wrap font-sans leading-tight"
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          width: `${ann.width}px`,
                          height: `${ann.height}px`,
                          fontSize: `${ann.fontSize}px`,
                          color: ann.fontColor,
                        }}
                      >
                        {ann.text}
                      </div>
                    );
                  }
                  if (ann.type === 'icon') {
                    const IconComp = ann.iconType === 'check' ? Check : X;
                    return (
                      <div
                        key={ann.id}
                        className="absolute flex items-center justify-center"
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          width: `${ann.size}px`,
                          height: `${ann.size}px`,
                          color: ann.strokeColor,
                        }}
                      >
                        <IconComp className="w-full h-full" strokeWidth={ann.strokeWidth} />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
            <div className="w-full space-y-2">
                <Label htmlFor="quality-slider" className="flex justify-between text-sm">
                    <span>Optimization Quality</span>
                    <span className="font-bold text-primary">{optimizationQuality}%</span>
                </Label>
                 <Slider
                    id="quality-slider"
                    min={1}
                    max={100}
                    step={1}
                    value={[optimizationQuality]}
                    onValueChange={(value) => setOptimizationQuality(value[0])}
                />
                <p className="text-xs text-muted-foreground">
                    Adjust the quality for the document optimization. Lower values result in smaller file sizes but lower image quality.
                </p>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
