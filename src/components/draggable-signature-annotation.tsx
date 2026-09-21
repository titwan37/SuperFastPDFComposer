"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Trash2 } from "lucide-react";
import { ResizableBox } from "react-resizable";
import type { SignatureAnnotation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import "react-resizable/css/styles.css";

interface DraggableSignatureAnnotationProps {
    annotation: SignatureAnnotation;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onResizeStop: (size: { width: number; height: number }) => void;
}

export function DraggableSignatureAnnotation({
    annotation,
    isSelected,
    onSelect,
    onDelete,
    onResizeStop,
}: DraggableSignatureAnnotationProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: annotation.id,
    });

    const style = {
        position: 'absolute' as const,
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
            onDoubleClick={stopPropagation}
            onContextMenu={(e) => {
                e.preventDefault();
                stopPropagation(e);
                onDelete();
            }}
            title="Drag to move • Right-click to delete"
            className={cn(
                "group z-10 cursor-move select-none",
                isSelected && "z-20 ring-1 ring-primary/40 rounded-sm"
            )}
        >
            <ResizableBox
                width={annotation.width}
                height={annotation.height}
                lockAspectRatio={true}
                minConstraints={[40, 20]}
                maxConstraints={[700, 500]}
                onResizeStop={(e, data) => {
                    stopPropagation(e);
                    onResizeStop({ width: data.size.width, height: data.size.height });
                }}
                className={cn(
                    "box-border p-1 relative",
                    isSelected
                        ? "border-2 border-dashed border-primary bg-primary/5 rounded-md"
                        : "border border-transparent hover:border-primary/50"
                )}
                handle={(resizeHandleAxis, ref) =>
                    isSelected ? (
                        <span
                            ref={ref}
                            className="react-resizable-handle absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize bg-primary rounded-full border-2 border-background shadow-md hover:scale-125 transition-transform z-30"
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            title="Drag to resize signature"
                        />
                    ) : (
                        <span />
                    )
                }
            >
                <div className="w-full h-full flex items-center justify-center">
                    <img
                        src={annotation.dataUrl}
                        alt="Signature"
                        className="w-full h-full object-contain pointer-events-none select-none"
                        draggable={false}
                    />
                </div>
            </ResizableBox>
            <Button
                variant="destructive"
                size="icon"
                className={cn(
                    "absolute -top-3 -right-3 h-7 w-7 cursor-pointer rounded-full shadow-lg z-30 transition-all hover:scale-110",
                    isSelected ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 group-hover:scale-100"
                )}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={(e) => {
                    stopPropagation(e);
                    onDelete();
                }}
                aria-label="Delete signature"
                title="Delete signature"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
