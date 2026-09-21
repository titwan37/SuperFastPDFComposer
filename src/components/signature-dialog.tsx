"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eraser, Trash2, FileSignature, Upload, PenTool, Type, Sparkles, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import type { SignaturePosition } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface SignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureImage: string, position?: SignaturePosition, xOffset?: number, yOffset?: number) => void;
  defaultPosition?: SignaturePosition;
}

const SIGNATURE_STORAGE_KEY = 'pdf-composer-signature';

const INK_COLORS = [
  { name: 'Navy Blue', value: '#1e3a8a' },
  { name: 'Classic Black', value: '#0f172a' },
  { name: 'Royal Blue', value: '#2563eb' },
];

const SCRIPT_FONTS = [
  { id: 'font-1', name: 'Elegant Cursive', font: 'italic 38px "Brush Script MT", "Segoe Script", "Dancing Script", cursive' },
  { id: 'font-2', name: 'Executive Script', font: 'italic 34px "Segoe Script", "Caveat", cursive' },
  { id: 'font-3', name: 'Modern Hand', font: 'italic 32px "Lucida Handwriting", cursive, sans-serif' },
];

export function SignatureDialog({ isOpen, onClose, onSave, defaultPosition = 'right' }: SignatureDialogProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [inkColor, setInkColor] = useState<string>(INK_COLORS[0].value);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  // Type signature state
  const [typedName, setTypedName] = useState('');
  const [selectedFontIndex, setSelectedFontIndex] = useState(0);

  // Uploaded signature state
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);

  // Stored signature in localStorage
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [useSavedMode, setUseSavedMode] = useState(false);

  // Placement
  const [position, setPosition] = useState<SignaturePosition>(defaultPosition);
  const [saveToStorage, setSaveToStorage] = useState(true);

  // Setup HiDPI Canvas
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = 440;
    const height = 180;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.5;
  }, [inkColor]);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem(SIGNATURE_STORAGE_KEY);
        if (stored) {
          setSavedSignature(stored);
          setUseSavedMode(true);
        } else {
          setUseSavedMode(false);
        }
      } catch (err) {
        console.error('Local storage access failed:', err);
      }

      setPosition(defaultPosition);
      setHasDrawing(false);
      setUploadedSignature(null);

      setTimeout(() => {
        setupCanvas();
      }, 50);
    }
  }, [isOpen, defaultPosition, setupCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = inkColor;
    }
  }, [inkColor]);

  const getCanvasPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setUseSavedMode(false);
    setIsDrawing(true);
    setHasDrawing(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasPos(clientX, clientY);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasPos(clientX, clientY);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasDrawing(false);
  };

  const trimAndExportCanvas = (sourceCanvas: HTMLCanvasElement): string | null => {
    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) return null;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 10) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX <= minX || maxY <= minY) {
      return null;
    }

    const padding = 12;
    const sx = Math.max(0, minX - padding);
    const sy = Math.max(0, minY - padding);
    const sWidth = Math.min(width - sx, maxX - sx + 1 + padding);
    const sHeight = Math.min(height - sy, maxY - sy + 1 + padding);

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = sWidth;
    trimmedCanvas.height = sHeight;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (!trimmedCtx) return null;

    trimmedCtx.drawImage(sourceCanvas, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
    return trimmedCanvas.toDataURL('image/png');
  };

  const generateTypedSignature = (): string | null => {
    if (!typedName.trim()) return null;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 600;
    tempCanvas.height = 200;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;

    const selectedFont = SCRIPT_FONTS[selectedFontIndex].font;
    ctx.font = selectedFont;
    ctx.fillStyle = inkColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    ctx.fillText(typedName.trim(), tempCanvas.width / 2, tempCanvas.height / 2);

    return trimAndExportCanvas(tempCanvas);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please upload a valid PNG or JPG signature image.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imgData.data;

        // Smooth transparency extraction
        const hex = inkColor.replace('#', '');
        const targetR = parseInt(hex.substring(0, 2), 16) || 30;
        const targetG = parseInt(hex.substring(2, 4), 16) || 58;
        const targetB = parseInt(hex.substring(4, 6), 16) || 138;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const originalAlpha = data[i + 3];

          // Calculate darkness (0 = white/light, 255 = black)
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          const darkness = 255 - luminance;

          // Smooth alpha transition avoiding binary jagged edges
          if (darkness > 40 && originalAlpha > 20) {
            const alphaFactor = Math.min(1, (darkness - 30) / 180);
            data[i] = targetR;
            data[i + 1] = targetG;
            data[i + 2] = targetB;
            data[i + 3] = Math.round(alphaFactor * 255);
          } else {
            data[i + 3] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const trimmed = trimAndExportCanvas(tempCanvas) || tempCanvas.toDataURL('image/png');
        setUploadedSignature(trimmed);
        setUseSavedMode(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (event.target) event.target.value = '';
  };

  const handleSaveSignature = () => {
    let finalDataUrl: string | null = null;

    if (useSavedMode && savedSignature) {
      finalDataUrl = savedSignature;
    } else if (activeTab === 'draw' && canvasRef.current && hasDrawing) {
      finalDataUrl = trimAndExportCanvas(canvasRef.current);
    } else if (activeTab === 'type') {
      finalDataUrl = generateTypedSignature();
    } else if (activeTab === 'upload' && uploadedSignature) {
      finalDataUrl = uploadedSignature;
    }

    if (!finalDataUrl) {
      toast({
        variant: 'destructive',
        title: 'Empty Signature',
        description: 'Please draw, type, or upload a signature before saving.',
      });
      return;
    }

    if (saveToStorage) {
      try {
        localStorage.setItem(SIGNATURE_STORAGE_KEY, finalDataUrl);
        setSavedSignature(finalDataUrl);
      } catch (err) {
        console.error('Failed to store signature:', err);
      }
    }

    onSave(finalDataUrl, position);
    onClose();
  };

  const handleDeleteSaved = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem(SIGNATURE_STORAGE_KEY);
      setSavedSignature(null);
      setUseSavedMode(false);
      toast({
        title: 'Signature Removed',
        description: 'Previously saved signature has been deleted from this browser.',
      });
    } catch (err) {
      console.error('Failed to delete stored signature:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-background/95 backdrop-blur-md shadow-2xl border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-headline font-bold">
            <FileSignature className="h-5 w-5 text-primary" />
            Add Signature
          </DialogTitle>
        </DialogHeader>

        {/* Previously Saved Signature Card */}
        {savedSignature && (
          <div
            onClick={() => setUseSavedMode(!useSavedMode)}
            className={cn(
              "relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
              useSavedMode
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border/60 hover:border-primary/40 bg-muted/20"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center border",
                useSavedMode ? "bg-primary border-primary text-white" : "border-muted-foreground/40"
              )}>
                {useSavedMode && <Check className="h-3 w-3 stroke-[3]" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Use Saved Signature</p>
                <p className="text-[11px] text-muted-foreground">Click to reuse your stored signature</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-28 bg-white dark:bg-slate-900 border rounded-lg p-1 flex items-center justify-center shadow-inner">
                <Image
                  src={savedSignature}
                  alt="Saved Signature"
                  width={100}
                  height={36}
                  className="max-h-full w-auto object-contain"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={handleDeleteSaved}
                title="Delete saved signature"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Signature Input Methods Tabs */}
        <div className={cn("transition-opacity", useSavedMode && "opacity-50 pointer-events-none")}>
          <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val as any); setUseSavedMode(false); }}>
            <TabsList className="grid w-full grid-cols-3 mb-3">
              <TabsTrigger value="draw" className="flex items-center gap-1.5 text-xs font-medium">
                <PenTool className="h-3.5 w-3.5" /> Draw
              </TabsTrigger>
              <TabsTrigger value="type" className="flex items-center gap-1.5 text-xs font-medium">
                <Type className="h-3.5 w-3.5" /> Type
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-1.5 text-xs font-medium">
                <Upload className="h-3.5 w-3.5" /> Upload
              </TabsTrigger>
            </TabsList>

            {/* DRAW TAB */}
            <TabsContent value="draw" className="space-y-3">
              <div className="relative rounded-2xl border bg-white dark:bg-slate-950 p-2 shadow-inner flex flex-col items-center">
                <canvas
                  ref={canvasRef}
                  className="cursor-crosshair rounded-xl touch-none bg-transparent"
                  style={{ width: '440px', height: '180px', touchAction: 'none' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasDrawing && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-muted-foreground/50">
                    <PenTool className="h-6 w-6 mb-1 opacity-60 animate-pulse" />
                    <span className="text-xs font-medium">Draw your signature with mouse, stylus, or touch</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">Ink:</span>
                  {INK_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setInkColor(c.value)}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                        inkColor === c.value ? "ring-2 ring-primary ring-offset-1 scale-110 border-white" : "border-transparent"
                      )}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCanvas}
                  disabled={!hasDrawing}
                  className="h-8 text-xs"
                >
                  <Eraser className="mr-1.5 h-3.5 w-3.5" /> Clear
                </Button>
              </div>
            </TabsContent>

            {/* TYPE TAB */}
            <TabsContent value="type" className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="type-name" className="text-xs font-medium">Your Name</Label>
                <Input
                  id="type-name"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="h-10 text-base"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Select Handwriting Style</Label>
                <div className="grid grid-cols-1 gap-2">
                  {SCRIPT_FONTS.map((fontOption, idx) => (
                    <div
                      key={fontOption.id}
                      onClick={() => setSelectedFontIndex(idx)}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                        selectedFontIndex === idx
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/40 bg-card"
                      )}
                    >
                      <span className="text-xs text-muted-foreground">{fontOption.name}</span>
                      <span
                        className="text-xl font-normal px-2"
                        style={{
                          fontFamily: fontOption.font.includes('Brush Script') ? '"Brush Script MT", cursive' : '"Segoe Script", cursive',
                          color: inkColor,
                        }}
                      >
                        {typedName.trim() || 'Signature Preview'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* UPLOAD TAB */}
            <TabsContent value="upload" className="space-y-3">
              <input
                type="file"
                ref={imageUploadRef}
                className="hidden"
                accept="image/png, image/jpeg"
                onChange={handleImageUpload}
              />
              <div
                onClick={() => imageUploadRef.current?.click()}
                className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-center"
              >
                {uploadedSignature ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <div className="h-20 w-48 bg-white dark:bg-slate-900 border rounded-xl p-2 flex items-center justify-center shadow-inner">
                      <Image
                        src={uploadedSignature}
                        alt="Uploaded Signature"
                        width={180}
                        height={60}
                        className="max-h-full w-auto object-contain"
                      />
                    </div>
                    <p className="text-xs text-primary font-medium">Click to upload a different image</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs font-semibold text-foreground">Click to upload signature</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Supports PNG or JPG (background is automatically cleaned)</p>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Position Preference & Options */}
        <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Label className="text-xs text-muted-foreground">Placement:</Label>
            <RadioGroup
              defaultValue={position}
              value={position}
              className="flex gap-3"
              onValueChange={(val: SignaturePosition) => setPosition(val)}
            >
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="left" id="r-left" className="h-3.5 w-3.5" />
                <Label htmlFor="r-left" className="text-xs cursor-pointer">Left</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="center" id="r-center" className="h-3.5 w-3.5" />
                <Label htmlFor="r-center" className="text-xs cursor-pointer">Center</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="right" id="r-right" className="h-3.5 w-3.5" />
                <Label htmlFor="r-right" className="text-xs cursor-pointer">Right</Label>
              </div>
            </RadioGroup>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={saveToStorage}
              onChange={(e) => setSaveToStorage(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
            />
            Remember signature
          </label>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSaveSignature}
            disabled={
              !useSavedMode &&
              ((activeTab === 'draw' && !hasDrawing) ||
                (activeTab === 'type' && !typedName.trim()) ||
                (activeTab === 'upload' && !uploadedSignature))
            }
          >
            <FileSignature className="mr-2 h-4 w-4" /> Place Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
