
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
    };
    
    const stopPropagation = (e: React.SyntheticEvent | Event) => {
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
        if (annotation.text.trim() === "") {
            onTextChange("Type here...");
            setIsPlaceholder(true);
        }
    }

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
            onDoubleClick={(e) => {
                stopPropagation(e);
                setIsEditing(true);
            }}
            onContextMenu={(e) => {
                if (!isEditing) {
                    e.preventDefault();
                    stopPropagation(e);
                    onDelete();
                }
            }}
            title={isEditing ? undefined : "Drag to move • Double-click to edit • Right-click to delete"}
            className={cn(
                "group z-10", 
                !isEditing && "cursor-move"
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
                handle={(resizeHandleAxis, ref) => (
                    isSelected ? 
                    <span 
                        ref={ref}
                        className="react-resizable-handle absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-se-resize bg-primary rounded-full border-2 border-background shadow-md hover:scale-125 transition-transform z-30" 
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={stopPropagation}
                    />
                    : <></>
                )}
             >
                <textarea
                    value={annotation.text}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={(e) => e.stopPropagation()} // Stop key events from bubbling up to dnd-kit
                    style={{ all: 'unset', width: '100%', height: '100%', cursor: isEditing ? 'text' : 'move' }}
                    className="bg-transparent"
                    autoFocus={isEditing}
                />
            </ResizableBox>
            {!isEditing && (
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
                    aria-label="Delete text annotation"
                    title="Delete text"
                 >
                    <Trash2 className="h-3.5 w-3.5" />
                 </Button>
            )}
        </div>
    );
}
