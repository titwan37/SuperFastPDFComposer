"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageThumbnail } from "./page-thumbnail";

interface DraggableSourcePageProps {
  docId: string;
  pageIndex: number;
  thumbnailUrl?: string | null;
  onPreview: () => void;
  onDoubleClick: () => void;
}

export function DraggableSourcePage({
  docId,
  pageIndex,
  thumbnailUrl,
  onPreview,
  onDoubleClick,
}: DraggableSourcePageProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `source-${docId}-${pageIndex}`,
    data: {
      from: "source",
      docId,
      pageIndex,
      thumbnailUrl,
    },
  });

  return (
    <div onDoubleClick={onDoubleClick} className="group relative">
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none"
      >
        <PageThumbnail
          pageNumber={pageIndex + 1}
          thumbnailUrl={thumbnailUrl}
        />
      </div>
      <div className="absolute inset-0 flex items-start justify-end bg-black/40 p-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-white/50 bg-black/20 text-white hover:bg-black/50 hover:text-white"
              onClick={onPreview}
              aria-label="Preview page"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Preview Page</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
