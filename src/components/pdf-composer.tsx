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
import { PDFDocument, rgb, PageSizes, type PDFImage } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
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
  PenSquare,
  FileEdit,
  Image as ImageIcon,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SourceDoc, TargetPage, SignaturePosition } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SignatureDialog } from "./signature-dialog";
import { AnnotationPage } from "./annotation-page";
import { PagePreviewDialog } from "./page-preview-dialog";

// pdf.js worker configuration
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
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
  onPreview,
  onDoubleClick,
}: {
  docId: UniqueId;
  pageIndex: number;
  thumbnailUrl?: string | null;
  onPreview: () => void;
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

// Sub-component for a sortable page in the target pane
function SortableTargetPage({
  id,
  pageNumber,
  thumbnailUrl,
  onDelete,
  onSign,
  onAnnotate,
  onPreview,
}: {
  id: UniqueId;
  pageNumber: number;
  thumbnailUrl?: string | null;
  onDelete: (id: UniqueId) => void;
  onSign: () => void;
  onAnnotate: () => void;
  onPreview: () => void;
}) {
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

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div className="relative">
        <PageThumbnail pageNumber={pageNumber} thumbnailUrl={thumbnailUrl} />
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
                aria-label="Preview page"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Preview Page</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={onSign}
                aria-label="Sign page"
              >
                <PenSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Sign this page</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={onAnnotate}
                aria-label="Annotate page"
              >
                <FileEdit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Annotate this page</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeId, setActiveId] = useState<UniqueId | null>(null);

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const [sourceDocs, setSourceDocs] = useState<Record<UniqueId, SourceDoc>>({});
  const [sourceThumbnailScale, setSourceThumbnailScale] = useState(1);

  const targetFileInputRef = useRef<HTMLInputElement>(null);
  const [targetPages, setTargetPages] = useState<TargetPage[]>([]);
  const [targetThumbnailScale, setTargetThumbnailScale] = useState(1);

  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [signingPageInfo, setSigningPageInfo] = useState<{
    targetPageId: UniqueId;
    docId: UniqueId;
    pageIndex: number;
  } | null>(null);

  const [isAnnotationPageOpen, setIsAnnotationPageOpen] = useState(false);
  const [annotatingPageInfo, setAnnotatingPageInfo] = useState<{
    targetPageId: UniqueId;
    docId: UniqueId;
    pageIndex: number;
  } | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<{
    docId: string;
    pageNumber: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
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

  const updatePageThumbnail = useCallback(
    async (docId: string, pageIndex: number, pdfDoc: PDFDocument) => {
      // Use pdf-lib document to get the latest page data
      const pdfBytes = await pdfDoc.save();
      const pdfjsDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;
      const thumbnailUrl = await renderPdfPage(pdfjsDoc, pageIndex + 1);

      // Update the source doc's thumbnail
      setSourceDocs((prev) => {
        const updatedDoc = prev[docId];
        if (!updatedDoc) return prev;

        const newThumbnailUrls = [...updatedDoc.thumbnailUrls];
        newThumbnailUrls[pageIndex] = thumbnailUrl;

        const newDoc = {
          ...updatedDoc,
          thumbnailUrls: newThumbnailUrls,
          doc: pdfDoc, // also update the document itself
        };

        return { ...prev, [docId]: newDoc };
      });
    },
    []
  );

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
        pdfjsDoc,
        filename: file.name,
        thumbnailUrls: Array(pageCount).fill(undefined),
      };
      setSourceDocs((prev) => ({ ...prev, [docId]: newSourceDoc }));

      if (pane === "target") {
        const newTargetPages = Array.from({
          length: pdfDoc.getPageCount(),
        }).map((_, i) => ({
          id: `target-${docId}-${i}-${getUniqueId()}`,
          docId,
          originalPageIndex: i,
        }));
        setTargetPages((pages) => [...pages, ...newTargetPages]);
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
            if (!updatedDoc) return prev;
            updatedDoc.thumbnailUrls[i] = thumbnailUrl;
            return { ...prev, [docId]: updatedDoc };
          });
        } catch (renderError) {
          console.error(`Failed to render page ${i + 1}:`, renderError);
          // Set to null to indicate failure, so we can show a placeholder
          setSourceDocs((prev) => {
            const updatedDoc = { ...prev[docId] };
            if (!updatedDoc) return prev;
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

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    toast({
      title: `Processing ${files.length} image(s)...`,
      description: "Please wait while we convert your images to PDF pages.",
    });

    try {
      for (const file of files) {
        const docId = getUniqueId();
        const arrayBuffer = await file.arrayBuffer();

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage(PageSizes.A4);
        const { width: pageW, height: pageH } = page.getSize();

        let image: PDFImage;
        if (file.type === "image/jpeg") {
          image = await pdfDoc.embedJpg(arrayBuffer);
        } else if (file.type === "image/png") {
          image = await pdfDoc.embedPng(arrayBuffer);
        } else {
          console.warn(
            `Unsupported image type: ${file.type}. Skipping file: ${file.name}`
          );
          continue;
        }

        const scaled = image.scaleToFit(pageW, pageH);

        page.drawImage(image, {
          x: pageW / 2 - scaled.width / 2,
          y: pageH / 2 - scaled.height / 2,
          width: scaled.width,
          height: scaled.height,
        });

        const pdfBytes = await pdfDoc.save();
        const pdfjsDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;

        // Create a thumbnail from the image itself for the UI
        const thumbnailUrl = URL.createObjectURL(file);

        const newSourceDoc: SourceDoc = {
          id: docId,
          doc: pdfDoc,
          pdfjsDoc: pdfjsDoc,
          filename: file.name,
          thumbnailUrls: [thumbnailUrl],
        };

        setSourceDocs((prev) => ({ ...prev, [docId]: newSourceDoc }));
      }

      toast({
        title: "Images Processed",
        description: `${files.length} image(s) have been successfully converted and added.`,
      });
    } catch (error) {
      console.error("Failed to process image:", error);
      toast({
        variant: "destructive",
        title: "Error Processing Image",
        description: "There was an issue converting one or more of your images.",
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
    // Revoke object URLs for image-based docs to prevent memory leaks
    const docToDelete = sourceDocs[docId];
    if (docToDelete && docToDelete.thumbnailUrls[0]?.startsWith("blob:")) {
      docToDelete.thumbnailUrls.forEach(
        (url) => url && URL.revokeObjectURL(url)
      );
    }

    // Remove the source document
    setSourceDocs((currentDocs) => {
      const newDocs = { ...currentDocs };
      delete newDocs[docId];
      return newDocs;
    });
    // Remove any pages from the target that came from this source document
    setTargetPages((currentPages) =>
      currentPages.filter((p) => p.docId !== docId)
    );
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
    const activeIsTarget = active.data.current?.from === "target";
    const overIsTargetArea = over.id === "target-droppable-area";
    const overIsTargetItem = over.data.current?.from === "target";
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

    const activeIsSource = active.data.current?.from === "source";

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
          console.warn(
            `Source document with id ${targetPage.docId} not found. Skipping page.`
          );
        }
      }

      const pdfBytes = await newPdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `composed-document-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
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
    id: "target-droppable-area",
  });

  const getActivePageData = useCallback(() => {
    if (!activeId) return { pageNumber: "", thumbnailUrl: undefined };

    if (activeId.startsWith("source-")) {
      const [, docId, pageIndexStr] = activeId.split("-");
      const pageIndex = parseInt(pageIndexStr, 10);
      const sourceDoc = sourceDocs[docId];
      return {
        pageNumber: pageIndex + 1,
        thumbnailUrl: sourceDoc?.thumbnailUrls?.[pageIndex],
      };
    }

    if (activeId.startsWith("target-")) {
      const targetPage = targetPages.find((p) => p.id === activeId);
      if (!targetPage) return { pageNumber: "", thumbnailUrl: undefined };
      const pageIdxInTarget = targetPages.indexOf(targetPage);
      const sourceDoc = sourceDocs[targetPage.docId];
      return {
        pageNumber: pageIdxInTarget + 1,
        thumbnailUrl:
          sourceDoc?.thumbnailUrls?.[targetPage.originalPageIndex],
      };
    }

    return { pageNumber: "", thumbnailUrl: undefined };
  }, [activeId, sourceDocs, targetPages]);

  const handlePreviewClick = (docId: UniqueId, pageIndex: number) => {
    const sourceDoc = sourceDocs[docId];
    if (!sourceDoc) return;
    setPreviewInfo({ docId, pageNumber: pageIndex + 1 });
    setIsPreviewOpen(true);
  };

  const handleSourcePageDoubleClick = (
    docId: UniqueId,
    pageIndex: number
  ) => {
    const sourceDoc = sourceDocs[docId];
    if (!sourceDoc) return;

    const newPage: TargetPage = {
      id: `target-${docId}-${pageIndex}-${getUniqueId()}`,
      docId: docId,
      originalPageIndex: pageIndex,
    };
    setTargetPages((pages) => [...pages, newPage]);
    toast({
      title: `Page Added from "${sourceDoc.filename}"`,
      description: `Page ${pageIndex + 1} was added to the new document.`,
    });
  };

  const addAllPagesFromSource = (docId: UniqueId) => {
    const sourceDoc = sourceDocs[docId];
    if (!sourceDoc) return;

    const newPages: TargetPage[] = Array.from({
      length: sourceDoc.doc.getPageCount(),
    }).map((_, i) => ({
      id: `target-${docId}-${i}-${getUniqueId()}`,
      docId: docId,
      originalPageIndex: i,
    }));

    setTargetPages((pages) => [...pages, ...newPages]);

    toast({
      title: "Pages Added",
      description: `All pages from "${sourceDoc.filename}" have been added to the new document.`,
    });
  };

  const openSignaturePad = (
    targetPageId: UniqueId,
    docId: UniqueId,
    pageIndex: number
  ) => {
    setSigningPageInfo({ targetPageId, docId, pageIndex });
    setIsSignatureDialogOpen(true);
  };

  const handleSaveSignature = async (
    signatureImage: string,
    position: SignaturePosition,
    xOffset: number
  ) => {
    if (!signingPageInfo) return;
    const { targetPageId, docId, pageIndex } = signingPageInfo;
    const originalSourceDoc = sourceDocs[docId];
    if (!originalSourceDoc) return;

    setIsLoading(true);
    try {
      const newPdfDoc = await originalSourceDoc.doc.copy();
      const pngImage = await newPdfDoc.embedPng(signatureImage);
      const page = newPdfDoc.getPage(pageIndex);
      const { width, height } = page.getSize();

      const signatureWidth = 150;
      const signatureHeight =
        (pngImage.height / pngImage.width) * signatureWidth;
      const margin = 50;

      let x: number;
      switch (position) {
        case "left":
          x = margin;
          break;
        case "center":
          x = (width - signatureWidth) / 2;
          break;
        case "right":
          x = width - signatureWidth - margin;
          break;
      }

      page.drawImage(pngImage, {
        x: x + xOffset,
        y: margin,
        width: signatureWidth,
        height: signatureHeight,
      });

      await updatePageThumbnail(docId, pageIndex, newPdfDoc);

      toast({
        title: "Signature Added",
        description: `Signature has been added to page ${
          pageIndex + 1
        }. A new version of the source page has been created.`,
      });
    } catch (error) {
      console.error("Failed to add signature:", error);
      toast({
        variant: "destructive",
        title: "Error Adding Signature",
        description: "There was an issue adding the signature to the PDF.",
      });
    } finally {
      setIsLoading(false);
      setIsSignatureDialogOpen(false);
      setSigningPageInfo(null);
    }
  };

  const openAnnotationPage = (
    targetPageId: UniqueId,
    docId: UniqueId,
    pageIndex: number
  ) => {
    setAnnotatingPageInfo({ targetPageId, docId, pageIndex });
    setIsAnnotationPageOpen(true);
  };

  const handleSaveAnnotations = async (annotatedDoc: PDFDocument) => {
    if (!annotatingPageInfo) return;
    const { docId, pageIndex, targetPageId } = annotatingPageInfo;

    setSourceDocs((prev) => {
      const originalDoc = prev[docId];
      if (!originalDoc) return prev;
      const newDoc = { ...originalDoc, doc: annotatedDoc };
      return { ...prev, [docId]: newDoc };
    });

    await updatePageThumbnail(docId, pageIndex, annotatedDoc);

    toast({
      title: "Annotations Saved",
      description: `Your changes to the page have been saved.`,
    });
    setIsAnnotationPageOpen(false);
    setAnnotatingPageInfo(null);
  };

  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {/* Source Pane */}
          <Card className="flex flex-col shrink-0 gap-4">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Source Docs</CardTitle>
                <div className="flex shrink-0 items-center gap-2">
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
                      <Button
                        onClick={() => sourceFileInputRef.current?.click()}
                      >
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
                onChange={(e) => handleFileUpload(e, "source")}
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
              <ScrollArea className="h-[52vh] rounded-md border p-4">
                <div className="space-y-4">
                  {Object.keys(sourceDocs).length > 0 ? (
                    Object.values(sourceDocs).map(
                      ({ id, doc, pdfjsDoc, filename, thumbnailUrls }) => (
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
                                    onClick={() => deleteSourceDoc(id)}
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
                                      onClick={() => addAllPagesFromSource(id)}
                                      aria-label={`Add all pages from ${filename}`}
                                    >
                                      <PlusSquare className="mr-2 h-4 w-4" />
                                      Add All
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Add all pages to new document</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <h3
                              className="font-small truncate text-right text-xs text-foreground"
                              title={filename}
                            >
                              {filename}
                            </h3>
                          </div>
                          <div
                            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                            style={{
                              gridTemplateColumns: `repeat(auto-fill, minmax(calc(6rem * ${sourceThumbnailScale}), 1fr))`,
                            }}
                          >
                            {Array.from({ length: doc.getPageCount() }).map(
                              (_, i) => (
                                <DraggableSourcePage
                                  key={`${id}-${i}`}
                                  docId={id}
                                  pageIndex={i}
                                  thumbnailUrl={thumbnailUrls?.[i]}
                                  onPreview={() => handlePreviewClick(id, i)}
                                  onDoubleClick={() =>
                                    handleSourcePageDoubleClick(id, i)
                                  }
                                />
                              )
                            )}
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                      <Upload className="mb-4 h-12 w-12" />
                      <p className="font-semibold">
                        Upload a source PDF or Image
                      </p>
                      <p className="text-sm">
                        Click "Add PDF" or "Add Image" to get started.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Target Pane */}
          <Card className="flex flex-col shrink-0 gap-4">
            <CardHeader className="p-4 pb-2 shrink-0 gap-4">
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Target Doc</CardTitle>
                <div className="flex shrink-0 items-center gap-2">
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
              <p className="flex-grow text-right text-xs text-muted-foreground">
                Drag pages here or reorder them.
              </p>
              <div className="flex shrink-0 items-center justify-between gap-4">
                <div className="flex shrink-0 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => targetFileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Load
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
                  <Button
                    onClick={handleDownloadClick}
                    disabled={isLoading || targetPages.length === 0}
                  >
                    {isLoading ? (
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={() => setTargetPages([])}
                        disabled={targetPages.length === 0}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear all pages from new document.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow shrink-0 p-4">
              <SortableContext
                items={targetPages.map((p) => p.id)}
                strategy={rectSortingStrategy}
              >
                <ScrollArea className="h-[52vh] rounded-md border">
                  <div ref={setDroppableNodeRef} className="h-full p-4">
                    {targetPages.length > 0 ? (
                      <div
                        className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5"
                        style={{
                          gridTemplateColumns: `repeat(auto-fill, minmax(calc(6rem * ${targetThumbnailScale}), 1fr))`,
                        }}
                      >
                        {targetPages.map((page, index) => (
                          <SortableTargetPage
                            key={page.id}
                            id={page.id}
                            pageNumber={index + 1}
                            thumbnailUrl={
                              sourceDocs[page.docId]?.thumbnailUrls?.[
                                page.originalPageIndex
                              ]
                            }
                            onDelete={deleteTargetPage}
                            onSign={() =>
                              openSignaturePad(
                                page.id,
                                page.docId,
                                page.originalPageIndex
                              )
                            }
                            onAnnotate={() =>
                              openAnnotationPage(
                                page.id,
                                page.docId,
                                page.originalPageIndex
                              )
                            }
                            onPreview={() =>
                              handlePreviewClick(
                                page.docId,
                                page.originalPageIndex
                              )
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "flex h-full min-h-[10rem] flex-col items-center justify-center rounded-lg border-2 border-dashed text-center text-muted-foreground transition-colors",
                          isOver ? "border-primary bg-accent/10" : ""
                        )}
                      >
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
      <SignatureDialog
        isOpen={isSignatureDialogOpen}
        onClose={() => {
          setIsSignatureDialogOpen(false);
          setSigningPageInfo(null);
        }}
        onSave={handleSaveSignature}
      />
      {isAnnotationPageOpen && annotatingPageInfo && (
        <AnnotationPage
          isOpen={isAnnotationPageOpen}
          onClose={() => setIsAnnotationPageOpen(false)}
          pdfDoc={sourceDocs[annotatingPageInfo.docId].doc}
          pageIndex={annotatingPageInfo.pageIndex}
          onSave={(annotatedDoc) => handleSaveAnnotations(annotatedDoc)}
        />
      )}
      {previewInfo && (
        <PagePreviewDialog
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          pdfDoc={sourceDocs[previewInfo.docId]?.pdfjsDoc ?? null}
          pageNumber={previewInfo.pageNumber}
        />
      )}
    </TooltipProvider>
  );
}