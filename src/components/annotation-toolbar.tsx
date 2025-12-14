
"use client";

import { MousePointer2, Type, Pen, ZoomIn, ZoomOut, Check, X, Trash2, Bold, Italic, WrapText } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Toggle } from './ui/toggle';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface AnnotationToolbarProps {
    activeTool: 'select' | 'text' | 'pen' | 'check' | 'cross';
    setActiveTool: (tool: 'select' | 'text' | 'pen' | 'check' | 'cross') => void;
    
    // Text props
    textColor: string;
    setTextColor: (color: string) => void;
    fontSize: number;
    setFontSize: (size: number) => void;
    fontFamily: string;
    setFontFamily: (font: string) => void;
    isBold: boolean;
    setIsBold: (bold: boolean) => void;
    isItalic: boolean;
    setIsItalic: (italic: boolean) => void;
    isTextWrapping: boolean;
    setIsTextWrapping: (wrapping: boolean) => void;

    // Stroke props
    strokeColor: string;
    setStrokeColor: (color: string) => void;
    strokeWidth: number;
    setStrokeWidth: (width: number) => void;

    // General props
    zoom: number;
    setZoom: (zoom: number | ((prevZoom: number) => number)) => void;
    onDelete: () => void;
}

export function AnnotationToolbar({
    activeTool,
    setActiveTool,
    textColor,
    setTextColor,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    isBold,
    setIsBold,
    isItalic,
    setIsItalic,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    isTextWrapping,
    setIsTextWrapping,
    zoom,
    setZoom,
    onDelete,
}: AnnotationToolbarProps) {

  const isTextToolActive = activeTool === 'text';
  const isPenToolActive = activeTool === 'pen';
  const isIconToolActive = activeTool === 'check' || activeTool === 'cross';
  const isSelectToolActive = activeTool === 'select';

  return (
    <TooltipProvider>
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2 shadow-sm">
      {/* Tool Selection */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activeTool === 'select' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setActiveTool('select')}
            aria-label="Select Tool"
          >
            <MousePointer2 className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Select Tool (V)</p></TooltipContent>
      </Tooltip>
       <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activeTool === 'text' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setActiveTool('text')}
            aria-label="Text Tool"
          >
            <Type className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Text Tool (T)</p></TooltipContent>
      </Tooltip>
       <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activeTool === 'pen' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setActiveTool('pen')}
            aria-label="Pen Tool"
            disabled
          >
            <Pen className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Pen Tool (P)</p></TooltipContent>
      </Tooltip>
       <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activeTool === 'check' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setActiveTool('check')}
            aria-label="Checkmark Tool"
          >
            <Check className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Checkmark Tool</p></TooltipContent>
      </Tooltip>
       <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activeTool === 'cross' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setActiveTool('cross')}
            aria-label="Cross Tool"
          >
            <X className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p>Cross Tool</p></TooltipContent>
      </Tooltip>
      
       <Tooltip>
        <TooltipTrigger asChild>
            <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                aria-label="Delete Selection"
                disabled={!isSelectToolActive}
            >
                <Trash2 className="h-5 w-5" />
            </Button>
        </TooltipTrigger>
        <TooltipContent><p>Delete Selection (Backspace)</p></TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-8" />
      
      {/* Text Tool Options */}
      <div className={cn("flex items-center gap-2", !isTextToolActive && !isSelectToolActive && "opacity-50 pointer-events-none")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Input
              id="font-color"
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-8 w-10 p-1"
              disabled={!isTextToolActive && !isSelectToolActive}
              aria-label="Text color"
            />
          </TooltipTrigger>
          <TooltipContent><p>Text Color</p></TooltipContent>
        </Tooltip>
        
        <Select
          value={fontSize.toString()}
          onValueChange={(val) => setFontSize(Number(val))}
          disabled={!isTextToolActive && !isSelectToolActive}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent><p>Font Size</p></TooltipContent>
          </Tooltip>
          <SelectContent>
            {[8, 12, 16, 20, 24, 32, 48].map(size => (
              <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
            ))}
          </SelectContent>
        </Select>

         <Select
          value={fontFamily}
          onValueChange={setFontFamily}
          disabled={!isTextToolActive && !isSelectToolActive}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent><p>Font Family</p></TooltipContent>
          </Tooltip>
          <SelectContent>
            {['Arial', 'Helvetica', 'Times New Roman', 'Courier New'].map(font => (
              <SelectItem key={font} value={font} style={{fontFamily: font}}>{font}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tooltip>
            <TooltipTrigger asChild>
                <Toggle pressed={isBold} onPressedChange={setIsBold} size="sm" disabled={!isTextToolActive && !isSelectToolActive} aria-label="Bold">
                    <Bold className="h-4 w-4" />
                </Toggle>
            </TooltipTrigger>
            <TooltipContent><p>Bold (Ctrl+B)</p></TooltipContent>
        </Tooltip>
        <Tooltip>
            <TooltipTrigger asChild>
                <Toggle pressed={isItalic} onPressedChange={setIsItalic} size="sm" disabled={!isTextToolActive && !isSelectToolActive} aria-label="Italic">
                    <Italic className="h-4 w-4" />
                </Toggle>
            </TooltipTrigger>
            <TooltipContent><p>Italic (Ctrl+I)</p></TooltipContent>
        </Tooltip>
        <Tooltip>
            <TooltipTrigger asChild>
                <Toggle pressed={isTextWrapping} onPressedChange={setIsTextWrapping} size="sm" disabled={!isTextToolActive && !isSelectToolActive} aria-label="Text wrap">
                    <WrapText className="h-4 w-4" />
                </Toggle>
            </TooltipTrigger>
            <TooltipContent><p>Toggle Text Wrapping</p></TooltipContent>
        </Tooltip>

      </div>

      <Separator orientation="vertical" className="h-8" />
      
      {/* Pen & Icon Tool Options */}
      <div className={cn("flex items-center gap-2", !isPenToolActive && !isIconToolActive && "opacity-50 pointer-events-none")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Input
              id="stroke-color"
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="h-8 w-10 p-1"
              disabled={!isPenToolActive && !isIconToolActive}
              aria-label="Stroke color"
            />
          </TooltipTrigger>
          <TooltipContent><p>Stroke Color</p></TooltipContent>
        </Tooltip>
        <Select
          value={strokeWidth.toString()}
          onValueChange={(val) => setStrokeWidth(Number(val))}
          disabled={!isPenToolActive && !isIconToolActive}
        >
           <Tooltip>
            <TooltipTrigger asChild>
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
            </TooltipTrigger>
            <TooltipContent><p>Stroke Width</p></TooltipContent>
          </Tooltip>
          <SelectContent>
            {[1, 2, 3, 5, 8, 10, 15].map(width => (
              <SelectItem key={width} value={width.toString()}>{width}px</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-grow" />
      
      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} disabled={zoom <= 0.25}>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Zoom Out (Ctrl+-)</p></TooltipContent>
            </Tooltip>
            <span className="w-16 text-center text-sm font-medium tabular-nums">{Math.round(zoom * 100)}%</span>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(2, z + 0.25))} disabled={zoom >= 2}>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Zoom In (Ctrl+=)</p></TooltipContent>
            </Tooltip>
        </div>
    </div>
    </TooltipProvider>
  );
}
