import { ThemeSwitcher } from "@/components/theme-switcher";

export function PageHeader() {
  return (
    <header className="mb-8">
      <h1 className="text-center font-headline text-3xl font-extrabold tracking-tight text-primary sm:text-4xl lg:text-5xl">
        SuperFast PDF Composer
      </h1>
      <div className="mt-4 flex items-center justify-between">
        <p className="max-w-xl text-sm text-muted-foreground">
          Visually compose your new PDF. Drag, drop, reorder, merge, edit and sign pages from multiple documents right in your browser.
        </p>
        <div className="flex-shrink-0">
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
