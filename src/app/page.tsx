
"use client";

import { useState } from "react";
import { PdfComposer } from "@/components/pdf-composer";
import { Toaster } from "@/components/ui/toaster";
import { TipsDialog } from "@/components/tips-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronsDown } from "lucide-react";

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
      <main
        className="flex min-h-screen flex-col items-center bg-background p-4 pt-12 font-body text-foreground md:p-8 md:pt-16"
        suppressHydrationWarning
      >
        <div className="w-full max-w-screen-2xl">
          <header className="mb-8 text-center">
            <h1 className="font-headline text-xl font-extrabold tracking-tight text-primary sm:text-xl lg:text-2xl">
             SuperFast PDF Composer
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground">
              Load and compose visually your new PDF document.
              Select, double-click, reorder, drag-and-drop, delete, add all.   
              All processing is done securely in your new browser.
            </p>
          </header>
          <PdfComposer openTipsDialog={openTipsDialog} setDownloadAction={setDownloadAction} />
        </div>
        {isMobile && (
          <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 md:hidden">
            <ChevronsDown className="h-8 w-8 animate-bounce-y text-primary/70" />
          </div>
        )}
      </main>
      <footer
        className="w-full p-4 text-center text-sm text-muted-foreground"
        suppressHydrationWarning
      >
        <p>
          Created on Firebase Studio. 
          |{" "}
          <button onClick={() => openTipsDialog()}
            className="text-primary underline-offset-4 hover:underline">
           Give me tips
           </button>
           {" "} | {" "}
          Credits: Antoine Falempin.{" "}
          <a href="mailto:titwan.jobs@gmail.com"
            className="text-primary underline-offset-4 hover:underline">
            Contact
          </a>
          {" "}
        </p>
      </footer>
      <Toaster />
       <TipsDialog
        isOpen={isTipsDialogOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </>
  );
}
