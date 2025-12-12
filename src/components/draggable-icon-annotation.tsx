
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
    
    const stopPropagation = (e: React.MouseEvent) => {
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
            className={cn("group cursor-move border border-dashed flex items-center justify-center", isSelected ? "border-primary z-10" : "border-transparent hover:border-primary/50")}
        >
             <IconComponent className="w-full h-full" strokeWidth={annotation.strokeWidth} />
            {isSelected && (
                 <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-3 -right-3 h-6 w-6 cursor-pointer rounded-full opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                        stopPropagation(e);
                        onDelete();
                    }}
                    aria-label="Delete annotation"
                 >
                    <Trash2 className="h-4 w-4" />
                 </Button>
            )}
        </div>
    );
}
