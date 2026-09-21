import { ThemeSwitcher } from "@/components/theme-switcher";

export function PageHeader() {
  return (
    <header className="p-4 md:p-5 rounded-3xl bg-white/25 dark:bg-black/20 border border-black/5 dark:border-white/5 backdrop-blur-md shadow-xl mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-500 hover:shadow-2xl hover:border-black/10 dark:hover:border-white/10">
      <div className="space-y-2 max-w-2xl">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl bg-gradient-to-r from-io-blue via-io-green to-io-yellow bg-clip-text text-transparent">
          SuperFast PDF Composer
        </h1>
        <p className="text-sm text-muted-foreground/85 font-medium font-body">
          Visually compose your new PDF. Drag, drop, reorder, merge, edit and sign pages from multiple documents right in your browser.
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-3 bg-white/30 dark:bg-white/5 border border-black/5 dark:border-white/5 p-2 rounded-2xl shadow-sm backdrop-blur-sm">
        <span className="text-xs font-bold text-muted-foreground/80 uppercase tracking-widest pl-1 font-headline">Theme</span>
        <ThemeSwitcher />
      </div>
    </header>
  );
}
