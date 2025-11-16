"use client";

import { useState } from "react";
import { PdfComposer } from "@/components/pdf-composer";
import { Toaster } from "@/components/ui/toaster";
import { TipsDialog } from "@/components/tips-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronsDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageFooter } from "@/components/page-footer";

export default function Home() {
  const [isTipsDialogOpen, setIsTipsDialogOpen] = useState(false);
  const [downloadAction, setDownloadAction] = useState<(() => void) | null>(
    null
  );
  const isMobile = useIsMobile();

  const openTipsDialog = () => {
    setIsTipsDialogOpen(true);
  };
  
  const handleConfirm = () => {
    if (downloadAction) {
      downloadAction();
    }
    setDownloadAction(null);
    setIsTipsDialogOpen(false);
  };

  const handleClose = () => {
    setDownloadAction(null);
    setIsTipsDialogOpen(false);
  }

  return (
    <>
      <main className="flex min-h-screen flex-col 
      items-center bg-background p-4 pt-12 
      font-body text-foreground md:p-8 md:pt-16"
        suppressHydrationWarning >
        <div className="w-full max-w-screen-2xl">
          <PageHeader />
          <PdfComposer openTipsDialog={openTipsDialog} setDownloadAction={setDownloadAction} />
        </div>
        {isMobile && (
          <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 md:hidden">
            <ChevronsDown className="h-8 w-8 animate-bounce-y text-primary/70" />
          </div>
        )}
      <PageFooter openTipsDialog={openTipsDialog} />
      </main>
      <Toaster />
       <TipsDialog
        isOpen={isTipsDialogOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </>
  );
}
