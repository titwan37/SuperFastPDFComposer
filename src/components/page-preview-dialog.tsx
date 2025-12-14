
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader } from "lucide-react";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
}

interface PagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: PDFDocumentProxy | null;
  pageNumber: number;
}

export function PagePreviewDialog({
  isOpen,
  onClose,
  pdfDoc,
  pageNumber,
}: PagePreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) {
        setIsLoading(false);
        return;
    };
    setIsLoading(true);

    try {
      const page = await pdfDoc.getPage(pageNumber);
      // Adjust scale for better resolution in the preview
      const desiredWidth = 800;
      const viewport = page.getViewport({ scale: 1 });
      const scale = desiredWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      if (!context) {
        console.error("Could not get 2d context from canvas");
        setIsLoading(false);
        return;
      }

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };

      await page.render(renderContext).promise;
    } catch (e) {
      console.error("Failed to render page preview", e);
    } finally {
      setIsLoading(false);
    }
  }, [pdfDoc, pageNumber]);

  useEffect(() => {
    if (isOpen) {
      // Set a brief timeout to allow the dialog and canvas to mount properly
      setTimeout(() => {
        renderPage();
      }, 100);
    }
  }, [isOpen, renderPage]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Page {pageNumber} Preview</DialogTitle>
        </DialogHeader>
        <div className="relative flex-grow flex items-center justify-center p-4 overflow-auto bg-muted/20 rounded-md border">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="rounded-md shadow-md"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              display: isLoading ? 'none' : 'block'
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
