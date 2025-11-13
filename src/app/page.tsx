import { PdfComposer } from "@/components/pdf-composer";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center bg-background p-4 pt-12 font-body text-foreground md:p-8 md:pt-16">
        <div className="w-full max-w-screen-2xl">
          <header className="mb-8 text-center">
            <h1 className="font-headline text-xl font-extrabold tracking-tight text-primary sm:text-2xl lg:text-3xl">
              PDF Composer
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Load, reorder, drag-and-drop and compose visually your new PDF document. 
              All processing is done securely in your own browser.
              No leak, no fee.
            </p>
          </header>
          <PdfComposer />
        </div>
      </main>
      <footer className="w-full p-4 text-center text-sm text-muted-foreground">
        <p>
          Created by Antoine Falempin.{" "}
          <a
            href="mailto:titwan.jobs@gmail.com"
            className="text-primary underline-offset-4 hover:underline"
          >
            Contact
          </a>
        </p>
      </footer>
      <Toaster />
    </>
  );
}
