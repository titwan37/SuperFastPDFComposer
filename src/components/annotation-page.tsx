
"use client";

import { useState, useEffect, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { AnnotationToolbar } from "./annotation-toolbar";
import { DraggableAnnotation } from "./draggable-annotation";
import type { Annotation, TextAnnotation } from "@/lib/types";

// pdf.js worker configuration
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
}

interface AnnotationPageProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: PDFDocument;
  pageIndex: number;
  onSave: (annotatedDoc: PDFDocument) => void;
}

export function AnnotationPage({ isOpen, onClose, pdfDoc, pageIndex, onSave }: AnnotationPageProps) {
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'pen'>('select');
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);

  // Style for the currently active tool
  const [textColor, setTextColor] = useState("#000000");
  const [fontSize, setFontSize] = useState(16);
  const [strokeColor, setStrokeColor] = useState("#FF0000");
  const [strokeWidth, setStrokeWidth] = useState(5);
  
  const pageContainerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const renderPage = async () => {
        // Save the pdf-lib document to a buffer
        const pdfBytes = await pdfDoc.save();
        // Load the PDF with pdf.js
        const pdfjsDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;
        const page = await pdfjsDoc.getPage(pageIndex + 1);
        
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

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
      };
      renderPage();
      setAnnotations([]); // Reset annotations when a new page is opened
    }
  }, [isOpen, pdfDoc, pageIndex]);

  const handleSave = async () => {
    // This is where we will "flatten" the annotations onto the PDF
    // For now, it's a placeholder.
    console.log("Saving annotations...", annotations);
    onSave(pdfDoc); 
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'text' && pageContainerRef.current) {
        const rect = pageContainerRef.current.getBoundingClientRect();
        const newAnnotation: TextAnnotation = {
            id: `text-${Date.now()}`,
            type: 'text',
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            width: 150,
            height: 30,
            text: 'Type here...',
            fontSize,
            fontColor: textColor,
            isEditing: true,
        };
        setAnnotations(prev => [...prev, newAnnotation]);
        setSelectedAnnotationId(newAnnotation.id);
        setActiveTool('select'); // Switch to select tool to allow moving the new text box
    } else {
        setSelectedAnnotationId(null);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Annotate Page {pageIndex + 1}</DialogTitle>
        </DialogHeader>

        <div className="flex-grow flex flex-col gap-2">
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
            />
          {isLoading || !pageImageUrl ? (
            <div className="flex-grow flex items-center justify-center">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="flex-grow relative overflow-auto border rounded-md" >
                <div 
                    ref={pageContainerRef}
                    className="relative"
                    onClick={handlePageClick}
                >
                    <img src={pageImageUrl} alt={`Page ${pageIndex + 1}`} className="w-full h-auto" />
                    {/* Drawing canvas would go here */}

                    {/* Text Annotations */}
                    {annotations.filter(a => a.type === 'text').map(anno => (
                        <DraggableAnnotation key={anno.id} annotation={anno as TextAnnotation} />
                    ))}
                </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Annotations</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
