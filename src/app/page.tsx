"use client";

import { useState, useEffect } from "react";
import { PdfComposer } from "@/components/pdf-composer";
import { Toaster } from "@/components/ui/toaster";
import { TipsDialog } from "@/components/tips-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronsDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageFooter } from "@/components/page-footer";
import { Loader } from "lucide-react";

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}


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
    <ClientOnly>
      <main className="flex min-h-screen flex-col 
      items-center bg-background p-4 pt-12 
      font-body text-foreground md:p-8 md:pt-16">
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
    </ClientOnly>
  );
}
