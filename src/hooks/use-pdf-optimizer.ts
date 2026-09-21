"use client";

import { useState, useCallback } from "react";
import { optimizePdf, downloadBlob } from "@/services/client-pdf-optimizer.service";
import { useToast } from "@/hooks/use-toast";

export interface OptimizationInfo {
  pdfBytes: Uint8Array;
  fileName: string;
}

export function usePdfOptimizer({
  setIsLoading,
  setLoadingMessage,
}: {
  setIsLoading: (loading: boolean) => void;
  setLoadingMessage: (msg: string) => void;
}) {
  const { toast } = useToast();
  const [isOptimizationDialogOpen, setIsOptimizationDialogOpen] = useState(false);
  const [optimizationInfo, setOptimizationInfo] = useState<OptimizationInfo | null>(null);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizationQuality, setOptimizationQuality] = useState(75);

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
        },
      });

      const optimizedFileName = fileName.replace(".pdf", "-optimized.pdf");
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
  }, [optimizationInfo, optimizationQuality, setIsLoading, setLoadingMessage, toast]);

  const handleDownloadOriginal = useCallback(() => {
    if (!optimizationInfo) return;
    downloadBlob(optimizationInfo.pdfBytes, optimizationInfo.fileName, "application/pdf");
    setIsOptimizationDialogOpen(false);
    setOptimizationInfo(null);
  }, [optimizationInfo]);

  return {
    isOptimizationDialogOpen,
    setIsOptimizationDialogOpen,
    optimizationInfo,
    setOptimizationInfo,
    optimizationProgress,
    setOptimizationProgress,
    optimizationQuality,
    setOptimizationQuality,
    handleStartOptimization,
    handleDownloadOriginal,
  };
}
