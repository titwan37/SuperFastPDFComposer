
"use client";

import { useState, useCallback, useRef } from "react";
import { PdfComposer } from "@/components/pdf-composer";
import { Toaster } from "@/components/ui/toaster";
import { TipsDialog } from "@/components/tips-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronsDown, Loader } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageFooter } from "@/components/page-footer";
import { ClientOnly } from "@/components/client-only";

function MobileOnlyUi() {
  const isMobile = useIsMobile();
  return (
    <>
      {isMobile && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 md:hidden">
          <ChevronsDown className="h-8 w-8 animate-bounce-y text-primary/70" />
        </div>
      )}
    </>
  );
}

function RainbowBackground() {
  return (
    <>
      {/* Rainbow Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vh] rounded-full bg-[#ff00a2]/15 dark:bg-[#ff00a2]/25 mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob" />
        <div className="absolute top-[10%] -right-[10%] w-[60vw] h-[60vh] rounded-full bg-[#143dff]/15 dark:bg-[#143dff]/25 mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000" />
        <div className="absolute -bottom-[20%] left-[10%] w-[70vw] h-[70vh] rounded-full bg-[#34a853]/10 dark:bg-[#34a853]/15 mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[60vw] h-[60vh] rounded-full bg-[#fbbc04]/10 dark:bg-[#fbbc04]/15 mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-6000" />
        <div className="absolute top-[30%] left-[30%] w-[50vw] h-[50vh] rounded-full bg-[#ea4335]/10 dark:bg-[#ea4335]/15 mix-blend-multiply dark:mix-blend-screen filter blur-[120px] animate-blob animation-delay-3000" />
      </div>
      {/* Glassmorphic overlay */}
      <div className="absolute inset-0 bg-background/50 dark:bg-black/50 backdrop-blur-[100px] z-0 pointer-events-none" />
    </>
  );
}

export default function Home() {
  const [isTipsDialogOpen, setIsTipsDialogOpen] = useState(false);
  const isDownloadIntentRef = useRef(false);
  const [downloadTrigger, setDownloadTrigger] = useState(0);

  const openTipsForDownload = useCallback(() => {
    isDownloadIntentRef.current = true;
    setIsTipsDialogOpen(true);
  }, []);

  const openTipsFromFooter = useCallback(() => {
    isDownloadIntentRef.current = false;
    setIsTipsDialogOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (isDownloadIntentRef.current) {
      setDownloadTrigger(c => c + 1);
    }
    setIsTipsDialogOpen(false);
    isDownloadIntentRef.current = false;
  }, []);

  const handleClose = useCallback(() => {
    setIsTipsDialogOpen(false);
    isDownloadIntentRef.current = false;
  }, []);

  return (
    <main className="relative overflow-hidden z-10 w-full min-h-screen flex flex-col items-center px-4 py-2 font-body text-foreground md:px-6 md:py-3 bg-transparent">
      <RainbowBackground />
      <div className="w-full max-w-screen-2xl relative z-10">
        <PageHeader />
        <ClientOnly fallback={<div className="flex min-h-[75vh] items-center justify-center"><Loader className="h-16 w-16 animate-spin text-primary" /></div>}>
          <PdfComposer
            openTipsDialog={openTipsForDownload}
            downloadTrigger={downloadTrigger}
          />
          <MobileOnlyUi />
          <PageFooter openTipsDialog={openTipsFromFooter} />
        </ClientOnly>
      </div>

      <Toaster />
      <ClientOnly>
        <TipsDialog
          isOpen={isTipsDialogOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
        />
      </ClientOnly>
    </main>
  );
}

