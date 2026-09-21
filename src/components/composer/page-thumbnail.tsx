"use client";

import React from "react";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageThumbnailProps {
  pageNumber: number | string;
  thumbnailUrl?: string | null;
  isOverlay?: boolean;
}

export function PageThumbnail({
  pageNumber,
  thumbnailUrl,
  isOverlay = false,
}: PageThumbnailProps) {
  return (
    <div
      className={cn(
        "relative flex aspect-[7/9] w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-white/40 dark:bg-black/40 backdrop-blur-sm shadow-sm transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-md",
        isOverlay
          ? "border-primary shadow-lg ring-2 ring-primary/20"
          : "border-black/5 dark:border-white/5 group-hover:border-primary/40"
      )}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`Page ${pageNumber}`}
          className="h-full w-full object-cover"
        />
      ) : thumbnailUrl === null ? (
        <>
          <FileText className="h-8 w-8 text-muted-foreground" />
          <span className="mt-2 text-sm font-medium text-foreground">
            Page {pageNumber}
          </span>
        </>
      ) : (
        <Skeleton className="h-full w-full" />
      )}
      <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm">
        Page {pageNumber}
      </div>
    </div>
  );
}
