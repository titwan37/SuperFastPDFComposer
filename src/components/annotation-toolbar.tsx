"use client";

import {
  MousePointer2,
  Type,
  Pen,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Trash2,
  FileSignature,
  RotateCcw,
  Highlighter,
  Square,
  Paintbrush,
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import type { HighlighterColor } from '@/lib/types';

export type AnnotationToolType =
  | 'select'
  | 'text'
  | 'pen'
  | 'check'
  | 'cross'
  | 'mask'
  | 'blackout'
  | 'highlighter';

interface AnnotationToolbarProps {
  activeTool: AnnotationToolType;
  setActiveTool: (tool: AnnotationToolType) => void;

  // Text props
  textColor: string;
  setTextColor: (color: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;

  // Stroke props
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;

  // Highlighter props
  highlighterColor: HighlighterColor;
  setHighlighterColor: (color: HighlighterColor) => void;

  // General props
  zoom: number;
  setZoom: (zoom: number | ((prevZoom: number) => number)) => void;
  onDelete: () => void;
  hasSelection?: boolean;
  onClearAll?: () => void;
  onAddSignature?: () => void;
}

const HIGHLIGHTER_PALETTE: { id: HighlighterColor; label: string; bgClass: string; hex: string }[] = [
  { id: 'yellow', label: 'Yellow', bgClass: 'bg-[#facc15]', hex: '#facc15' },
  { id: 'green', label: 'Green', bgClass: 'bg-[#4ade80]', hex: '#4ade80' },
  { id: 'pink', label: 'Pink', bgClass: 'bg-[#f472b6]', hex: '#f472b6' },
  { id: 'blue', label: 'Blue', bgClass: 'bg-[#38bdf8]', hex: '#38bdf8' },
];

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
  highlighterColor,
  setHighlighterColor,
  zoom,
  setZoom,
  onDelete,
  hasSelection = false,
  onClearAll,
  onAddSignature,
}: AnnotationToolbarProps) {
  const isTextToolActive = activeTool === 'text';
  const isPenToolActive = activeTool === 'pen';
  const isHighlighterToolActive = activeTool === 'highlighter';
  const isBlackoutToolActive = activeTool === 'blackout';
  const isMaskToolActive = activeTool === 'mask';
  const isIconToolActive = activeTool === 'check' || activeTool === 'cross';
  const isSelectToolActive = activeTool === 'select';

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2 shadow-sm">
        {/* Basic Selection & Text */}
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
          <TooltipContent><p>Select / Move (V)</p></TooltipContent>
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
            >
              <Pen className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Pen Drawing (P)</p></TooltipContent>
        </Tooltip>

        {/* Highlighter Tool */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'highlighter' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setActiveTool('highlighter')}
              aria-label="Highlighter Tool"
              className={cn(
                activeTool === 'highlighter' && "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300"
              )}
            >
              <Highlighter className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Fluorescent Highlighter (H)</p></TooltipContent>
        </Tooltip>

        {/* Blackout Marker Tool */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'blackout' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setActiveTool('blackout')}
              aria-label="Blackout Marker"
              className={cn(
                activeTool === 'blackout' && "bg-slate-800 text-white dark:bg-slate-200 dark:text-black"
              )}
            >
              <Paintbrush className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Blackout Marker (B) - Solid Black Overwrite</p></TooltipContent>
        </Tooltip>

        {/* White Redaction Mask */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === 'mask' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setActiveTool('mask')}
              aria-label="White Redaction Mask"
              className={cn(
                activeTool === 'mask' && "bg-slate-200 dark:bg-slate-700 text-foreground"
              )}
            >
              <Square className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>White Redaction Mask (M) - Opaque White Block</p></TooltipContent>
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

        {onAddSignature && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddSignature}
                aria-label="Add Signature"
                className="gap-1.5 px-2.5 font-medium text-xs text-primary border-primary/30 hover:bg-primary/10"
              >
                <FileSignature className="h-4 w-4" />
                <span>Signature</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Add Signature to Page (S)</p></TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={hasSelection ? "destructive" : "ghost"}
              size="sm"
              onClick={onDelete}
              aria-label="Delete Selection"
              disabled={!hasSelection}
              className={cn(
                "h-8 gap-1.5 px-2.5 transition-all text-xs font-medium",
                hasSelection && "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
              )}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Delete Selected (Del / Backspace)</p></TooltipContent>
        </Tooltip>

        {onClearAll && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                aria-label="Clear All Annotations"
                className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Clear All Annotations on this Page</p></TooltipContent>
          </Tooltip>
        )}

        <Separator orientation="vertical" className="h-8" />

        {/* Highlighter Fluo Color Picker */}
        <div className={cn("flex items-center gap-1.5", !isHighlighterToolActive && "opacity-40 pointer-events-none")}>
          <span className="text-xs text-muted-foreground font-medium mr-1">Fluo:</span>
          {HIGHLIGHTER_PALETTE.map((pal) => (
            <button
              key={pal.id}
              type="button"
              onClick={() => setHighlighterColor(pal.id)}
              title={`${pal.label} Highlighter`}
              className={cn(
                "h-6 w-6 rounded-full border border-black/10 transition-all",
                pal.bgClass,
                highlighterColor === pal.id ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105 opacity-80"
              )}
            />
          ))}
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Text Tool Options */}
        <div className={cn("flex items-center gap-2", !isTextToolActive && !isSelectToolActive && "opacity-40 pointer-events-none")}>
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
              {[8, 12, 16, 20, 24, 32, 48].map((size) => (
                <SelectItem key={size} value={size.toString()}>{size}px</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Pen & Icon Tool Options */}
        <div className={cn("flex items-center gap-2", !isPenToolActive && !isIconToolActive && "opacity-40 pointer-events-none")}>
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
              {[1, 2, 3, 5, 8, 10, 15].map((width) => (
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
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                disabled={zoom <= 0.25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Zoom Out (Ctrl+-)</p></TooltipContent>
          </Tooltip>
          <span className="w-16 text-center text-sm font-medium tabular-nums">{Math.round(zoom * 100)}%</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
                disabled={zoom >= 2}
              >
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