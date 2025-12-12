
"use client";

import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Trash2 } from "lucide-react";
import type { TextAnnotation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface DraggableAnnotationProps {
    annotation: TextAnnotation;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onTextChange: (newText: string) => void;
}

export function DraggableAnnotation({ annotation, isSelected, onSelect, onDelete, onTextChange }: DraggableAnnotationProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: annotation.id,
    });
    
    const [isPlaceholder, setIsPlaceholder] = useState(annotation.text === "Type here...");

    const style = {
        position: 'absolute' as const,
        left: annotation.x,
        top: annotation.y,
        transform: CSS.Translate.toString(transform),
        color: annotation.fontColor,
        fontSize: `${annotation.fontSize}px`,
        width: annotation.width,
        height: annotation.height,
        padding: '2px',
    };
    
    const stopPropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
    }

    const handleFocus = () => {
        onSelect();
        if (isPlaceholder) {
            onTextChange('');
            setIsPlaceholder(false);
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isPlaceholder) {
            setIsPlaceholder(false);
        }
        onTextChange(e.target.value);
    };

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
            className={cn("group cursor-move border border-dashed", isSelected ? "border-primary z-10" : "border-transparent hover:border-primary/50")}
        >
             <input
                type="text"
                value={annotation.text}
                onChange={handleChange}
                onFocus={handleFocus}
                style={{ all: 'unset', width: '100%', height: '100%', cursor: 'text' }}
                className="bg-transparent"
            />
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
