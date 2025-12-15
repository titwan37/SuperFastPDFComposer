"use client";

export function PageFooter({
  openTipsDialog,
}: {
  openTipsDialog: () => void;
}) {
  return (
    <footer
      className="w-full p-4 text-center text-sm text-muted-foreground"
    >
      <p>
        Created on Firebase Studio.{" | "}
        <button
          onClick={openTipsDialog}
          className="text-primary underline-offset-4 hover:underline"
        >
          Give me tips
        </button>
        {" | "}
        Credits: Antoine Falempin.{" "}
        <a
          href="mailto:titwan.jobs@gmail.com"
          className="text-primary underline-offset-4 hover:underline"
        >
          Contact
        </a>
      </p>
    </footer>
  );
}
