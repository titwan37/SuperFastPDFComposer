
"use client";

import { MousePointer2, Type, Pen } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';

interface AnnotationToolbarProps {
    activeTool: 'select' | 'text' | 'pen';
    setActiveTool: (tool: 'select' | 'text' | 'pen') => void;
    textColor: string;
    setTextColor: (color: string) => void;
    fontSize: number;
    setFontSize: (size: number) => void;
    strokeColor: string;
    setStrokeColor: (color: string) => void;
    strokeWidth: number;
    setStrokeWidth: (width: number) => void;
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
}: AnnotationToolbarProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card p-2 shadow-sm">
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
      <Separator orientation="vertical" className="h-8" />
      
      {/* Text Tool Options */}
      <div className={cn("flex items-center gap-2", activeTool !== 'text' && "opacity-50 pointer-events-none")}>
        <Label htmlFor="font-color">Color</Label>
        <Input
          id="font-color"
          type="color"
          value={textColor}
          onChange={(e) => setTextColor(e.target.value)}
          className="h-8 w-10 p-1"
          disabled={activeTool !== 'text'}
        />
        <Label htmlFor="font-size">Size</Label>
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
      
      {/* Pen Tool Options */}
      <div className={cn("flex items-center gap-2", activeTool !== 'pen' && "opacity-50 pointer-events-none")}>
        <Label htmlFor="stroke-color">Color</Label>
        <Input
          id="stroke-color"
          type="color"
          value={strokeColor}
          onChange={(e) => setStrokeColor(e.target.value)}
          className="h-8 w-10 p-1"
          disabled={activeTool !== 'pen'}
        />
        <Label htmlFor="stroke-width">Width</Label>
         <Select
          value={strokeWidth.toString()}
          onValueChange={(val) => setStrokeWidth(Number(val))}
          disabled={activeTool !== 'pen'}
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
    </div>
  );
}
