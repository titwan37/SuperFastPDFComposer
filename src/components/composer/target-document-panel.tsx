"use client";

import React, { useRef } from "react";
import {
  PlusSquare,
  ZoomIn,
  ZoomOut,
  Download,
  FileText,
  Trash2,
} from "lucide-react";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { TargetPage, SourceDoc } from "@/lib/types";
import { SortableTargetPage } from "./sortable-target-page";

interface TargetDocumentPanelProps {
  targetPages: TargetPage[];
  sourceDocs: Record<string, SourceDoc>;
  targetThumbnailScale: number;
  setTargetThumbnailScale: React.Dispatch<React.SetStateAction<number>>;
  setDroppableNodeRef: (element: HTMLElement | null) => void;
  isOver: boolean;
  onDownloadClick: () => void;
  onConvertToWord: () => void;
  onClearTargetPages: () => void;
  onDeleteTargetPage: (id: string) => void;
  onPreviewClick: (docId: string, pageIndex: number, targetPageId: string) => void;
  onTargetFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TargetDocumentPanel({
  targetPages,
  sourceDocs,
  targetThumbnailScale,
  setTargetThumbnailScale,
  setDroppableNodeRef,
  isOver,
  onDownloadClick,
  onConvertToWord,
  onClearTargetPages,
  onDeleteTargetPage,
  onPreviewClick,
  onTargetFileUpload,
}: TargetDocumentPanelProps) {
  const targetFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="flex flex-col rounded-3xl border bg-white/40 dark:bg-black/40 backdrop-blur-xl shadow-xl transition-all duration-300 relative overflow-hidden">
      <CardHeader className="flex-shrink-0 space-y-4 border-b border-black/5 dark:border-white/5 p-4 sm:p-6 bg-transparent">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <PlusSquare className="h-5 w-5 text-primary" />
            New Document ({targetPages.length}{" "}
            {targetPages.length === 1 ? "page" : "pages"})
          </CardTitle>
          <div className="flex items-center gap-1 rounded-lg border bg-background/50 p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    setTargetThumbnailScale((s) => Math.max(0.5, s - 0.1))
                  }
                  disabled={targetThumbnailScale <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out</p>
              </TooltipContent>
            </Tooltip>
            <span className="w-12 text-center text-sm font-medium">
              {Math.round(targetThumbnailScale * 100)}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    setTargetThumbnailScale((s) => Math.min(2, s + 0.1))
                  }
                  disabled={targetThumbnailScale >= 2}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom In</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={onDownloadClick}
                  className="w-full sm:w-auto h-8 text-xs font-semibold shadow-sm hover:shadow transition-all"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export the assembled pages as a single PDF.</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onConvertToWord}
                  className="w-full sm:w-auto h-8 text-xs font-semibold shadow-sm hover:shadow transition-all"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Export Word
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Convert target document to Microsoft Word format.</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClearTargetPages}
                  disabled={targetPages.length === 0}
                  className="w-full sm:w-auto h-8 text-xs font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Clear
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear all pages from the target document.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <input
          type="file"
          ref={targetFileInputRef}
          onChange={onTargetFileUpload}
          className="hidden"
          accept="application/pdf"
        />
      </CardHeader>
      <CardContent className="flex-grow p-4">
        <ScrollArea
          ref={setDroppableNodeRef}
          className={cn(
            "h-[52vh] rounded-2xl border border-black/5 dark:border-white/5 bg-white/10 dark:bg-black/10 p-4 transition-colors",
            isOver ? "bg-primary/5 ring-2 ring-primary/20" : ""
          )}
        >
          {targetPages.length > 0 ? (
            <SortableContext
              items={targetPages.map((p) => p.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${
                    90 * targetThumbnailScale
                  }px, 1fr))`,
                }}
              >
                {targetPages.map((page, index) => {
                  const sourceDoc = sourceDocs[page.docId];
                  return (
                    <SortableTargetPage
                      key={page.id}
                      id={page.id}
                      pageNumber={index + 1}
                      thumbnailUrl={
                        sourceDoc?.thumbnailUrls[page.originalPageIndex]
                      }
                      onDelete={onDeleteTargetPage}
                      onPreview={() =>
                        onPreviewClick(
                          page.docId,
                          page.originalPageIndex,
                          page.id
                        )
                      }
                      annotations={page.annotations}
                    />
                  );
                })}
              </div>
            </SortableContext>
          ) : (
            <div className="flex h-[45vh] flex-col items-center justify-center text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <PlusSquare className="h-8 w-8 text-primary" />
              </div>
              <p className="font-semibold text-foreground">
                Document is Empty
              </p>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                Drag pages from the left pane to assemble your document.
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
