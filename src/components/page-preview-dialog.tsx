
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
    if (!pdfDoc || !canvasRef.current) return;
    setIsLoading(true);
    try {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 }); // High-quality render

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
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
      renderPage();
    }
  }, [isOpen, renderPage]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Page {pageNumber} Preview</DialogTitle>
        </DialogHeader>
        <div className="relative flex items-center justify-center p-4 overflow-auto bg-muted/20 rounded-md border min-h-[60vh]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="rounded-md shadow-md"
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
