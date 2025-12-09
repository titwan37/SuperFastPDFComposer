
"use client";

import { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

interface SignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureImage: string) => void;
}

export function SignatureDialog({ isOpen, onClose, onSave }: SignatureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  useEffect(() => {
    const context = getCanvasContext();
    if (context) {
      context.lineCap = 'round';
      context.strokeStyle = 'black';
      context.lineWidth = 2;
    }
  }, [isOpen]);

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const context = getCanvasContext();
    if (!context) return;
    const { offsetX, offsetY } = getCoordinates(event);
    context.beginPath();
    context.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    setHasDrawing(true);
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const context = getCanvasContext();
    if (!context) return;
    const { offsetX, offsetY } = getCoordinates(event);
    context.lineTo(offsetX, offsetY);
    context.stroke();
  };

  const stopDrawing = () => {
    const context = getCanvasContext();
    if (context) {
      context.closePath();
    }
    setIsDrawing(false);
  };
  
  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in event.nativeEvent) {
      return {
        offsetX: event.nativeEvent.touches[0].clientX - rect.left,
        offsetY: event.nativeEvent.touches[0].clientY - rect.top,
      };
    }
    return {
      offsetX: event.nativeEvent.offsetX,
      offsetY: event.nativeEvent.offsetY
    };
  }

  const clearCanvas = () => {
    const context = getCanvasContext();
    if (context && canvasRef.current) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasDrawing(false);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Create a new canvas to trim whitespace
      const context = canvas.getContext('2d');
      if (!context) return;

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 0) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (maxX === 0) { // Empty canvas
          onClose();
          return;
      }
      
      const padding = 10;
      const trimmedWidth = maxX - minX + 1 + padding * 2;
      const trimmedHeight = maxY - minY + 1 + padding * 2;

      const trimmedCanvas = document.createElement('canvas');
      trimmedCanvas.width = trimmedWidth;
      trimmedCanvas.height = trimmedHeight;
      const trimmedContext = trimmedCanvas.getContext('2d');
      if(!trimmedContext) return;

      trimmedContext.drawImage(canvas, minX - padding, minY - padding, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);

      onSave(trimmedCanvas.toDataURL('image/png'));
      clearCanvas();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Draw your signature</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width="400"
              height="200"
              className="cursor-crosshair rounded-md border border-input bg-background"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={clearCanvas} disabled={!hasDrawing}>
            <Eraser className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!hasDrawing}>Save Signature</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    