import type { PDFDocument } from 'pdf-lib';
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

// PDF Layer interface for Optional Content Groups (OCGs)
export interface PdfLayer {
  id: string;
  name: string;
  isVisible: boolean;
  color?: string;
  isLocked?: boolean;
  defaultSubtype?: PdfAnnotationSubtype;
}

// Native PDF Annotation Subtypes according to ISO 32000-1 / PDF 1.7 & 2.0 specs
export type PdfAnnotationSubtype =
  | '/FreeText'
  | '/Ink'
  | '/Stamp'
  | '/Highlight'
  | '/Underline'
  | '/Square'
  | '/Circle'
  | '/Line'
  | '/Widget'
  | '/Popup';

// Standard UI type aliases mapped to PDF Subtypes
export type AnnotationType =
  | 'text'
  | 'drawing'
  | 'icon'
  | 'signature'
  | 'mask'
  | 'blackout'
  | 'highlighter';

export type HighlighterColor = 'yellow' | 'green' | 'pink' | 'blue';

export interface BaseAnnotation {
  id: string;
  layerId?: string;       // Foreign key mapping to PdfLayer.id (for PDF OCGs)
  isLocked?: boolean;     // Read-only / lock flag (/F 128 /Locked)
  subtype?: PdfAnnotationSubtype; // Explicit native PDF subtype
  opacity?: number;       // Alpha channel /CA /ca (0 to 1)
  flags?: number;         // PDF Annotation flags (/F)
  createdAt?: string;     // ISO Timestamp for /M (Modification date)
  author?: string;        // /T (Title / Author string)
}

// Represents a single page in the target composition area
export type TargetPage = {
  id: string; // Unique ID for dnd-kit
  docId: string; // ID of the source document this page belongs to
  originalPageIndex: number; // The page's index in its original document
  annotations?: Annotation[]; // Optional array of annotations for this page
  rotation?: number; // Optional page rotation in degrees (0, 90, 180, 270)
};

// Represents a loaded source PDF document
export type SourceDoc = {
  id: string; // Unique ID for the document
  doc: PDFDocument; // pdf-lib document for manipulation
  pdfjsDoc: PDFDocumentProxy; // pdf.js document for rendering
  file: File; // The original File object
  filename: string;
  thumbnailUrls: (string | undefined | null)[]; // Array of data URLs for page thumbnails
};

export type SignaturePosition = 'left' | 'center' | 'right';

export type Annotation =
  | TextAnnotation
  | DrawingAnnotation
  | IconAnnotation
  | SignatureAnnotation
  | RedactionMaskAnnotation
  | BlackoutMarkerAnnotation
  | HighlighterAnnotation;

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  subtype?: '/FreeText';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontColor: string;
  fontFamily?: string;
  isEditing: boolean;
  richText?: string;      // XML / HTML / XHTML string for /RC (Rich Content)
  alignment?: 'left' | 'center' | 'right'; // /Q (Quadding: 0=Left, 1=Center, 2=Right)
}

export interface DrawingAnnotation extends BaseAnnotation {
  type: 'drawing';
  subtype?: '/Ink';
  paths: { x: number; y: number }[][]; // Maps to /InkList in PDF
  strokeColor: string;
  strokeWidth: number;
}

export interface IconAnnotation extends BaseAnnotation {
  type: 'icon';
  subtype?: '/Stamp' | '/Square' | '/Circle';
  iconType: 'check' | 'cross';
  x: number;
  y: number;
  size: number;
  strokeColor: string;
  strokeWidth: number;
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: 'signature';
  subtype?: '/Stamp' | '/Widget';
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;       // Base64 image stream for Image XObject
}

export interface RedactionMaskAnnotation extends BaseAnnotation {
  type: 'mask';
  subtype?: '/Square';
  x: number;
  y: number;
  width: number;
  height: number;
  // Strictly white fill, opaque, no border
}

export interface BlackoutMarkerAnnotation extends BaseAnnotation {
  type: 'blackout';
  subtype?: '/Ink';
  paths: { x: number; y: number }[][];
  strokeWidth: number; // e.g. 14-20px for bold marker effect
}

export interface HighlighterAnnotation extends BaseAnnotation {
  type: 'highlighter';
  subtype?: '/Highlight' | '/Ink';
  paths: { x: number; y: number }[][];
  color: HighlighterColor;
  strokeWidth: number; // e.g. 20-26px for stabilo effect
  opacity: number;     // e.g. 0.35
}
