
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Download, Loader } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface OptimizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDownloadOriginal: () => void;
  fileSize: number;
  isLoading: boolean;
  progress: number;
}

export function OptimizationDialog({
  isOpen,
  onClose,
  onConfirm,
  onDownloadOriginal,
  fileSize,
  isLoading,
  progress,
}: OptimizationDialogProps) {

  const handleDownloadOriginal = () => {
    onDownloadOriginal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Optimize PDF?</DialogTitle>
          <DialogDescription>
            Your composed PDF is quite large ({(fileSize / 1024 / 1024).toFixed(2)} MB).
            We can optimize it to reduce the file size, which may take a few moments.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-4 flex flex-col items-center justify-center gap-4 text-center">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <div className="w-full space-y-2">
              <p className="text-sm font-medium">Optimizing PDF...</p>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
            </div>
          </div>
        ) : (
          <div className="py-4 text-sm text-muted-foreground">
            <p>
              Optimization works by converting pages into compressed images. This is great for sharing but may result in a loss of quality and makes the text non-selectable.
            </p>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
           <Button type="button" variant="outline" onClick={handleDownloadOriginal} disabled={isLoading}>
            <Download className="mr-2 h-4 w-4" />
            Download Original
          </Button>
           <Button type="button" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Optimize & Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
