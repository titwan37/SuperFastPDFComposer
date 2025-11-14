"use client";

import { useState } from "react";
import { PdfComposer } from "@/components/pdf-composer";
import { Toaster } from "@/components/ui/toaster";
import { TipsDialog } from "@/components/tips-dialog";

export default function Home() {
  const [isTipsDialogOpen, setIsTipsDialogOpen] = useState(false);
  const [downloadAction, setDownloadAction] = useState<(() => void) | null>(
    null
  );

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
              PDF Composer
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground">
              Load, reorder, drag-and-drop and compose visually your new PDF document. 
              All processing is done securely in your own browser.
              No leak, no fee.
            </p>
          </header>
          <PdfComposer openTipsDialog={openTipsDialog} setDownloadAction={setDownloadAction} />
        </div>
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
