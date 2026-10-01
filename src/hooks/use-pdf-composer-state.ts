"use client";

import { useState, useCallback } from "react";
import {
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { PDFDocument, PageSizes, type PDFImage } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import type { SourceDoc, TargetPage, Annotation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

let uniqueIdCounter = 0;
export const getUniqueId = (prefix: string = "id") =>
  `${prefix}-${Date.now()}-${uniqueIdCounter++}`;

export function usePdfComposerState({
  setIsLoading,
  setLoadingMessage,
}: {
  setIsLoading: (loading: boolean) => void;
  setLoadingMessage: (msg: string) => void;
}) {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const [sourceDocs, setSourceDocs] = useState<Record<string, SourceDoc>>({});
  const [sourceThumbnailScale, setSourceThumbnailScale] = useState(1);

  const [targetPages, setTargetPages] = useState<TargetPage[]>([]);
  const [targetThumbnailScale, setTargetThumbnailScale] = useState(1);
  const [engineMode, setEngineMode] = useState<'native-pdf-lib' | 'wasm-mupdf'>('native-pdf-lib');

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

  const updateSourceDoc = useCallback(
    async (docId: string, newPdfDoc: PDFDocument) => {
      const pdfBytes = await newPdfDoc.save();

      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
      }
      const newPdfjsDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;

      setSourceDocs((prev) => {
        const docToUpdate = prev[docId];
        if (!docToUpdate) return prev;

        const newDoc: SourceDoc = {
          ...docToUpdate,
          doc: newPdfDoc,
          pdfjsDoc: newPdfjsDoc,
          thumbnailUrls: Array(newPdfDoc.getPageCount()).fill(undefined),
        };
        return { ...prev, [docId]: newDoc };
      });

      for (let i = 0; i < newPdfjsDoc.numPages; i++) {
        const thumbnailUrl = await renderPdfPage(newPdfjsDoc, i + 1);
        setSourceDocs((prev) => {
          const currentDoc = prev[docId];
          if (!currentDoc) return prev;
          const updatedThumbnails = [...currentDoc.thumbnailUrls];
          updatedThumbnails[i] = thumbnailUrl;
          return {
            ...prev,
            [docId]: { ...currentDoc, thumbnailUrls: updatedThumbnails },
          };
        });
      }
    },
    []
  );

  const processPdfFile = async (file: File): Promise<SourceDoc> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const docId = getUniqueId();

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
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
    if (file.type === "image/jpeg" || file.type === "image/jpg") {
      image = await pdfDoc.embedJpg(arrayBuffer);
    } else if (file.type === "image/png") {
      image = await pdfDoc.embedPng(arrayBuffer);
    } else {
      toast({
        variant: "destructive",
        title: "Unsupported Image",
        description: `Unsupported image type: ${file.type}. Please use JPG or PNG.`,
      });
      return null;
    }

    const { width: imgW, height: imgH } = image.scale(1);
    const scale = Math.min(pageW / imgW, pageH / imgH);
    const scaledW = imgW * scale;
    const scaledH = imgH * scale;

    page.drawImage(image, {
      x: (pageW - scaledW) / 2,
      y: (pageH - scaledH) / 2,
      width: scaledW,
      height: scaledH,
    });

    const pdfBytes = await pdfDoc.save();
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
    }
    const pdfjsDoc = await pdfjs.getDocument({ data: pdfBytes }).promise;

    const newSourceDoc: SourceDoc = {
      id: docId,
      doc: pdfDoc,
      pdfjsDoc,
      file,
      filename: file.name,
      thumbnailUrls: [null],
    };

    setSourceDocs((prev) => ({ ...prev, [docId]: newSourceDoc }));
    toast({
      title: "Image Added",
      description: `"${file.name}" was converted to a PDF page.`,
    });

    try {
      const thumbnailUrl = await renderPdfPage(pdfjsDoc, 1);
      setSourceDocs((prev) => {
        const updatedDoc = prev[docId];
        if (!updatedDoc) return prev;
        return { ...prev, [docId]: { ...updatedDoc, thumbnailUrls: [thumbnailUrl] } };
      });
    } catch (renderError) {
      console.error(`Failed to render image thumbnail:`, renderError);
    }

    return newSourceDoc;
  };

  const handleFiles = async (files: FileList | File[]) => {
    setIsLoading(true);
    setLoadingMessage("Processing files...");
    try {
      let processedCount = 0;
      for (const file of Array.from(files)) {
        if (file.type === "application/pdf") {
          await processPdfFile(file);
          processedCount++;
        } else if (file.type.startsWith("image/")) {
          const doc = await processImageFile(file);
          if (doc) processedCount++;
        } else {
          toast({
            variant: "destructive",
            title: "Unsupported File",
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

  const deleteTargetPage = useCallback((id: string) => {
    setTargetPages((pages) => pages.filter((p) => p.id !== id));
  }, []);

  const deleteSourceDoc = useCallback((docId: string) => {
    setSourceDocs((currentDocs) => {
      const newDocs = { ...currentDocs };
      delete newDocs[docId];
      return newDocs;
    });
    setTargetPages((currentPages) =>
      currentPages.filter((p) => p.docId !== docId)
    );
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
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
            newPages.splice(overIndex + 1, 0, newPage);
            return newPages;
          }
        }
        return [...pages, newPage];
      });
    }
  }, []);

  const addPageToTarget = useCallback(
    (docId: string, pageIndex: number) => {
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
    },
    [sourceDocs, toast]
  );

  const addAllPagesFromSource = useCallback(
    (docId: string) => {
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
    },
    [sourceDocs, toast]
  );

  const handleUpdateTargetPageAnnotations = useCallback(
    (targetPageId: string, annotations: Annotation[]) => {
      setTargetPages((prevPages) =>
        prevPages.map((page) =>
          page.id === targetPageId ? { ...page, annotations } : page
        )
      );
    },
    []
  );

  return {
    sourceDocs,
    setSourceDocs,
    targetPages,
    setTargetPages,
    sourceThumbnailScale,
    setSourceThumbnailScale,
    targetThumbnailScale,
    setTargetThumbnailScale,
    activeId,
    setActiveId,
    isDraggingOver,
    setIsDraggingOver,
    renderPdfPage,
    updateSourceDoc,
    processPdfFile,
    processImageFile,
    handleFiles,
    deleteTargetPage,
    deleteSourceDoc,
    handleDragStart,
    handleDragEnd,
    addPageToTarget,
    addAllPagesFromSource,
    handleUpdateTargetPageAnnotations,
    engineMode,
    setEngineMode,
  };
}
