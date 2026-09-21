
"use client";

import { PDFDocument } from 'pdf-lib';

/**
 * Configuration settings for the PDF optimization process.
 */
export interface OptimizationSettings {
  /** The maximum width for the rasterized pages. Aspect ratio is maintained. */
  maxWidth: number;
  /** The quality of the JPEG compression, from 0 to 1. */
  quality: number;
  /** An optional callback to report progress during optimization. */
  onProgress?: (current: number, total: number) => void;
}

/**
 * Helper function to trigger a file download in the browser.
 * @param data The byte array of the file to download.
 * @param filename The desired name for the downloaded file.
 * @param mimeType The MIME type of the file.
 */
export function downloadBlob(data: Uint8Array, filename: string, mimeType: string) {
  const blob = new Blob([data as any], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Optimizes a given PDF File object entirely on the client-side.
 * It rasterizes each page, compresses it as a JPEG, and recompiles the images
 * into a new, smaller PDF document.
 *
 * @param file The PDF `File` object to optimize.
 * @param settings The configuration for the optimization process.
 * @returns A `Promise` that resolves with a `Uint8Array` of the optimized PDF.
 */
export async function optimizePdf(file: File, settings: OptimizationSettings): Promise<Uint8Array> {
  const { maxWidth, quality, onProgress } = settings;
  const arrayBuffer = await file.arrayBuffer();

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();
  }

  const pdfjsDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfjsDoc.numPages;

  // This will be our new, optimized PDF
  const optimizedPdfDoc = await PDFDocument.create();

  // A canvas element that we will reuse for rendering each page
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Could not create canvas context.');
  }

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(i - 1, numPages);
    
    const page = await pdfjsDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });

    // Determine the scale to apply based on the max width setting
    const scale = viewport.width > maxWidth ? maxWidth / viewport.width : 1;
    const scaledViewport = page.getViewport({ scale });

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    // Render the page onto the canvas
    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport,
    };
    await page.render(renderContext).promise;

    // Get the compressed image data from the canvas
    const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
    const jpegBytes = await fetch(jpegDataUrl).then(res => res.arrayBuffer());

    // Embed the compressed image into the new PDF
    const jpegImage = await optimizedPdfDoc.embedJpg(jpegBytes);
    
    // Add a new page with the dimensions of the image and draw it
    const newPage = optimizedPdfDoc.addPage([jpegImage.width, jpegImage.height]);
    newPage.drawImage(jpegImage, {
      x: 0,
      y: 0,
      width: jpegImage.width,
      height: jpegImage.height,
    });

    // Explicitly clean up to help with memory management on large documents
    context.clearRect(0, 0, canvas.width, canvas.height);
    page.cleanup();
  }

  onProgress?.(numPages, numPages); // Final progress update

  // Save the final document and return the bytes
  return await optimizedPdfDoc.save();
}

