import { PdfComposer } from "@/components/pdf-composer";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center bg-background p-4 pt-12 font-body text-foreground md:p-8 md:pt-16">
        <div className="w-full max-w-screen-2xl">
          <header className="mb-8 text-center">
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
              PDF Composer
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-base text-muted-foreground">
              Load, reorder, drag-and-drop and compose visually your new PDF document. 
              All processing is done securely in your own browser.
              No leak, no fees.
            </p>
          </header>
          <PdfComposer />
        </div>
      </main>
      <Toaster />
    </>
  );
}
