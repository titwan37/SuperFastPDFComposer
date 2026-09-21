"use client";

export function PageFooter({
  openTipsDialog,
}: {
  openTipsDialog: () => void;
}) {
  return (
    <footer
      className="w-full mt-12 p-6 rounded-2xl bg-white/15 dark:bg-black/10 border border-black/5 dark:border-white/5 backdrop-blur-sm text-center text-xs text-muted-foreground/80 font-medium font-body shadow-sm"
    >
      <p className="flex flex-wrap justify-center items-center gap-2 md:gap-3">
        <span>Created with TypeScript + Tailwind + Next.js + ShadCN UI + Lucide React.</span>
        <span className="hidden md:inline text-muted-foreground/30">•</span>
        <button
          onClick={openTipsDialog}
          className="px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200 hover:scale-105"
        >
          Give me tips
        </button>
        <span className="hidden md:inline text-muted-foreground/30">•</span>
        <span>Credits: Antoine Falempin.</span>
        <span className="hidden md:inline text-muted-foreground/30">•</span>
        <a
          href="mailto:titwan.jobs@gmail.com"
          className="px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground transition-all duration-200 hover:scale-105"
        >
          Contact
        </a>
      </p>
    </footer>
  );
}
