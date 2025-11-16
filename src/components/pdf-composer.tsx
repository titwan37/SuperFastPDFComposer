
"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import {
  Upload,
  Download,
  Trash2,
  FileText,
  GripVertical,
  Loader,
  Plus,
  X,
  PlusSquare,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { SourceDoc, TargetPage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


// pdf.js worker configuration
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
}


type UniqueId = string;

let uniqueIdCounter = 0;
const getUniqueId = () => `id-${Date.now()}-${uniqueIdCounter++}`;

// Sub-component for a single page thumbnail
function PageThumbnail({
  pageNumber,
  thumbnailUrl,
  isOverlay = false,
}: {
  pageNumber: number | string;
  thumbnailUrl?: string | null;
  isOverlay?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-[7/9] w-full flex-col items-center justify-center overflow-hidden rounded-lg border-2 bg-card shadow-sm transition-shadow",
        isOverlay
          ? "border-primary shadow-lg"
          : "border-border group-hover:border-primary/50 group-hover:shadow-md"
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
       <div className="absolute bottom-1 left-1 rounded-sm bg-black/50 px-1.5 py-0.5 text-xs font-medium text-white">
        {pageNumber}
      </div>
    </div>
  );
}



// Sub-component for a draggable page in the source pane
function DraggableSourcePage({
  docId,
  pageIndex,
  thumbnailUrl,
  onDoubleClick,
}: {
  docId: UniqueId;
  pageIndex: number;
  thumbnailUrl?: string | null;
  onDoubleClick: () => void;
}) {
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
    <div className="group cursor-grab touch-none" onDoubleClick={onDoubleClick}>
      <div ref={setNodeRef} {...listeners} {...attributes}>
        <PageThumbnail
          pageNumber={pageIndex + 1}
          thumbnailUrl={thumbnailUrl}
        />
      </div>
    </div>
  );
}

// Sub-component for a sortable page in the target pane
function SortableTargetPage({
  id,
  pageNumber,
  thumbnailUrl,
  onDelete,
}: {
  id: UniqueId;
  pageNumber: number;
  thumbnailUrl?: string | null;
  onDelete: (id: UniqueId) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { from: 'target', id } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative"
    >
      <div className="relative">
        <PageThumbnail pageNumber={pageNumber} thumbnailUrl={thumbnailUrl} />
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab touch-none p-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        >
          <GripVertical className="h-5 w-5" />
        </div>
      </div>
      <Button
        variant="destructive"
        size="icon"
        className="absolute right-1 top-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onDelete(id)}
        aria-label="Delete page"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function PdfComposer({
  openTipsDialog,
  setDownloadAction,
}: {
  openTipsDialog: (onConfirm?: () => void) => void;
  setDownloadAction: (action: (() => void) | null) => void;
}) {
  const [sourceDocs, setSourceDocs] = useState<Record<UniqueId, SourceDoc>>({});
  const [targetPages, setTargetPages] = useState<TargetPage[]>([]);
  const [activeId, setActiveId] = useState<UniqueId | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [sourceThumbnailScale, setSourceThumbnailScale] = useState(1);

  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const targetFileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const renderPdfPage = async (
    pdfDoc: pdfjs.PDFDocumentProxy,
    pageNumber: number
  ): Promise<string> => {    
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.5 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) {
      throw new Error("Could not get canvas context");
    }

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    return canvas.toDataURL();
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    pane: "source" | "target"
  ) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please select a valid PDF file.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const docId = getUniqueId();

      // For rendering thumbnails
      const pdfjsDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdfjsDoc.numPages;

      const newSourceDoc: SourceDoc = {
        id: docId,
        doc: pdfDoc,
        filename: file.name,
        thumbnailUrls: Array(pageCount).fill(undefined),
      };

      setSourceDocs((prev) => ({ ...prev, [docId]: newSourceDoc }));
      
      if (pane === "target") {
        const newTargetPages = Array.from({ length: pdfDoc.getPageCount() }).map(
          (_, i) => ({
            id: `target-${docId}-${i}-${getUniqueId()}`,
            docId,
            originalPageIndex: i,
          })
        );
        setTargetPages(pages => [...pages, ...newTargetPages]);
      }

      toast({
        title: "PDF Loaded",
        description: `"${file.name}" has been loaded successfully.`,
      });

      // Sequentially render thumbnails to avoid overwhelming the browser
      for (let i = 0; i < pageCount; i++) {
        try {
          const thumbnailUrl = await renderPdfPage(pdfjsDoc, i + 1);
          setSourceDocs((prev) => {
            const updatedDoc = { ...prev[docId] };
            if(!updatedDoc) return prev;
            updatedDoc.thumbnailUrls[i] = thumbnailUrl;
            return { ...prev, [docId]: updatedDoc };
          });
        } catch (renderError) {
          console.error(`Failed to render page ${i + 1}:`, renderError);
          // Set to null to indicate failure, so we can show a placeholder
           setSourceDocs((prev) => {
            const updatedDoc = { ...prev[docId] };
            if(!updatedDoc) return prev;
            updatedDoc.thumbnailUrls[i] = null;
            return { ...prev, [docId]: updatedDoc };
          });
        }
      }
    } catch (error) {
      console.error("Failed to load PDF:", error);
      toast({
        variant: "destructive",
        title: "Error Loading PDF",
        description: "There was an issue processing your PDF file.",
      });
    } finally {
      setIsLoading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const deleteTargetPage = (id: UniqueId) => {
    setTargetPages((pages) => pages.filter((p) => p.id !== id));
  };

  const deleteSourceDoc = (docId: UniqueId) => {
    // Remove the source document
    setSourceDocs(currentDocs => {
      const newDocs = {...currentDocs};
      delete newDocs[docId];
      return newDocs;
    });
    // Remove any pages from the target that came from this source document
    setTargetPages(currentPages => currentPages.filter(p => p.docId !== docId));
  };
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as UniqueId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
  
    if (!over) return;
  
    const activeIdStr = active.id as UniqueId;
    const overIdStr = over.id as UniqueId;
  
    const activeIsTarget = active.data.current?.from === 'target';
    const overIsTargetArea = over.id === 'target-droppable-area';
    const overIsTargetItem = over.data.current?.from === 'target';
  
    // Scenario 1: Reordering within the target pane
    if (activeIsTarget && overIsTargetItem) {
        if (activeIdStr !== overIdStr) {
            setTargetPages((pages) => {
                const oldIndex = pages.findIndex((p) => p.id === activeIdStr);
                const newIndex = pages.findIndex((p) => p.id === overIdStr);
                return arrayMove(pages, oldIndex, newIndex);
            });
        }
        return;
    }
  
    const activeIsSource = active.data.current?.from === 'source';
    
    // Scenario 2: Dropping from source into target pane
    if (activeIsSource && (overIsTargetArea || overIsTargetItem)) {
      const { docId, pageIndex } = active.data.current!;
      const newPage: TargetPage = {
        id: `target-${docId}-${pageIndex}-${getUniqueId()}`,
        docId: docId,
        originalPageIndex: pageIndex,
      };
  
      setTargetPages((pages) => {
        if (overIsTargetItem) {
          const overIndex = pages.findIndex((p) => p.id === overIdStr);
          if (overIndex !== -1) {
            const newPages = [...pages];
            newPages.splice(overIndex + 1, 0, newPage); // Insert after the item
            return newPages;
          }
        }
        return [...pages, newPage];
      });
    }
  };

  const proceedToDownload = async () => {
    if (targetPages.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Document",
        description: "Add some pages to the target document before downloading.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newPdfDoc = await PDFDocument.create();
      for (const targetPage of targetPages) {
        const sourceDocData = sourceDocs[targetPage.docId];
        if (sourceDocData?.doc) {
           const [copiedPage] = await newPdfDoc.copyPages(sourceDocData.doc, [
            targetPage.originalPageIndex,
          ]);
          newPdfDoc.addPage(copiedPage);
        } else {
           console.warn(`Source document with id ${targetPage.docId} not found. Skipping page.`);
        }
      }

      const pdfBytes = await newPdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `composed-document-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: "Download Ready",
        description: "Your new PDF has been created.",
      });
    } catch (error) {
      console.error("Failed to create PDF:", error);
      toast({
        variant: "destructive",
        title: "Error Creating PDF",
        description: "There was an issue generating your document.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadClick = () => {
    if (targetPages.length > 0) {
      setDownloadAction(() => () => proceedToDownload());
      openTipsDialog(() => proceedToDownload());
    } else {
       toast({
        variant: "destructive",
        title: "Empty Document",
        description: "Add some pages to the target document before downloading.",
      });
    }
  };

  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: 'target-droppable-area',
  });

  const getActivePageData = useCallback(() => {
    if (!activeId) return { pageNumber: '', thumbnailUrl: undefined };

    if (activeId.startsWith('source-')) {
        const [, docId, pageIndexStr] = activeId.split('-');
        const pageIndex = parseInt(pageIndexStr, 10);
        const sourceDoc = sourceDocs[docId];
        return {
            pageNumber: pageIndex + 1,
            thumbnailUrl: sourceDoc?.thumbnailUrls?.[pageIndex]
        };
    }

    if (activeId.startsWith('target-')) {
        const targetPage = targetPages.find(p => p.id === activeId);
        if (!targetPage) return { pageNumber: '', thumbnailUrl: undefined };
        const pageIdxInTarget = targetPages.indexOf(targetPage);
        const sourceDoc = sourceDocs[targetPage.docId];
        return {
            pageNumber: pageIdxInTarget + 1,
            thumbnailUrl: sourceDoc?.thumbnailUrls?.[targetPage.originalPageIndex]
        };
    }
    
    return { pageNumber: '', thumbnailUrl: undefined };
}, [activeId, sourceDocs, targetPages]);

  const handleSourcePageDoubleClick = (docId: UniqueId, pageIndex: number) => {
    const newPage: TargetPage = {
      id: `target-${docId}-${pageIndex}-${getUniqueId()}`,
      docId: docId,
      originalPageIndex: pageIndex,
    };
    setTargetPages((pages) => [...pages, newPage]);
    const sourceDoc = sourceDocs[docId];
    toast({
      title: `Page Added from "${sourceDoc?.filename}"`,
      description: `Page ${pageIndex + 1} was added to the new document.`,
    });
  };

  const addAllPagesFromSource = (docId: UniqueId) => {
    const sourceDoc = sourceDocs[docId];
    if (!sourceDoc) return;

    const newPages: TargetPage[] = Array.from({ length: sourceDoc.doc.getPageCount() }).map(
      (_, i) => ({
        id: `target-${docId}-${i}-${getUniqueId()}`,
        docId: docId,
        originalPageIndex: i,
      })
    );

    setTargetPages((pages) => [...pages, ...newPages]);

    toast({
      title: "Pages Added",
      description: `All pages from "${sourceDoc.filename}" have been added to the new document.`,
    });
  };

  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Source Pane */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="mb-2 flex items-center justify-between">
                <CardTitle>Source Documents</CardTitle>
                <div className="flex items-center gap-2">
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setSourceThumbnailScale(s => Math.max(0.5, s - 0.1))} disabled={sourceThumbnailScale <= 0.5}>
                          <ZoomOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Zoom Out</p></TooltipContent>
                  </Tooltip>
                  <span className="text-sm font-medium w-12 text-center">{Math.round(sourceThumbnailScale * 100)}%</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setSourceThumbnailScale(s => Math.min(2, s + 0.1))} disabled={sourceThumbnailScale >= 2}>
                          <ZoomIn className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Zoom In</p></TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="flex items-center justify-between">
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
                <div className="text-xs border-dashed text-center text-muted-foreground">
                    Click "Add PDF" to load as many documents as you need.
                    Select, double-click the pages you want to compose the new one.
                </div>
              </div>
              <input
                type="file"
                ref={sourceFileInputRef}
                onChange={(e) => handleFileUpload(e, "source")}
                className="hidden"
                accept="application/pdf"
              />
            </CardHeader>
            <CardContent className="flex-grow">
              <ScrollArea className="h-[52vh] rounded-md border p-4">
                <div className="space-y-6">
                  {Object.keys(sourceDocs).length > 0 ? (
                    Object.values(sourceDocs).map(({ id, doc, filename, thumbnailUrls }) => (
                      <div key={id} className="group/source-doc relative space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center opacity-0 transition-opacity group-hover/source-doc:opacity-100">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                    onClick={() => deleteSourceDoc(id)}
                                    aria-label={`Delete ${filename}`}>
                                    <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete document</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7"
                                  onClick={() => addAllPagesFromSource(id)}
                                  aria-label={`Add all pages from ${filename}`}>
                                  <PlusSquare className="mr-2 h-4 w-4" />
                                  Add All
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Add all pages to new document</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <h3 className="font-small text-xs text-foreground">{filename}</h3>
                        </div>
                        <div
                          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                          style={{
                              gridTemplateColumns: `repeat(auto-fill, minmax(calc(6rem * ${sourceThumbnailScale}), 1fr))`
                          }}
                          >
                            {Array.from({ length: doc.getPageCount() }).map(
                                (_, i) => (
                                <DraggableSourcePage 
                                    key={`${id}-${i}`} 
                                    docId={id} 
                                    pageIndex={i}
                                    thumbnailUrl={thumbnailUrls?.[i]}
                                    onDoubleClick={() => handleSourcePageDoubleClick(id, i)}
                                />
                                )
                            )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                      <Upload className="mb-4 h-12 w-12" />
                      <p className="font-semibold">Upload a source PDF</p>
                      <p className="text-sm">Click "Add PDF" to get started.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Target Pane */}
          <Card className="flex flex-col">
            <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                 <CardTitle>New Document</CardTitle>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" onClick={() => targetFileInputRef.current?.click()}>
                          <Upload className="mr-2 h-4 w-4" />Load Base
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Load base document pages to new document.</p>
                      </TooltipContent>
                    </Tooltip>
                    <input
                      type="file"
                      ref={targetFileInputRef}
                      onChange={(e) => handleFileUpload(e, "target")}
                      className="hidden"
                      accept="application/pdf"
                    />
                    <Button onClick={handleDownloadClick} disabled={isLoading || targetPages.length === 0}>
                      {isLoading ? (
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}Download
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" onClick={() => setTargetPages([])} disabled={targetPages.length === 0}>
                          <Trash2 className="mr-2 h-4 w-4" />Clear
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear all pages from new document.</p>
                      </TooltipContent>
                    </Tooltip>                    
                  </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <SortableContext items={targetPages.map(p => p.id)} strategy={rectSortingStrategy}>
                <ScrollArea className="h-[52vh] rounded-md border">
                  <div ref={setDroppableNodeRef} className="h-full p-4">
                    {targetPages.length > 0 ? (
                      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                        {targetPages.map((page, index) => (
                          <SortableTargetPage
                            key={page.id}
                            id={page.id}
                            pageNumber={index + 1}
                            thumbnailUrl={sourceDocs[page.docId]?.thumbnailUrls?.[page.originalPageIndex]}
                            onDelete={deleteTargetPage}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className={cn(
                        "flex h-full min-h-[10rem] flex-col items-center justify-center rounded-lg border-2 border-dashed text-center text-muted-foreground transition-colors",
                        isOver ? "border-primary bg-accent/10" : ""
                      )}>
                        <p className="font-semibold">Drag pages here</p>
                        <p className="text-sm">or load a base PDF to start.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </SortableContext>
            </CardContent>
          </Card>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="w-32">
              <PageThumbnail 
                  pageNumber={getActivePageData().pageNumber}
                  thumbnailUrl={getActivePageData().thumbnailUrl}
                  isOverlay 
                />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}

    

    

    

    
