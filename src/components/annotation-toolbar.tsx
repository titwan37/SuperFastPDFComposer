
"use client";

import { MousePointer2, Type, Pen, ZoomIn, ZoomOut, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';

interface AnnotationToolbarProps {
    activeTool: 'select' | 'text' | 'pen' | 'check' | 'cross';
    setActiveTool: (tool: 'select' | 'text' | 'pen' | 'check' | 'cross') => void;
    textColor: string;
    setTextColor: (color: string) => void;
    fontSize: number;
    setFontSize: (size: number) => void;
    strokeColor: string;
    setStrokeColor: (color: string) => void;
    strokeWidth: number;
    setStrokeWidth: (width: number) => void;
    zoom: number;
    setZoom: (zoom: number | ((prevZoom: number) => number)) => void;
}

export function AnnotationToolbar({
    activeTool,
    setActiveTool,
    textColor,
    setTextColor,
    fontSize,
    setFontSize,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    zoom,
    setZoom,
}: AnnotationToolbarProps) {

  const isIconToolActive = activeTool === 'check' || activeTool === 'cross';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2 shadow-sm">
      {/* Tool Selection */}
      <Button
        variant={activeTool === 'select' ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => setActiveTool('select')}
        aria-label="Select Tool"
      >
        <MousePointer2 className="h-5 w-5" />
      </Button>
      <Button
        variant={activeTool === 'text' ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => setActiveTool('text')}
        aria-label="Text Tool"
      >
        <Type className="h-5 w-5" />
      </Button>
      <Button
        variant={activeTool === 'pen' ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => setActiveTool('pen')}
        aria-label="Pen Tool"
      >
        <Pen className="h-5 w-5" />
      </Button>
       <Button
        variant={activeTool === 'check' ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => setActiveTool('check')}
        aria-label="Checkmark Tool"
      >
        <Check className="h-5 w-5" />
      </Button>
      <Button
        variant={activeTool === 'cross' ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => setActiveTool('cross')}
        aria-label="Cross Tool"
      >
        <X className="h-5 w-5" />
      </Button>
      <Separator orientation="vertical" className="h-8" />
      
      {/* Text Tool Options */}
      <div className={cn("flex items-center gap-2", activeTool !== 'text' && "opacity-50 pointer-events-none")}>
        <Label htmlFor="font-color" className="sr-only">Color</Label>
        <Input
          id="font-color"
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
          className="h-8 w-10 p-1"
          disabled={activeTool !== 'text'}
        />
        <Label htmlFor="font-size" className="sr-only">Size</Label>
        <Select
          value={fontSize.toString()}
          onValueChange={(val) => setFontSize(Number(val))}
          disabled={activeTool !== 'text'}
        >
          <SelectTrigger className="h-8 w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[8, 12, 16, 20, 24, 32, 48].map(size => (
              <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator orientation="vertical" className="h-8" />
      
      {/* Pen & Icon Tool Options */}
      <div className={cn("flex items-center gap-2", activeTool !== 'pen' && !isIconToolActive && "opacity-50 pointer-events-none")}>
        <Label htmlFor="stroke-color" className="sr-only">Color</Label>
        <Input
          id="stroke-color"
          type="color"
          value={strokeColor}
          onChange={(e) => setStrokeColor(e.target.value)}
          className="h-8 w-10 p-1"
          disabled={activeTool !== 'pen' && !isIconToolActive}
        />
        <Label htmlFor="stroke-width" className="sr-only">Width</Label>
         <Select
          value={strokeWidth.toString()}
          onValueChange={(val) => setStrokeWidth(Number(val))}
          disabled={activeTool !== 'pen' && !isIconToolActive}
        >
          <SelectTrigger className="h-8 w-20">
            <SelectValue />
          </SelectTrigger>
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
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} disabled={zoom <= 0.25}>
                <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-16 text-center text-sm font-medium tabular-nums">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(3, z + 0.25))} disabled={zoom >= 3}>
                <ZoomIn className="h-4 w-4" />
            </Button>
        </div>
    </div>
  );
}
