
"use client";

import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Trash2 } from "lucide-react";
import { ResizableBox } from "react-resizable";
import type { TextAnnotation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import "react-resizable/css/styles.css";


interface DraggableAnnotationProps {
    annotation: TextAnnotation;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onTextChange: (newText: string) => void;
    onResizeStop: (size: { width: number; height: number; }) => void;
}

export function DraggableAnnotation({ annotation, isSelected, onSelect, onDelete, onTextChange, onResizeStop }: DraggableAnnotationProps) {
    const [isEditing, setIsEditing] = useState(annotation.isEditing || false);
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: annotation.id,
        disabled: isEditing,
    });
    
    const [isPlaceholder, setIsPlaceholder] = useState(annotation.text === "Type here...");

    const style = {
        position: 'absolute' as const,
        left: annotation.x,
        top: annotation.y,
        transform: CSS.Translate.toString(transform),
        color: annotation.fontColor,
        fontSize: `${annotation.fontSize}px`,
        // width and height are now controlled by the ResizableBox
    };
    
    const stopPropagation = (e: React.MouseEvent | React.FocusEvent | React.ChangeEvent) => {
        e.stopPropagation();
    }

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        stopPropagation(e);
        onSelect();
        setIsEditing(true);
        if (isPlaceholder) {
            onTextChange('');
            setIsPlaceholder(false);
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        stopPropagation(e);
        if (isPlaceholder) {
            setIsPlaceholder(false);
        }
        onTextChange(e.target.value);
    };

    const handleBlur = () => {
        setIsEditing(false);
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            // We only apply drag listeners when not selected, to allow text selection
            {...(isSelected ? {} : listeners)}
            onClick={(e) => {
                stopPropagation(e);
                onSelect();
            }}
            onDoubleClick={(e) => {
                 stopPropagation(e);
                 setIsEditing(true);
            }}
            className={cn(
                "group z-10", 
                isSelected ? "border-primary" : "border-transparent",
                !isEditing && "cursor-move" // Only show move cursor when not editing
            )}
        >
             <ResizableBox
                width={annotation.width}
                height={annotation.height}
                onResizeStop={(e, data) => {
                    stopPropagation(e);
                    onResizeStop({ width: data.size.width, height: data.size.height });
                }}
                className={cn("box-border p-1", isSelected ? "border border-dashed border-primary" : "border border-transparent hover:border-primary/50")}
                handle={
                    isSelected ? 
                    <span className="react-resizable-handle absolute bottom-0 right-0 h-4 w-4 cursor-se-resize bg-primary rounded-full border-2 border-background" />
                    : <></>
                }
             >
                <textarea
                    value={annotation.text}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{ all: 'unset', width: '100%', height: '100%', cursor: isEditing ? 'text' : 'move' }}
                    className="bg-transparent"
                    autoFocus={isEditing}
                    // Apply drag listeners to the textarea only when not editing
                    {...(!isEditing ? listeners : {})}
                />
            </ResizableBox>
            {isSelected && !isEditing && (
                 <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-3 -right-3 h-6 w-6 cursor-pointer rounded-full opacity-100"
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
