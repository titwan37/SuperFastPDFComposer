"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Trash2 } from "lucide-react";
import { ResizableBox } from "react-resizable";
import type { RedactionMaskAnnotation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import "react-resizable/css/styles.css";

interface DraggableMaskAnnotationProps {
  annotation: RedactionMaskAnnotation;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onResizeStop: (size: { width: number; height: number }) => void;
}

export function DraggableMaskAnnotation({
  annotation,
  isSelected,
  onSelect,
  onDelete,
  onResizeStop,
}: DraggableMaskAnnotationProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: annotation.id,
  });

  const style = {
    position: "absolute" as const,
    left: annotation.x,
    top: annotation.y,
    transform: CSS.Translate.toString(transform),
  };

  const stopPropagation = (e: React.SyntheticEvent | Event) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        stopPropagation(e);
        onSelect();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        stopPropagation(e);
        onDelete();
      }}
      title="White Redaction Mask • Drag to move • Drag handle to resize"
      className="group z-30 cursor-move"
    >
      <ResizableBox
        width={annotation.width}
        height={annotation.height}
        minConstraints={[20, 10]}
        onResizeStop={(e, data) => {
          stopPropagation(e);
          onResizeStop({ width: data.size.width, height: data.size.height });
        }}
        className={cn(
          "box-border bg-white shadow-sm transition-shadow",
          isSelected
            ? "ring-2 ring-primary ring-offset-1 border border-primary/40"
            : "border border-gray-200 hover:ring-1 hover:ring-primary/40"
        )}
        handle={(resizeHandleAxis, ref) =>
          isSelected ? (
            <span
              ref={ref}
              className="react-resizable-handle absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-se-resize bg-primary rounded-full border-2 border-background shadow-md hover:scale-125 transition-transform z-40"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={stopPropagation}
            />
          ) : (
            <></>
          )
        }
      >
        <div className="w-full h-full bg-white select-none pointer-events-none flex items-center justify-center">
          {isSelected && (
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono select-none">
              Mask
            </span>
          )}
        </div>
      </ResizableBox>

      <Button
        variant="destructive"
        size="icon"
        className={cn(
          "absolute -top-3 -right-3 h-6 w-6 cursor-pointer rounded-full shadow-md z-40 transition-all hover:scale-110",
          isSelected
            ? "opacity-100 scale-100"
            : "opacity-0 group-hover:opacity-100 group-hover:scale-100"
        )}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => {
          stopPropagation(e);
          onDelete();
        }}
        aria-label="Delete redaction mask"
        title="Delete mask"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
