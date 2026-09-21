"use client";

import React, { useRef } from "react";
import {
  FileText,
  ZoomIn,
  ZoomOut,
  Plus,
  ImageIcon,
  Upload,
  X,
  PlusSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SourceDoc } from "@/lib/types";
import { DraggableSourcePage } from "./draggable-source-page";

interface SourceDocumentsPanelProps {
  sourceDocs: Record<string, SourceDoc>;
  sourceThumbnailScale: number;
  setSourceThumbnailScale: React.Dispatch<React.SetStateAction<number>>;
  isDraggingOver: boolean;
  setIsDraggingOver: (dragging: boolean) => void;
  onDropFiles: (e: React.DragEvent<HTMLDivElement>) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onDeleteSourceDoc: (docId: string) => void;
  onAddAllPagesFromSource: (docId: string) => void;
  onPreviewClick: (docId: string, pageIndex: number) => void;
  onSourcePageDoubleClick: (docId: string, pageIndex: number) => void;
}

export function SourceDocumentsPanel({
  sourceDocs,
  sourceThumbnailScale,
  setSourceThumbnailScale,
  isDraggingOver,
  setIsDraggingOver,
  onDropFiles,
  onFilesSelected,
  onDeleteSourceDoc,
  onAddAllPagesFromSource,
  onPreviewClick,
  onSourcePageDoubleClick,
}: SourceDocumentsPanelProps) {
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const handleSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    e.target.value = "";
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    e.target.value = "";
  };

  return (
    <Card
      className={cn(
        "flex flex-col rounded-3xl border bg-white/40 dark:bg-black/40 backdrop-blur-xl shadow-xl transition-all duration-300 relative overflow-hidden",
        isDraggingOver ? "ring-2 ring-primary border-primary" : ""
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={onDropFiles}
    >
      <CardHeader className="flex-shrink-0 space-y-4 border-b border-black/5 dark:border-white/5 p-4 sm:p-6 bg-transparent">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Source Documents
          </CardTitle>
          <div className="flex items-center gap-1 rounded-lg border bg-background/50 p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    setSourceThumbnailScale((s) => Math.max(0.5, s - 0.1))
                  }
                  disabled={sourceThumbnailScale <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out</p>
              </TooltipContent>
            </Tooltip>
            <span className="w-12 text-center text-sm font-medium">
              {Math.round(sourceThumbnailScale * 100)}%
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    setSourceThumbnailScale((s) => Math.min(2, s + 0.1))
                  }
                  disabled={sourceThumbnailScale >= 2}
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
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => sourceFileInputRef.current?.click()}>
                  <Plus className="mr-2 h-4 w-4" /> Add PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add PDF document in the source documents list.</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => imageFileInputRef.current?.click()}
                >
                  <ImageIcon className="mr-2 h-4 w-4" /> Add Image
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add JPG/PNG images to be converted into PDF pages.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="flex-grow text-right text-xs text-muted-foreground">
            Drag or double-click to add pages.
          </p>
        </div>
        <input
          type="file"
          ref={sourceFileInputRef}
          onChange={handleSourceUpload}
          className="hidden"
          accept="application/pdf"
        />
        <input
          type="file"
          ref={imageFileInputRef}
          onChange={handleImageUpload}
          className="hidden"
          accept="image/png, image/jpeg"
          multiple
        />
      </CardHeader>
      <CardContent className="flex-grow gap-4 p-4">
        <ScrollArea className="h-[52vh] rounded-2xl border border-black/5 dark:border-white/5 bg-white/10 dark:bg-black/10 p-4 relative">
          {isDraggingOver && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary/10">
              <Upload className="mb-4 h-12 w-12 text-primary" />
              <p className="font-semibold text-primary">Drop files here</p>
            </div>
          )}
          <div className="space-y-4">
            {Object.keys(sourceDocs).length > 0 ? (
              Object.values(sourceDocs).map(
                ({ id, doc, filename, thumbnailUrls }) => (
                  <div
                    key={id}
                    className="group/source-doc relative space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center opacity-0 transition-opacity group-hover/source-doc:opacity-100">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onDeleteSourceDoc(id)}
                              aria-label={`Delete ${filename}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete document</p>
                          </TooltipContent>
                        </Tooltip>
                        {doc.getPageCount() > 1 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7"
                                onClick={() => onAddAllPagesFromSource(id)}
                                aria-label={`Add all pages from ${filename}`}
                              >
                                <PlusSquare className="mr-1 h-3.5 w-3.5" />
                                Add All ({doc.getPageCount()})
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add all pages from this document</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <span
                        className="truncate text-xs font-semibold text-muted-foreground"
                        title={filename}
                      >
                        {filename} ({doc.getPageCount()}{" "}
                        {doc.getPageCount() === 1 ? "page" : "pages"})
                      </span>
                    </div>
                    <div
                      className="grid gap-3"
                      style={{
                        gridTemplateColumns: `repeat(auto-fill, minmax(${
                          90 * sourceThumbnailScale
                        }px, 1fr))`,
                      }}
                    >
                      {Array.from({ length: doc.getPageCount() }).map(
                        (_, index) => (
                          <DraggableSourcePage
                            key={`source-page-${id}-${index}`}
                            docId={id}
                            pageIndex={index}
                            thumbnailUrl={thumbnailUrls[index]}
                            onPreview={() => onPreviewClick(id, index)}
                            onDoubleClick={() =>
                              onSourcePageDoubleClick(id, index)
                            }
                          />
                        )
                      )}
                    </div>
                  </div>
                )
              )
            ) : (
              <div className="flex h-[45vh] flex-col items-center justify-center text-center">
                <div className="rounded-full bg-primary/10 p-4 mb-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <p className="font-semibold text-foreground">
                  No Source Documents
                </p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  Upload or drag and drop PDF files or images to extract pages.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
