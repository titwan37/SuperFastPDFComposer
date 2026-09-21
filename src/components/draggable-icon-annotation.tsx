
"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, Check, X } from "lucide-react";
import type { IconAnnotation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface DraggableIconAnnotationProps {
    annotation: IconAnnotation;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
}

export function DraggableIconAnnotation({ annotation, isSelected, onSelect, onDelete }: DraggableIconAnnotationProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: annotation.id,
    });
    
    const style = {
        position: 'absolute' as const,
        left: annotation.x,
        top: annotation.y,
        width: annotation.size,
        height: annotation.size,
        transform: CSS.Translate.toString(transform),
        color: annotation.strokeColor,
    };
    
    const stopPropagation = (e: React.SyntheticEvent | Event) => {
        e.stopPropagation();
    }

    const IconComponent = annotation.iconType === 'check' ? Check : X;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={(e) => {
                stopPropagation(e);
                onSelect();
            }}
            onDoubleClick={stopPropagation}
            onContextMenu={(e) => {
                e.preventDefault();
                stopPropagation(e);
                onDelete();
            }}
            title="Drag to move • Right-click to delete"
            className={cn("group cursor-move border border-dashed flex items-center justify-center rounded-md transition-colors", isSelected ? "border-primary z-10 bg-primary/5" : "border-transparent hover:border-primary/50")}
        >
             <IconComponent className="w-full h-full" strokeWidth={annotation.strokeWidth} />
             <Button
                variant="destructive"
                size="icon"
                className={cn(
                    "absolute -top-3 -right-3 h-6 w-6 cursor-pointer rounded-full shadow-md z-30 transition-all hover:scale-110",
                    isSelected ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 group-hover:scale-100"
                )}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                    stopPropagation(e);
                    onDelete();
                }}
                aria-label="Delete annotation"
                title="Delete icon"
             >
                <Trash2 className="h-3.5 w-3.5" />
             </Button>
        </div>
    );
}

    
