"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, GripVertical, Eye, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Annotation } from "@/lib/types";
import { PageThumbnail } from "./page-thumbnail";

interface SortableTargetPageProps {
  id: string;
  pageNumber: number;
  thumbnailUrl?: string | null;
  onDelete: (id: string) => void;
  onPreview: () => void;
  annotations?: Annotation[];
}

export function SortableTargetPage({
  id,
  pageNumber,
  thumbnailUrl,
  onDelete,
  onPreview,
  annotations = [],
}: SortableTargetPageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { from: "target", id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasSignature = annotations.some((a) => a.type === "signature");
  const hasAnnotations = annotations.length > 0;

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div className="relative">
        <PageThumbnail pageNumber={pageNumber} thumbnailUrl={thumbnailUrl} />
        {hasAnnotations && (
          <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 rounded-md bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider backdrop-blur-sm shadow-sm">
            <FileSignature className="h-3 w-3" />
            <span>{hasSignature ? "Signed" : "Annotated"}</span>
          </div>
        )}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab touch-none p-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        >
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="absolute right-1 top-1 flex flex-col gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                className="h-7 w-7"
                onClick={() => onDelete(id)}
                aria-label="Delete page"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Delete page</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={onPreview}
                aria-label="Preview and edit page"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>View &amp; Edit</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
