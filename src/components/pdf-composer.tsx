"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { PDFDocument, RotationTypes } from "pdf-lib";
import { Loader } from "lucide-react";
import type { SignaturePosition, Annotation } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { SignatureDialog } from "./signature-dialog";
import { AnnotationPage } from "./annotation-page";
import { PagePreviewDialog } from "./page-preview-dialog";
import { OptimizationDialog } from "./optimization-dialog";
import { PageThumbnail } from "./composer/page-thumbnail";
import { SourceDocumentsPanel } from "./composer/source-documents-panel";
import { TargetDocumentPanel } from "./composer/target-document-panel";
import { usePdfComposerState, getUniqueId } from "@/hooks/use-pdf-composer-state";
import { usePdfOptimizer } from "@/hooks/use-pdf-optimizer";
import { downloadBlob } from "@/services/client-pdf-optimizer.service";
import { applyNativeAnnotationsToPdfPage } from "@/lib/pdf-annotation-renderer";
import { generateOCGDictionary, DEFAULT_PDF_LAYERS } from "@/services/pdf-layer-manager";
import { exportTargetPagesToWord } from "@/services/docx-exporter.service";

const OPTIMIZATION_THRESHOLD_BYTES = 6 * 1024 * 1024; // 6MB

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

  const {
    sourceDocs,
    targetPages,
    setTargetPages,
    sourceThumbnailScale,
    setSourceThumbnailScale,
    targetThumbnailScale,
    setTargetThumbnailScale,
    activeId,
    isDraggingOver,
    setIsDraggingOver,
    updateSourceDoc,
    handleFiles,
    deleteTargetPage,
    deleteSourceDoc,
    handleDragStart,
    handleDragEnd,
    addPageToTarget,
    addAllPagesFromSource,
    handleUpdateTargetPageAnnotations,
  } = usePdfComposerState({ setIsLoading, setLoadingMessage });

  const {
    isOptimizationDialogOpen,
    setIsOptimizationDialogOpen,
    optimizationInfo,
    setOptimizationInfo,
    optimizationProgress,
    optimizationQuality,
    setOptimizationQuality,
    handleStartOptimization,
    handleDownloadOriginal,
  } = usePdfOptimizer({ setIsLoading, setLoadingMessage });

  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [signingPageInfo, setSigningPageInfo] = useState<{
    targetPageId: string;
    docId: string;
    pageIndex: number;
  } | null>(null);

  const [isAnnotationPageOpen, setIsAnnotationPageOpen] = useState(false);
  const [annotatingPageInfo, setAnnotatingPageInfo] = useState<{
    targetPageId: string;
    docId: string;
    pageIndex: number;
  } | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<{
    docId: string;
    pageNumber: number;
    targetPageId: string | null;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: "target-droppable-area",
  });

  const handleTargetFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    (async () => {
      setIsLoading(true);
      setLoadingMessage("Adding pages to document...");
      try {
        for (const file of Array.from(files)) {
          if (file.type === "application/pdf") {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const newSourceDoc = {
              id: getUniqueId(),
              doc: pdfDoc,
              pdfjsDoc: await (
                await import("pdfjs-dist/legacy/build/pdf.mjs")
              ).getDocument({ data: arrayBuffer }).promise,
              file,
              filename: file.name,
              thumbnailUrls: Array(pdfDoc.getPageCount()).fill(undefined),
            };
            const newPages = Array.from({
              length: newSourceDoc.doc.getPageCount(),
            }).map((_, i) => ({
              id: `target-${newSourceDoc.id}-${i}-${getUniqueId()}`,
              docId: newSourceDoc.id,
              originalPageIndex: i,
              annotations: [],
            }));
            setTargetPages((prev) => [...prev, ...newPages]);
          }
        }
      } catch (error) {
        console.error("Failed to add target document:", error);
        toast({
          variant: "destructive",
          title: "Error Adding Pages",
          description: "Could not add pages directly to the target document.",
        });
      } finally {
        setIsLoading(false);
        setLoadingMessage("");
      }
    })();
    event.target.value = "";
  };

  const handleDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
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
      const ocgMap = generateOCGDictionary(newPdfDoc, DEFAULT_PDF_LAYERS);

      for (const targetPage of targetPages) {
        const sourceDocData = sourceDocs[targetPage.docId];
        if (sourceDocData?.doc) {
          const [copiedPage] = await newPdfDoc.copyPages(sourceDocData.doc, [
            targetPage.originalPageIndex,
          ]);

          if (targetPage.annotations && targetPage.annotations.length > 0) {
            await applyNativeAnnotationsToPdfPage(
              copiedPage,
              targetPage.annotations,
              newPdfDoc,
              ocgMap
            );
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
  }, [
    targetPages,
    sourceDocs,
    setOptimizationInfo,
    setIsOptimizationDialogOpen,
    toast,
  ]);

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
      await exportTargetPagesToWord(targetPages, sourceDocs);
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

  const getActivePageData = useCallback(() => {
    if (!activeId) return { pageNumber: "", thumbnailUrl: undefined };

    if (activeId.startsWith("source-")) {
      const [, docId, pageIndexStr] = activeId.split("-");
      const pageIndex = parseInt(pageIndexStr, 10);
      const sourceDoc = sourceDocs[docId];
      return {
        pageNumber: pageIndex + 1,
        thumbnailUrl: sourceDoc?.thumbnailUrls[pageIndex],
      };
    }

    if (activeId.startsWith("target-")) {
      const targetIndex = targetPages.findIndex((p) => p.id === activeId);
      const targetPage = targetPages[targetIndex];
      const sourceDoc = targetPage ? sourceDocs[targetPage.docId] : undefined;
      return {
        pageNumber: targetIndex + 1,
        thumbnailUrl: sourceDoc?.thumbnailUrls[targetPage?.originalPageIndex],
      };
    }

    return { pageNumber: "", thumbnailUrl: undefined };
  }, [activeId, sourceDocs, targetPages]);

  const handlePreviewClick = useCallback(
    (docId: string, pageIndex: number, targetPageId: string | null = null) => {
      const sourceDoc = sourceDocs[docId];
      if (!sourceDoc) return;
      setPreviewInfo({ docId, pageNumber: pageIndex + 1, targetPageId });
      setIsPreviewOpen(true);
    },
    [sourceDocs]
  );

  const handleAddPageFromPreview = useCallback(() => {
    if (!previewInfo || previewInfo.targetPageId) return;
    addPageToTarget(previewInfo.docId, previewInfo.pageNumber - 1);
  }, [previewInfo, addPageToTarget]);

  const handleSourcePageDoubleClick = useCallback(
    (docId: string, pageIndex: number) => {
      addPageToTarget(docId, pageIndex);
    },
    [addPageToTarget]
  );

  const openSignaturePad = useCallback(
    (targetPageId: string, docId: string, pageIndex: number) => {
      setIsPreviewOpen(false);
      setSigningPageInfo({ targetPageId, docId, pageIndex });
      setIsSignatureDialogOpen(true);
    },
    []
  );

  const handleSaveSignature = useCallback(
    async (
      signatureImage: string,
      position: SignaturePosition = "right",
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
        await new Promise((resolve) => {
          if (tempImg.complete) {
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
          case "left":
            x = margin;
            break;
          case "center":
            x = (containerWidth - signatureWidth) / 2;
            break;
          case "right":
          default:
            x = containerWidth - signatureWidth - margin;
            break;
        }
        const y = containerHeight - signatureHeight - margin;

        setTargetPages((prev) =>
          prev.map((p) => {
            if (p.id === targetPageId) {
              const newAnnotations = [...(p.annotations || [])];
              newAnnotations.push({
                id: getUniqueId("sig"),
                type: "signature",
                x: Math.round(x + (xOffset || 0)),
                y: Math.round(y + (yOffset || 0)),
                width: Math.round(signatureWidth),
                height: Math.round(signatureHeight),
                dataUrl: signatureImage,
              });
              return { ...p, annotations: newAnnotations };
            }
            return p;
          })
        );

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
    },
    [signingPageInfo, sourceDocs, setTargetPages, toast]
  );

  const openAnnotationPage = useCallback(
    (targetPageId: string, docId: string, pageIndex: number) => {
      setIsPreviewOpen(false);
      setAnnotatingPageInfo({ targetPageId, docId, pageIndex });
      setIsAnnotationPageOpen(true);
    },
    []
  );

  const handleSaveAnnotations = useCallback(
    (updatedAnnotations: Annotation[]) => {
      if (!annotatingPageInfo) return;
      const { targetPageId, pageIndex } = annotatingPageInfo;

      setTargetPages((prevPages) =>
        prevPages.map((page) =>
          page.id === targetPageId
            ? { ...page, annotations: updatedAnnotations }
            : page
        )
      );

      toast({
        title: "Annotations Saved",
        description: `Your annotations for page ${pageIndex + 1} have been saved.`,
      });
      setIsAnnotationPageOpen(false);
      setAnnotatingPageInfo(null);
    },
    [annotatingPageInfo, setTargetPages, toast]
  );

  const handleCloseAnnotation = useCallback(() => {
    setIsAnnotationPageOpen(false);
    setAnnotatingPageInfo(null);
  }, []);

  const handleAnnotationsChangeWrapper = useCallback(
    (annotations: Annotation[]) => {
      if (!annotatingPageInfo) return;
      handleUpdateTargetPageAnnotations(
        annotatingPageInfo.targetPageId,
        annotations
      );
    },
    [annotatingPageInfo, handleUpdateTargetPageAnnotations]
  );

  const handleRotatePage = useCallback(
    async (direction: "left" | "right") => {
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
        const rotationAngle = direction === "right" ? 90 : -90;

        let newAngle = (currentRotation + rotationAngle) % 360;
        if (newAngle < 0) newAngle += 360;

        page.setRotation({ type: RotationTypes.Degrees, angle: newAngle });

        await updateSourceDoc(docId, newPdfDoc);

        setIsPreviewOpen(false);
        setTimeout(() => setIsPreviewOpen(true), 100);

        toast({
          title: "Page Rotated",
          description: `Page ${pageNumber} was rotated.`,
        });
      } catch (e) {
        console.error("Failed to rotate page", e);
        toast({
          variant: "destructive",
          title: "Rotation Failed",
          description: "Could not rotate the page.",
        });
      } finally {
        setIsLoading(false);
        setLoadingMessage("");
      }
    },
    [previewInfo, sourceDocs, updateSourceDoc, toast]
  );

  const handleNavigatePreview = useCallback(
    (direction: "prev" | "next") => {
      if (!previewInfo) return;

      if (previewInfo.targetPageId) {
        const currentIndex = targetPages.findIndex(
          (p) => p.id === previewInfo.targetPageId
        );
        if (currentIndex === -1) return;

        const newIndex =
          direction === "next" ? currentIndex + 1 : currentIndex - 1;

        if (newIndex >= 0 && newIndex < targetPages.length) {
          const newTargetPage = targetPages[newIndex];
          setPreviewInfo({
            docId: newTargetPage.docId,
            pageNumber: newTargetPage.originalPageIndex + 1,
            targetPageId: newTargetPage.id,
          });
        }
      } else {
        const sourceDoc = sourceDocs[previewInfo.docId];
        if (!sourceDoc) return;

        const totalPages = sourceDoc.doc.getPageCount();
        const currentPageNumber = previewInfo.pageNumber;
        const newPageNumber =
          direction === "next" ? currentPageNumber + 1 : currentPageNumber - 1;

        if (newPageNumber > 0 && newPageNumber <= totalPages) {
          setPreviewInfo({
            ...previewInfo,
            pageNumber: newPageNumber,
          });
        }
      }
    },
    [previewInfo, targetPages, sourceDocs]
  );

  const activePageData = getActivePageData();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative min-h-[75vh] w-full">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-3xl bg-background/60 backdrop-blur-md transition-all animate-in fade-in duration-300">
            <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-card border shadow-2xl space-y-4">
              <Loader className="h-10 w-10 animate-spin text-primary" />
              <p className="font-semibold text-foreground tracking-wide">
                {loadingMessage || "Processing..."}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          <SourceDocumentsPanel
            sourceDocs={sourceDocs}
            sourceThumbnailScale={sourceThumbnailScale}
            setSourceThumbnailScale={setSourceThumbnailScale}
            isDraggingOver={isDraggingOver}
            setIsDraggingOver={setIsDraggingOver}
            onDropFiles={handleDropFiles}
            onFilesSelected={handleFiles}
            onDeleteSourceDoc={deleteSourceDoc}
            onAddAllPagesFromSource={addAllPagesFromSource}
            onPreviewClick={(docId, pageIndex) =>
              handlePreviewClick(docId, pageIndex, null)
            }
            onSourcePageDoubleClick={handleSourcePageDoubleClick}
          />

          <TargetDocumentPanel
            targetPages={targetPages}
            sourceDocs={sourceDocs}
            targetThumbnailScale={targetThumbnailScale}
            setTargetThumbnailScale={setTargetThumbnailScale}
            setDroppableNodeRef={setDroppableNodeRef}
            isOver={isOver}
            onDownloadClick={handleDownloadClick}
            onConvertToWord={handleConvertToWord}
            onClearTargetPages={() => setTargetPages([])}
            onDeleteTargetPage={deleteTargetPage}
            onPreviewClick={(docId, pageIndex, targetPageId) =>
              handlePreviewClick(docId, pageIndex, targetPageId)
            }
            onAnnotateClick={(docId, pageIndex, targetPageId) =>
              openAnnotationPage(targetPageId, docId, pageIndex)
            }
            onTargetFileUpload={handleTargetFileUpload}
          />
        </div>

        <DragOverlay>
          {activeId ? (
            <div
              style={{
                width: `${
                  90 *
                  (activeId.startsWith("source")
                    ? sourceThumbnailScale
                    : targetThumbnailScale)
                }px`,
              }}
            >
              <PageThumbnail
                pageNumber={activePageData.pageNumber}
                thumbnailUrl={activePageData.thumbnailUrl}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>

        {/* Modal Dialogs */}
        <PagePreviewDialog
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          pdfDocProxy={
            previewInfo ? sourceDocs[previewInfo.docId]?.pdfjsDoc || null : null
          }
          pageNumber={previewInfo ? previewInfo.pageNumber : 1}
          isTargetPage={!!previewInfo?.targetPageId}
          onRotateLeft={() => handleRotatePage("left")}
          onRotateRight={() => handleRotatePage("right")}
          onSelectAndDrop={handleAddPageFromPreview}
          onNavigate={handleNavigatePreview}
          totalPages={
            previewInfo
              ? previewInfo.targetPageId
                ? targetPages.length
                : sourceDocs[previewInfo.docId]?.doc.getPageCount() || 1
              : 1
          }
          optimizationQuality={optimizationQuality}
          setOptimizationQuality={setOptimizationQuality}
          onSign={
            previewInfo?.targetPageId
              ? () =>
                  openSignaturePad(
                    previewInfo.targetPageId!,
                    previewInfo.docId,
                    previewInfo.pageNumber - 1
                  )
              : () => {}
          }
          onAnnotate={
            previewInfo?.targetPageId
              ? () =>
                  openAnnotationPage(
                    previewInfo.targetPageId!,
                    previewInfo.docId,
                    previewInfo.pageNumber - 1
                  )
              : () => {}
          }
          annotations={
            previewInfo?.targetPageId
              ? targetPages.find((p) => p.id === previewInfo.targetPageId)
                  ?.annotations
              : undefined
          }
        />

        <SignatureDialog
          isOpen={isSignatureDialogOpen}
          onClose={() => {
            setIsSignatureDialogOpen(false);
            setSigningPageInfo(null);
          }}
          onSave={handleSaveSignature}
        />

        {annotatingPageInfo && sourceDocs[annotatingPageInfo.docId] && (
          <AnnotationPage
            isOpen={isAnnotationPageOpen}
            onClose={handleCloseAnnotation}
            onSave={handleSaveAnnotations}
            pdfDoc={sourceDocs[annotatingPageInfo.docId].doc}
            pageIndex={annotatingPageInfo.pageIndex}
            initialAnnotations={
              targetPages.find(
                (p) => p.id === annotatingPageInfo.targetPageId
              )?.annotations || []
            }
            onAnnotationsChange={handleAnnotationsChangeWrapper}
          />
        )}

        {optimizationInfo && (
          <OptimizationDialog
            isOpen={isOptimizationDialogOpen}
            onClose={() => setIsOptimizationDialogOpen(false)}
            onConfirm={handleStartOptimization}
            onDownloadOriginal={handleDownloadOriginal}
            fileSize={optimizationInfo.pdfBytes.length}
            progress={optimizationProgress}
            isLoading={isLoading}
          />
        )}
      </div>
    </DndContext>
  );
}
