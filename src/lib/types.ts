import type { PDFDocument } from 'pdf-lib';

// Represents a single page in the target composition area
export type TargetPage = {
  id: string; // Unique ID for dnd-kit
  docId: string; // ID of the source document this page belongs to
  originalPageIndex: number; // The page's index in its original document
};

// Represents a loaded source PDF document
export type SourceDoc = {
  id: string; // Unique ID for the document
  doc: PDFDocument;
  filename: string;
  thumbnailUrls: (string | undefined | null)[]; // Array of data URLs for page thumbnails
};
