
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { fabric } from 'fabric';
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
  const [isLoading, setIsLoading] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'pen' | 'check' | 'cross'>("select");
  const [zoom, setZoom] = useState(0.5);

  // Style for the currently active tool
  const [textColor, setTextColor] = useState("#000000");
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [strokeColor, setStrokeColor] = useState("#008000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isTextWrapping, setIsTextWrapping] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const activeToolRef = useRef(activeTool);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  const RENDER_SCALE = 3; // Increase for better quality

  const renderPage = useCallback(async (canvas: fabric.Canvas) => {
    setIsLoading(true);
    try {
        const tempDoc = await pdfDoc.copy();
        const pdfBytes = await tempDoc.save();
        const pdfjsDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;
        const page = await pdfjsDoc.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: RENDER_SCALE });

        const tempCanvas = document.createElement("canvas");
        tempCanvas.height = viewport.height;
        tempCanvas.width = viewport.width;
        const context = tempCanvas.getContext("2d");

        if (!context) {
          setIsLoading(false);
          console.error("Could not get 2d context for page rendering.");
          return;
        }

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
        
        const imageUrl = tempCanvas.toDataURL();
        
        fabric.Image.fromURL(imageUrl, (img) => {
            canvas.setDimensions({ width: viewport.width, height: viewport.height });
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                scaleX: canvas.width! / img.width!,
                scaleY: canvas.height! / img.height!,
            });
            setIsLoading(false);
        }, { crossOrigin: 'anonymous' });
    } catch (e) {
      console.error("Failed to render page", e);
      setIsLoading(false);
    }
  }, [pdfDoc, pageIndex]);

  const updateToolbarForSelection = useCallback((obj: fabric.Object) => {
    if (obj.type === 'textbox') {
      const textbox = obj as fabric.Textbox;
      setTextColor(textbox.fill as string || '#000000');
      setFontSize(textbox.fontSize || 16);
      setFontFamily(textbox.fontFamily || 'Arial');
      setIsBold(textbox.fontWeight === 'bold');
      setIsItalic(textbox.fontStyle === 'italic');
    }
  }, []);

  const addTextAnnotation = (x: number, y: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const textbox = new fabric.Textbox("Type here...", {
      left: x,
      top: y,
      width: 200,
      fontSize,
      fontFamily,
      fill: textColor,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      splitByGrapheme: isTextWrapping,
      ...(!isTextWrapping && { width: undefined, autoSized: true } as any)
    });
    
    textbox.on('editing:entered', () => {
      if (textbox.text === 'Type here...') {
        textbox.text = '';
        textbox.set('width', 100);
        canvas.renderAll();
      }
    });

    textbox.on('changed', () => {
      if ((textbox as any).autoSized && textbox.width) {
        textbox.set('width', (textbox as any).getOptimalSize().width);
      }
    });
    
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    textbox.enterEditing();
    canvas.renderAll();
    setActiveTool('select');
  };

  // Main effect to initialize canvas and listeners
  useEffect(() => {
    if (!isOpen) {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!canvasRef.current) {
        return;
      }
      
      const canvas = new fabric.Canvas(canvasRef.current);
      fabricCanvasRef.current = canvas;

      renderPage(canvas);

      const handleMouseDown = (options: fabric.IEvent) => {
        const tool = activeToolRef.current;
        if (!options.target && tool === 'text') {
          const pointer = canvas.getPointer(options.e);
          addTextAnnotation(pointer.x, pointer.y);
        }
      };

      const handleSelection = (e: fabric.IEvent) => {
        if (e.target) {
          updateToolbarForSelection(e.target);
        }
      };

      canvas.on('mouse:down', handleMouseDown as (e: fabric.IEvent<Event>) => void);
      canvas.on('selection:created', handleSelection as (e: fabric.IEvent<Event>) => void);
      canvas.on('selection:updated', handleSelection as (e: fabric.IEvent<Event>) => void);

    }, 100); // Small delay to ensure canvas element is mounted

    return () => {
      clearTimeout(timeoutId);
      if (fabricCanvasRef.current) {
        // Clean up listeners
        fabricCanvasRef.current.off('mouse:down');
        fabricCanvasRef.current.off('selection:created');
        fabricCanvasRef.current.off('selection:updated');
      }
    };
  }, [isOpen, pdfDoc, pageIndex, renderPage, updateToolbarForSelection]);
  
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    if (activeTool === 'select') {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.forEachObject(obj => obj.set({ selectable: true }));
    } else if (activeTool === 'pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    } else {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.forEachObject(obj => obj.set({ selectable: false }));
    }
    canvas.renderAll();

  }, [activeTool, strokeColor, strokeWidth]);


  const applyStyleToSelection = (style: Partial<fabric.ITextboxOptions>) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject instanceof fabric.Textbox) {
      activeObject.set(style);
      if ('autoSized' in (style as any)) {
        (activeObject as any).autoSized = (style as any).autoSized;
      }
      canvas.renderAll();
    }
  };

  useEffect(() => { applyStyleToSelection({ fill: textColor }) }, [textColor]);
  useEffect(() => { applyStyleToSelection({ fontSize }) }, [fontSize]);
  useEffect(() => { applyStyleToSelection({ fontFamily }) }, [fontFamily]);
  useEffect(() => { applyStyleToSelection({ fontWeight: isBold ? 'bold' : 'normal' }) }, [isBold]);
  useEffect(() => { applyStyleToSelection({ fontStyle: isItalic ? 'italic' : 'normal' }) }, [isItalic]);
  useEffect(() => { 
    if (isTextWrapping) {
      applyStyleToSelection({ width: 200, splitByGrapheme: true, ...( { autoSized: false } as any) });
    } else {
      applyStyleToSelection({ width: undefined, splitByGrapheme: false, ...( { autoSized: true } as any) });
    }
  }, [isTextWrapping]);
  
  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  }


  const handleSave = async () => {
    setIsLoading(true);
    try {
      const finalDoc = await pdfDoc.copy();
      const page = finalDoc.getPage(pageIndex);
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const scaleFactorX = pageWidth / canvas.getWidth();
      const scaleFactorY = pageHeight / canvas.getHeight();
      
      const helveticaFont = await finalDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await finalDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaItalicFont = await finalDoc.embedFont(StandardFonts.HelveticaOblique);
      const helveticaBoldItalicFont = await finalDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      const timesRomanFont = await finalDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await finalDoc.embedFont(StandardFonts.TimesRomanBold);
      const timesRomanItalicFont = await finalDoc.embedFont(StandardFonts.TimesRomanItalic);
      const timesRomanBoldItalicFont = await finalDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
      const courierFont = await finalDoc.embedFont(StandardFonts.Courier);
      const courierBoldFont = await finalDoc.embedFont(StandardFonts.CourierBold);
      const courierItalicFont = await finalDoc.embedFont(StandardFonts.CourierOblique);
      const courierBoldItalicFont = await finalDoc.embedFont(StandardFonts.CourierBoldOblique);

      for (const obj of canvas.getObjects()) {
        if (obj.type === 'textbox') {
          const textbox = obj as fabric.Textbox;
          const text = textbox.text || '';
          
          const [r, g, b] = new fabric.Color(textbox.fill as string).getSource();
          
          let font;
          if (textbox.fontFamily?.includes('Times')) {
            if (textbox.fontWeight === 'bold' && textbox.fontStyle === 'italic') font = timesRomanBoldItalicFont;
            else if (textbox.fontWeight === 'bold') font = timesRomanBoldFont;
            else if (textbox.fontStyle === 'italic') font = timesRomanItalicFont;
            else font = timesRomanFont;
          } else if (textbox.fontFamily?.includes('Courier')) {
            if (textbox.fontWeight === 'bold' && textbox.fontStyle === 'italic') font = courierBoldItalicFont;
            else if (textbox.fontWeight === 'bold') font = courierBoldFont;
            else if (textbox.fontStyle === 'italic') font = courierItalicFont;
            else font = courierFont;
          } else { // Default to Helvetica
            if (textbox.fontWeight === 'bold' && textbox.fontStyle === 'italic') font = helveticaBoldItalicFont;
            else if (textbox.fontWeight === 'bold') font = helveticaBoldFont;
            else if (textbox.fontStyle === 'italic') font = helveticaItalicFont;
            else font = helveticaFont;
          }
          
          page.drawText(text, {
            x: (textbox.left || 0) * scaleFactorX,
            y: pageHeight - ((textbox.top || 0) + (textbox.height || 0)) * scaleFactorY,
            font: font,
            size: (textbox.fontSize || 16) * scaleFactorY,
            color: rgb(r / 255, g / 255, b / 255),
            lineHeight: (textbox.lineHeight || 1.16) * (textbox.fontSize || 16) * scaleFactorY,
            wordBreaks: text.split(' '),
          });
        }
      }
      onSave(finalDoc);
    } catch(e) {
      console.error("Failed to save annotations", e);
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
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
            isBold={isBold}
            setIsBold={setIsBold}
            isItalic={isItalic}
            setIsItalic={setIsItalic}
            strokeColor={strokeColor}
            setStrokeColor={setStrokeColor}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
            isTextWrapping={isTextWrapping}
            setIsTextWrapping={setIsTextWrapping}
            zoom={zoom}
            setZoom={setZoom}
            onDelete={deleteSelected}
          />
          <div className="flex-grow relative overflow-auto border rounded-md bg-muted/20 flex items-center justify-center">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex h-full items-center justify-center bg-background/50">
                <Loader className="h-8 w-8 animate-spin" />
              </div>
            )}
            <div
              className="relative"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              <canvas ref={canvasRef} />
            </div>
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
