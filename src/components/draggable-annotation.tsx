
"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { TextAnnotation } from "@/lib/types";

interface DraggableAnnotationProps {
    annotation: TextAnnotation;
}

export function DraggableAnnotation({ annotation }: DraggableAnnotationProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: annotation.id,
    });

    const style = {
        position: 'absolute' as const,
        left: annotation.x,
        top: annotation.y,
        transform: CSS.Translate.toString(transform),
        color: annotation.fontColor,
        fontSize: `${annotation.fontSize}px`,
        border: '1px dashed blue', // For visibility
        padding: '2px',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onDoubleClick={(e) => e.stopPropagation()} // Prevent creating new annotation
        >
            <textarea
                defaultValue={annotation.text}
                style={{ all: 'unset', width: annotation.width, height: annotation.height, cursor: 'text' }}
            />
        </div>
    );
}
