import { saveAs } from "file-saver";
import type { Paragraph } from "docx";
import type { TargetPage, SourceDoc } from "@/lib/types";

/**
 * Converts selected target pages into a Microsoft Word (.docx) document.
 * Extracts text from the underlying PDF pages via pdf.js and formats with page breaks.
 */
export async function exportTargetPagesToWord(
  targetPages: TargetPage[],
  sourceDocs: Record<string, SourceDoc>,
  fileName?: string
): Promise<void> {
  const { Document, Packer, Paragraph: DocxParagraph } = await import("docx");
  const paragraphs: Paragraph[] = [];

  for (const targetPage of targetPages) {
    const sourceDocData = sourceDocs[targetPage.docId];
    if (!sourceDocData?.pdfjsDoc) continue;

    const page = await sourceDocData.pdfjsDoc.getPage(targetPage.originalPageIndex + 1);
    const textContent = await page.getTextContent();

    for (const item of textContent.items as { str: string }[]) {
      if (item.str && item.str.trim() !== "") {
        paragraphs.push(new DocxParagraph({ text: item.str }));
      }
    }

    // Insert a page break between pages
    paragraphs.push(new DocxParagraph({ text: "", pageBreakBefore: true }));
  }

  // Remove the trailing page break
  if (paragraphs.length > 0) {
    paragraphs.pop();
  }

  const doc = new Document({
    sections: [
      {
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const resolvedFileName =
    fileName || `composed-document-${new Date().toISOString().split("T")[0]}.docx`;
  saveAs(blob, resolvedFileName);
}
