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

export type SignaturePosition = 'left' | 'center' | 'right';

export type Annotation = TextAnnotation | DrawingAnnotation;

export type TextAnnotation = {
  id: string;
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontColor: string;
  isEditing: boolean;
};

export type DrawingAnnotation = {
  id: string;
  type: 'drawing';
  paths: { x: number; y: number }[][];
  strokeColor: string;
  strokeWidth: number;
};
