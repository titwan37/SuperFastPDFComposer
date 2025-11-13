import { PdfComposer } from "@/components/pdf-composer";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center bg-background p-4 pt-12 font-body text-foreground md:p-8 md:pt-16">
        <div className="w-full max-w-screen-2xl">
          <header className="mb-8 text-center">
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary sm:text-5xl lg:text-6xl">
              PDF Composer
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Visually split, reorder, and merge PDF pages with a simple
              drag-and-drop interface. All processing is done securely in your
              browser.
            </p>
          </header>
          <PdfComposer />
        </div>
      </main>
      <Toaster />
    </>
  );
}
