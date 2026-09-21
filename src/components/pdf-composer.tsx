
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
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
import { PDFDocument, rgb, PageSizes, type PDFImage, RotationTypes, StandardFonts } from "pdf-lib";
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
  Eye,
  FileSignature,
  FileEdit,
  ImageIcon,
  RotateCw,
  RefreshCw,
} from "lucide-react";
import { Packer } from "docx";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SourceDoc, TargetPage, SignaturePosition, Annotation } from "@/lib/types";
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
import { OptimizationDialog } from "./optimization-dialog";
import { optimizePdf, downloadBlob } from "@/services/client-pdf-optimizer.service";
import { applyAnnotationsToPdfPage } from "@/lib/pdf-annotation-renderer";

type UniqueId = string;

let uniqueIdCounter = 0;
const getUniqueId = (prefix: string = 'id') => `${prefix}-${Date.now()}-${uniqueIdCounter++}`;


const OPTIMIZATION_THRESHOLD_BYTES = 6 * 1024 * 1024; // 6MB

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
  onPreview,
  annotations = [],
}: {
  id: UniqueId;
  pageNumber: number;
  thumbnailUrl?: string | null;
  onDelete: (id: UniqueId) => void;
  onPreview: () => void;
  annotations?: Annotation[];
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

export function PdfComposer({
  openTipsDialog,
  downloadTrigger,
}: {
  openTipsDialog: () => void;
  downloadTrigger: number;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [activeId, setActiveId] = useState<UniqueId | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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
    targetPageId: UniqueId | null; // Keep track of target page if applicable
  } | null>(null);
  
  const [isOptimizationDialogOpen, setIsOptimizationDialogOpen] = useState(false);
  const [optimizationInfo, setOptimizationInfo] = useState<{
    pdfBytes: Uint8Array;
    fileName: string;
  } | null>(null);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizationQuality, setOptimizationQuality] = useState(75);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const renderPdfPage = async (
    pdfDocProxy: PDFDocumentProxy,
    pageNumber: number
  ): Promise<string> => {
    const page = await pdfDocProxy.getPage(pageNumber);
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
  
  const updateSourceDoc = useCallback( async (docId: string, newPdfDoc: PDFDocument) => {
    const pdfBytes = await newPdfDoc.save();

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
    }
    const newPdfjsDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;
    
    setSourceDocs(prev => {
        const docToUpdate = prev[docId];
        if (!docToUpdate) return prev;
        
        const newDoc: SourceDoc = {
            ...docToUpdate,
            doc: newPdfDoc,
            pdfjsDoc: newPdfjsDoc,
            // Invalidate all thumbnails since any page could have changed
            thumbnailUrls: Array(newPdfDoc.getPageCount()).fill(undefined), 
        };
        return {...prev, [docId]: newDoc};
    });

    // Re-render all thumbnails for the updated document
    for (let i = 0; i < newPdfjsDoc.numPages; i++) {
        const thumbnailUrl = await renderPdfPage(newPdfjsDoc, i + 1);
        setSourceDocs(prev => {
            const currentDoc = prev[docId];
            if (!currentDoc) return prev;
            const updatedThumbnails = [...currentDoc.thumbnailUrls];
            updatedThumbnails[i] = thumbnailUrl;
            return {
                ...prev,
                [docId]: { ...currentDoc, thumbnailUrls: updatedThumbnails }
            };
        });
    }
  }, []);

  const processPdfFile = async (file: File): Promise<SourceDoc> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const docId = getUniqueId();
    
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
    }
    const pdfjsDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pageCount = pdfjsDoc.numPages;

    const newSourceDoc: SourceDoc = {
      id: docId,
      doc: pdfDoc,
      pdfjsDoc,
      file,
      filename: file.name,
      thumbnailUrls: Array(pageCount).fill(undefined),
    };

    setSourceDocs((prev) => ({ ...prev, [docId]: newSourceDoc }));
    toast({
      title: "PDF Loaded",
      description: `"${file.name}" has been loaded successfully.`,
    });

    for (let i = 0; i < pageCount; i++) {
      try {
        const thumbnailUrl = await renderPdfPage(pdfjsDoc, i + 1);
        setSourceDocs((prev) => {
          const updatedDoc = prev[docId];
          if (!updatedDoc) return prev;
          const newThumbnails = [...updatedDoc.thumbnailUrls];
          newThumbnails[i] = thumbnailUrl;
          return { ...prev, [docId]: { ...updatedDoc, thumbnailUrls: newThumbnails } };
        });
      } catch (renderError) {
        console.error(`Failed to render page ${i + 1}:`, renderError);
        setSourceDocs((prev) => {
          const updatedDoc = prev[docId];
          if (!updatedDoc) return prev;
          const newThumbnails = [...updatedDoc.thumbnailUrls];
          newThumbnails[i] = null;
          return { ...prev, [docId]: { ...updatedDoc, thumbnailUrls: newThumbnails } };
        });
      }
    }
    return newSourceDoc;
  };

  const processImageFile = async (file: File): Promise<SourceDoc | null> => {
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
      toast({
        variant: "destructive",
        title: "Unsupported Image Type",
        description: `${file.name} is not a supported image type.`,
      });
      return null;
    }

    const scaled = image.scaleToFit(pageW, pageH);
    page.drawImage(image, {
      x: pageW / 2 - scaled.width / 2,
      y: pageH / 2 - scaled.height / 2,
      width: scaled.width,
      height: scaled.height,
    });

    const pdfBytes = await pdfDoc.save();

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
    }
    const pdfjsDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;
    const thumbnailUrl = URL.createObjectURL(file);
    
    // Create a new file object for the converted PDF
    const pdfFile = new File([pdfBytes as any], file.name.replace(/\.[^/.]+$/, ".pdf"), { type: "application/pdf" });

    const newSourceDoc: SourceDoc = {
      id: docId,
      doc: pdfDoc,
      pdfjsDoc: pdfjsDoc,
      file: pdfFile,
      filename: file.name,
      thumbnailUrls: [thumbnailUrl],
    };
    setSourceDocs((prev) => ({ ...prev, [docId]: newSourceDoc }));
    return newSourceDoc;
  };


  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    pane: "source" | "target"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please select a valid PDF file.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newSourceDoc = await processPdfFile(file);
      if (pane === "target") {
        const newTargetPages = Array.from({
          length: newSourceDoc.doc.getPageCount(),
        }).map((_, i) => ({
          id: `target-${newSourceDoc.id}-${i}-${getUniqueId()}`,
          docId: newSourceDoc.id,
          originalPageIndex: i,
          annotations: [],
        }));
        setTargetPages((pages) => [...pages, ...newTargetPages]);
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
    setLoadingMessage(`Processing ${files.length} image(s)...`);
    try {
      for (const file of files) {
        await processImageFile(file);
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
      setLoadingMessage("");
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleFileDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);

    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setLoadingMessage(`Processing ${files.length} file(s)...`);
    try {
      let processedCount = 0;
      for (const file of files) {
        if (file.type === "application/pdf") {
          await processPdfFile(file);
          processedCount++;
        } else if (file.type === "image/png" || file.type === "image/jpeg") {
          await processImageFile(file);
          processedCount++;
        } else {
          toast({
            variant: "destructive",
            title: "Unsupported File Type",
            description: `File "${file.name}" was skipped.`,
          });
        }
      }
      if (processedCount > 0) {
        toast({
          title: "Files Processed",
          description: `${processedCount} file(s) were successfully added.`,
        });
      }
    } catch (error) {
      console.error("Failed to process dropped files:", error);
      toast({
        variant: "destructive",
        title: "Error Processing Files",
        description: "There was an issue processing one or more of your files.",
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
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
        annotations: [],
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

  const proceedToDownload = useCallback(async () => {
    if (targetPages.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Document",
        description: "Add some pages to the target document before downloading.",
      });
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Composing PDF...");
    try {
      const newPdfDoc = await PDFDocument.create();
      for (const targetPage of targetPages) {
        const sourceDocData = sourceDocs[targetPage.docId];
        if (sourceDocData?.doc) {
          const [copiedPage] = await newPdfDoc.copyPages(sourceDocData.doc, [
            targetPage.originalPageIndex,
          ]);

          // Draw any annotations onto the page with normalized scaling
          if (targetPage.annotations && targetPage.annotations.length > 0) {
            await applyAnnotationsToPdfPage(copiedPage, targetPage.annotations, newPdfDoc);
          }
          
          newPdfDoc.addPage(copiedPage);
        } else {
          console.warn(
            `Source document with id ${targetPage.docId} not found. Skipping page.`
          );
        }
      }

      const pdfBytes = await newPdfDoc.save({ useObjectStreams: true });
      const fileName = `composed-document-${new Date().toISOString().split("T")[0]}.pdf`;

      if (pdfBytes.length > OPTIMIZATION_THRESHOLD_BYTES) {
        setOptimizationInfo({ pdfBytes, fileName });
        setIsOptimizationDialogOpen(true);
      } else {
        downloadBlob(pdfBytes, fileName, "application/pdf");
        toast({
          title: "Download Ready",
          description: `Your document "${fileName}" has been created.`,
        });
      }

    } catch (error) {
      console.error("Failed to create PDF:", error);
      toast({
        variant: "destructive",
        title: "Error Creating PDF",
        description: "There was an issue generating your document.",
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  }, [targetPages, sourceDocs, toast]);

  useEffect(() => {
    if (downloadTrigger > 0) {
      proceedToDownload();
    }
  }, [downloadTrigger, proceedToDownload]);


  const handleConvertToWord = async () => {
    if (targetPages.length === 0) {
        toast({
            variant: "destructive",
            title: "Empty Document",
            description: "Add some pages to the target document before converting.",
        });
        return;
    }

    setIsLoading(true);
    setLoadingMessage("Converting to Word...");
    try {
        const { Document, Packer, Paragraph } = await import('docx');
        const docx = await import('docx');
        const paragraphs: any[] = [];

        for (const targetPage of targetPages) {
            const sourceDocData = sourceDocs[targetPage.docId];
            if (!sourceDocData?.pdfjsDoc) continue;

            const page = await sourceDocData.pdfjsDoc.getPage(targetPage.originalPageIndex + 1);
            const textContent = await page.getTextContent();
            
            for (const item of textContent.items as { str: string }[]) {
                paragraphs.push(new docx.Paragraph(item.str));
            }
            
            paragraphs.push(new docx.Paragraph({ text: "", pageBreakBefore: true }));
        }
        
        if (paragraphs.length > 0) {
            paragraphs.pop();
        }

        const doc = new Document({
            sections: [{
                children: paragraphs,
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `composed-document-${new Date().toISOString().split("T")[0]}.docx`);

        toast({
            title: "Conversion Complete",
            description: "Your document has been converted to Word.",
        });
    } catch (error) {
        console.error("Failed to convert to Word:", error);
        toast({
            variant: "destructive",
            title: "Conversion Error",
            description: "There was an issue converting your document to Word.",
        });
    } finally {
        setIsLoading(false);
        setLoadingMessage("");
    }
  };

  const handleDownloadClick = useCallback(() => {
    if (targetPages.length > 0) {
      openTipsDialog();
    } else {
      toast({
        variant: "destructive",
        title: "Empty Document",
        description: "Add some pages to the target document before downloading.",
      });
    }
  }, [targetPages.length, openTipsDialog, toast]);

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

  const handlePreviewClick = useCallback((docId: UniqueId, pageIndex: number, targetPageId: UniqueId | null) => {
    const sourceDoc = sourceDocs[docId];
    if (!sourceDoc) return;
    setPreviewInfo({ docId, pageNumber: pageIndex + 1, targetPageId });
    setIsPreviewOpen(true);
  }, [sourceDocs]);
  
  const addPageToTarget = useCallback((docId: UniqueId, pageIndex: number) => {
    const sourceDoc = sourceDocs[docId];
    if (!sourceDoc) return;
    
    const newPage: TargetPage = {
      id: `target-${docId}-${pageIndex}-${getUniqueId()}`,
      docId: docId,
      originalPageIndex: pageIndex,
      annotations: [],
    };
    setTargetPages((pages) => [...pages, newPage]);
    toast({
      title: `Page Added from "${sourceDoc.filename}"`,
      description: `Page ${pageIndex + 1} was added to the new document.`,
    });
  }, [sourceDocs, toast]);
  
  const handleAddPageFromPreview = useCallback(() => {
    if (!previewInfo || previewInfo.targetPageId) return; // Only for source previews
    addPageToTarget(previewInfo.docId, previewInfo.pageNumber - 1);
  }, [previewInfo, addPageToTarget]);

  const handleSourcePageDoubleClick = useCallback((
    docId: UniqueId,
    pageIndex: number
  ) => {
    addPageToTarget(docId, pageIndex);
  }, [addPageToTarget]);

  const addAllPagesFromSource = useCallback((docId: UniqueId) => {
    const sourceDoc = sourceDocs[docId];
    if (!sourceDoc) return;

    const newPages: TargetPage[] = Array.from({
      length: sourceDoc.doc.getPageCount(),
    }).map((_, i) => ({
      id: `target-${docId}-${i}-${getUniqueId()}`,
      docId: docId,
      originalPageIndex: i,
      annotations: [],
    }));

    setTargetPages((pages) => [...pages, ...newPages]);

    toast({
      title: "Pages Added",
      description: `All pages from "${sourceDoc.filename}" have been added to the new document.`,
    });
  }, [sourceDocs, toast]);

  const openSignaturePad = useCallback((
    targetPageId: UniqueId,
    docId: UniqueId,
    pageIndex: number
  ) => {
    setIsPreviewOpen(false); // Close preview before opening another dialog
    setSigningPageInfo({ targetPageId, docId, pageIndex });
    setIsSignatureDialogOpen(true);
  }, []);

  const handleUpdateTargetPageAnnotations = useCallback((targetPageId: string, annotations: Annotation[]) => {
      setTargetPages(prevPages =>
          prevPages.map(page =>
              page.id === targetPageId ? { ...page, annotations } : page
          )
      );
  }, []);

  const handleSaveSignature = useCallback(async (
    signatureImage: string,
    position: SignaturePosition = 'right',
    xOffset: number = 0,
    yOffset: number = 0
  ) => {
    if (!signingPageInfo) return;
    const { docId, pageIndex, targetPageId } = signingPageInfo;
    const originalSourceDoc = sourceDocs[docId];
    if (!originalSourceDoc) return;

    setIsLoading(true);
    setLoadingMessage("Adding Signature...");
    try {
        const tempImg = new Image();
        tempImg.src = signatureImage;
        await new Promise(resolve => { 
          if(tempImg.complete) {
            resolve(true);
          } else {
            tempImg.onload = resolve;
          }
        });
        
        const signatureWidth = 160;
        const signatureHeight = (tempImg.height / tempImg.width) * signatureWidth;

        const page = await originalSourceDoc.pdfjsDoc.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = 800;
        const scale = containerWidth / viewport.width;
        const containerHeight = viewport.height * scale;

        const margin = 40;
        let x: number;
        switch (position) {
            case "left": x = margin; break;
            case "center": x = (containerWidth - signatureWidth) / 2; break;
            case "right":
            default:
                x = containerWidth - signatureWidth - margin; break;
        }
        let y = containerHeight - signatureHeight - margin;

        setTargetPages(prev => prev.map(p => {
            if (p.id === targetPageId) {
                const newAnnotations = [...(p.annotations || [])];
                newAnnotations.push({
                    id: getUniqueId('sig'),
                    type: 'signature',
                    x: Math.round(x + (xOffset || 0)),
                    y: Math.round(y + (yOffset || 0)),
                    width: Math.round(signatureWidth),
                    height: Math.round(signatureHeight),
                    dataUrl: signatureImage,
                });
                return { ...p, annotations: newAnnotations };
            }
            return p;
        }));

      toast({
        title: "Signature Placed",
        description: `Signature placed on page ${pageIndex + 1}.`,
      });
    } catch (error) {
      console.error("Failed to add signature:", error);
      toast({
        variant: "destructive",
        title: "Error Adding Signature",
        description: "There was an issue adding the signature.",
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
      setIsSignatureDialogOpen(false);
      setSigningPageInfo(null);
    }
  }, [signingPageInfo, sourceDocs, toast]);

  const openAnnotationPage = useCallback((
    targetPageId: UniqueId,
    docId: UniqueId,
    pageIndex: number
  ) => {
    setIsPreviewOpen(false); // Close preview before opening another dialog
    setAnnotatingPageInfo({ targetPageId, docId, pageIndex });
    setIsAnnotationPageOpen(true);
  }, []);

  const handleSaveAnnotations = useCallback((updatedAnnotations: Annotation[]) => {
    if (!annotatingPageInfo) return;
    const { targetPageId, pageIndex } = annotatingPageInfo;

    // Save annotations non-destructively directly to the target page
    setTargetPages(prevPages =>
        prevPages.map(page =>
            page.id === targetPageId ? { ...page, annotations: updatedAnnotations } : page
        )
    );

    toast({
      title: "Annotations Saved",
      description: `Your annotations for page ${pageIndex + 1} have been saved.`,
    });
    setIsAnnotationPageOpen(false);
    setAnnotatingPageInfo(null);
  }, [annotatingPageInfo, toast]);
  
  // Stable versions of callbacks for children to prevent infinite render loops
  const handleCloseAnnotation = useCallback(() => {
    setIsAnnotationPageOpen(false);
    setAnnotatingPageInfo(null);
  }, []);

  const handleAnnotationsChangeWrapper = useCallback((annotations: Annotation[]) => {
    if (!annotatingPageInfo) return;
    handleUpdateTargetPageAnnotations(annotatingPageInfo.targetPageId, annotations);
  }, [annotatingPageInfo, handleUpdateTargetPageAnnotations]);

  const handleRotatePage = useCallback(async (direction: 'left' | 'right') => {
    if (!previewInfo) return;
    const { docId, pageNumber } = previewInfo;
    const sourceDoc = sourceDocs[docId];
    if (!sourceDoc) return;

    setIsLoading(true);
    setLoadingMessage("Rotating page...");
    try {
        const newPdfDoc = await sourceDoc.doc.copy();
        const page = newPdfDoc.getPage(pageNumber - 1);
        const currentRotation = page.getRotation().angle;
        const rotationAngle = direction === 'right' ? 90 : -90;
        
        let newAngle = (currentRotation + rotationAngle) % 360;
        if (newAngle < 0) newAngle += 360;

        page.setRotation({ type: RotationTypes.Degrees, angle: newAngle });

        await updateSourceDoc(docId, newPdfDoc);
        
        // Force refresh by toggling state
        setIsPreviewOpen(false);
        setTimeout(() => setIsPreviewOpen(true), 100);

        toast({ title: 'Page Rotated', description: `Page ${pageNumber} was rotated.`});

    } catch (e) {
        console.error("Failed to rotate page", e);
        toast({ variant: 'destructive', title: 'Rotation Failed', description: 'Could not rotate the page.' });
    } finally {
        setIsLoading(false);
        setLoadingMessage("");
    }
  }, [previewInfo, sourceDocs, updateSourceDoc, toast]);

  const handleNavigatePreview = useCallback((direction: 'prev' | 'next') => {
    if (!previewInfo) return;

    if (previewInfo.targetPageId) { // We are in target page preview
        const currentIndex = targetPages.findIndex(p => p.id === previewInfo.targetPageId);
        if (currentIndex === -1) return;

        const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        if (newIndex >= 0 && newIndex < targetPages.length) {
            const newTargetPage = targetPages[newIndex];
            setPreviewInfo({
                docId: newTargetPage.docId,
                pageNumber: newTargetPage.originalPageIndex + 1,
                targetPageId: newTargetPage.id,
            });
        }
    } else { // We are in source page preview
        const sourceDoc = sourceDocs[previewInfo.docId];
        if (!sourceDoc) return;

        const totalPages = sourceDoc.doc.getPageCount();
        const currentPageNumber = previewInfo.pageNumber;
        const newPageNumber = direction === 'next' ? currentPageNumber + 1 : currentPageNumber - 1;

        if (newPageNumber > 0 && newPageNumber <= totalPages) {
            setPreviewInfo({
                ...previewInfo,
                pageNumber: newPageNumber,
            });
        }
    }
  }, [previewInfo, targetPages, sourceDocs]);

  const handleStartOptimization = useCallback(async () => {
    if (!optimizationInfo) return;
    const { pdfBytes, fileName } = optimizationInfo;
    const tempFile = new File([pdfBytes as any], fileName, { type: "application/pdf" });

    setIsLoading(true);
    setLoadingMessage("Optimizing PDF, please wait...");
    try {
        const optimizedBytes = await optimizePdf(tempFile, {
            maxWidth: 1600,
            quality: optimizationQuality / 100,
            onProgress: (current, total) => {
                setOptimizationProgress((current / total) * 100);
            }
        });
        
        const optimizedFileName = fileName.replace('.pdf', '-optimized.pdf');
        downloadBlob(optimizedBytes, optimizedFileName, "application/pdf");

        toast({
            title: "Optimization Complete",
            description: "Your optimized PDF has been downloaded.",
        });

    } catch (error: any) {
        console.error("Client-side optimization failed:", error);
        toast({
            variant: "destructive",
            title: "Optimization Failed",
            description: error.message || "Could not optimize the PDF.",
        });
    } finally {
        setIsLoading(false);
        setLoadingMessage("");
        setIsOptimizationDialogOpen(false);
        setOptimizationInfo(null);
        setOptimizationProgress(0);
    }
 }, [optimizationInfo, optimizationQuality, toast]);


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
          <Card 
            className="flex flex-col shrink-0 gap-4 bg-white/20 dark:bg-black/20 border border-black/5 dark:border-white/5 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }}
            onDrop={handleFileDrop}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="font-headline text-lg font-bold tracking-tight">Source Docs</CardTitle>
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
                                  onPreview={() => handlePreviewClick(id, i, null)}
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
                        Click the buttons or drag &amp; drop files here.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Target Pane */}
          <Card className="flex flex-col shrink-0 gap-4 bg-white/20 dark:bg-black/20 border border-black/5 dark:border-white/5 backdrop-blur-md shadow-xl rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl">
            <CardHeader className="p-4 pb-2 shrink-0 gap-4">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="font-headline text-lg font-bold tracking-tight">Target Doc</CardTitle>
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
                        variant="secondary"
                        onClick={handleConvertToWord}
                        disabled={isLoading || targetPages.length === 0}
                      >
                        {isLoading &&
                        loadingMessage === "Converting to Word..." ? (
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        Export
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Exports text content to a .docx file. Best for
                        text-based documents. Complex layouts, tables, and
                        colors will be lost.
                      </p>
                    </TooltipContent>
                  </Tooltip>
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
                <ScrollArea className="h-[52vh] rounded-2xl border border-black/5 dark:border-white/5 bg-white/10 dark:bg-black/10">
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
                            annotations={page.annotations}
                            onDelete={deleteTargetPage}
                            onPreview={() =>
                              handlePreviewClick(
                                page.docId,
                                page.originalPageIndex,
                                page.id
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
                        {isLoading && loadingMessage ? (
                          <div className="flex flex-col items-center">
                            <Loader className="h-8 w-8 animate-spin mb-4" />
                            <p className="font-semibold">{loadingMessage}</p>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold">Drag pages here</p>
                            <p className="text-sm">
                              or load a base PDF to start.
                            </p>
                          </>
                        )}
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
          onClose={handleCloseAnnotation}
          pdfDoc={sourceDocs[annotatingPageInfo.docId].doc}
          pageIndex={annotatingPageInfo.pageIndex}
          initialAnnotations={targetPages.find(p => p.id === annotatingPageInfo.targetPageId)?.annotations || []}
          onSave={handleSaveAnnotations}
          onAnnotationsChange={handleAnnotationsChangeWrapper}
        />
      )}
       {isOptimizationDialogOpen && optimizationInfo && (
        <OptimizationDialog
          isOpen={isOptimizationDialogOpen}
          onClose={() => setIsOptimizationDialogOpen(false)}
          onConfirm={handleStartOptimization}
          onDownloadOriginal={() => downloadBlob(optimizationInfo.pdfBytes, optimizationInfo.fileName, "application/pdf")}
          fileSize={optimizationInfo.pdfBytes.length}
          isLoading={isLoading}
          progress={optimizationProgress}
        />
      )}
      {previewInfo && (
        <PagePreviewDialog
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          pdfDocProxy={sourceDocs[previewInfo.docId]?.pdfjsDoc ?? null}
          pageNumber={previewInfo.pageNumber}
          isTargetPage={!!previewInfo.targetPageId}
          annotations={
            previewInfo.targetPageId
              ? targetPages.find((p) => p.id === previewInfo.targetPageId)?.annotations || []
              : []
          }
          onSign={() => {
            if (previewInfo.targetPageId) {
                openSignaturePad(previewInfo.targetPageId, previewInfo.docId, previewInfo.pageNumber - 1)
            }
          }}
          onAnnotate={() => {
             if (previewInfo.targetPageId) {
                openAnnotationPage(previewInfo.targetPageId, previewInfo.docId, previewInfo.pageNumber - 1)
            }
          }}
          onRotateRight={() => handleRotatePage('right')}
          onRotateLeft={() => handleRotatePage('left')}
          onSelectAndDrop={handleAddPageFromPreview}
          onNavigate={handleNavigatePreview}
          totalPages={previewInfo.targetPageId ? targetPages.length : sourceDocs[previewInfo.docId]?.doc.getPageCount() || 0}
          optimizationQuality={optimizationQuality}
          setOptimizationQuality={setOptimizationQuality}
        />
      )}
    </TooltipProvider>
  );
}
