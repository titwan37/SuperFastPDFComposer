
"use client";

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eraser, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import type { SignaturePosition } from '@/lib/types';

interface SignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureImage: string, position: SignaturePosition, offset: number) => void;
}

const SIGNATURE_STORAGE_KEY = 'pdf-composer-signature';

export function SignatureDialog({ isOpen, onClose, onSave }: SignatureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [position, setPosition] = useState<SignaturePosition>('right');
  const [xOffset, setXOffset] = useState(0);


  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  useEffect(() => {
    if (isOpen) {
        try {
            const storedSignature = localStorage.getItem(SIGNATURE_STORAGE_KEY);
            setSavedSignature(storedSignature);
        } catch (error) {
            console.error("Could not access local storage:", error);
            setSavedSignature(null);
        }

        const context = getCanvasContext();
        if (context) {
            context.lineCap = 'round';
            context.strokeStyle = document.documentElement.classList.contains('dark') ? 'white' : 'black';
            context.lineWidth = 2;
        }
        clearCanvas(false); // Clear without resetting hasDrawing state
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
    // If user starts drawing, hide the saved signature preview for this session
    if (savedSignature) {
        setSavedSignature(null);
    }
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

  const clearCanvas = (resetDrawingState = true) => {
    const context = getCanvasContext();
    if (context && canvasRef.current) {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (resetDrawingState) {
          setHasDrawing(false);
      }
    }
  };

  const handleSaveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
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

      if (maxX === 0) {
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
      
      const signatureDataUrl = trimmedCanvas.toDataURL('image/png');
      try {
        localStorage.setItem(SIGNATURE_STORAGE_KEY, signatureDataUrl);
      } catch (error) {
        console.error("Could not save signature to local storage:", error);
      }
      onSave(signatureDataUrl, position, xOffset);
    }
  };

  const handleUseSavedSignature = () => {
      if (savedSignature) {
          onSave(savedSignature, position, xOffset);
      }
  };

  const handleDeleteSavedSignature = () => {
    try {
        localStorage.removeItem(SIGNATURE_STORAGE_KEY);
        setSavedSignature(null);
    } catch (error) {
        console.error("Could not delete signature from local storage:", error);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Your Signature</DialogTitle>
        </DialogHeader>
        <div className="relative flex justify-center">
            {savedSignature && !hasDrawing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-md border border-dashed bg-background/80 backdrop-blur-sm">
                    <p className="text-sm font-medium text-muted-foreground">Previously saved signature:</p>
                    <Image src={savedSignature} alt="Saved Signature" width={200} height={100} className="rounded-md bg-white p-2 shadow-inner" />
                    <div className="flex gap-2">
                        <Button onClick={handleUseSavedSignature}>Use Saved Signature</Button>
                        <Button variant="ghost" size="icon" onClick={handleDeleteSavedSignature} aria-label="Delete saved signature">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Or, start drawing below to create a new one.</p>
                </div>
            )}
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
        <div className="grid gap-4 pt-4">
            <div className="space-y-2">
                <Label>Position</Label>
                 <RadioGroup defaultValue="right" className="flex gap-4" onValueChange={(value: SignaturePosition) => setPosition(value)}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="left" id="pos-left" />
                        <Label htmlFor="pos-left">Left</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="center" id="pos-center" />
                        <Label htmlFor="pos-center">Center</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="right" id="pos-right" />
                        <Label htmlFor="pos-right">Right</Label>
                    </div>
                </RadioGroup>
            </div>
            <div className="space-y-2">
                <Label htmlFor="offset-x">Horizontal Offset (in pixels)</Label>
                <Input
                    id="offset-x"
                    type="number"
                    value={xOffset}
                    onChange={(e) => setXOffset(parseInt(e.target.value, 10) || 0)}
                    placeholder="e.g., -20 or 20"
                />
                <p className="text-xs text-muted-foreground">
                   Adjusts the signature's horizontal position. Use negative for left, positive for right.
                </p>
            </div>
        </div>
        <DialogFooter className="sm:justify-between pt-4">
          <Button variant="outline" onClick={() => clearCanvas(true)} disabled={!hasDrawing}>
            <Eraser className="mr-2 h-4 w-4" />
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSaveDrawnSignature} disabled={!hasDrawing && !savedSignature}>Save Signature</Button>

          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
