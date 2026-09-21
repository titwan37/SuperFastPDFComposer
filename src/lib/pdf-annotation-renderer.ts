import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import type { Annotation } from './types';

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Applies an array of annotations to a PDFPage, mapping from the 800px reference
 * coordinate system to native PDF point dimensions.
 */
export async function applyAnnotationsToPdfPage(
  page: PDFPage,
  annotations: Annotation[],
  pdfDoc: PDFDocument,
  baseContainerWidth = 800
): Promise<void> {
  if (!annotations || annotations.length === 0) return;

  const { width: pageWidth, height: pageHeight } = page.getSize();
  const scale = pageWidth / baseContainerWidth;

  let helveticaFont;
  try {
    helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  } catch (err) {
    console.warn('Could not embed Helvetica font:', err);
  }

  for (const annotation of annotations) {
    try {
      if (annotation.type === 'text') {
        const color = hexToRgb(annotation.fontColor) || { r: 0, g: 0, b: 0 };
        const fontSize = Math.max(4, annotation.fontSize * scale);
        const x = annotation.x * scale;
        const y = pageHeight - (annotation.y * scale) - fontSize;

        if (helveticaFont) {
          page.drawText(annotation.text, {
            x,
            y,
            font: helveticaFont,
            size: fontSize,
            color: rgb(color.r / 255, color.g / 255, color.b / 255),
          });
        }
      } else if (annotation.type === 'icon') {
        const color = hexToRgb(annotation.strokeColor) || { r: 255, g: 0, b: 0 };
        const size = annotation.size * scale;
        const x = annotation.x * scale;
        const y = pageHeight - (annotation.y * scale) - size;
        const lineThickness = Math.max(1, (annotation.strokeWidth || 3) * scale);
        const iconColor = rgb(color.r / 255, color.g / 255, color.b / 255);

        if (annotation.iconType === 'check') {
          page.drawLine({
            start: { x: x + size * 0.1, y: y + size * 0.5 },
            end: { x: x + size * 0.4, y: y + size * 0.2 },
            thickness: lineThickness,
            color: iconColor,
          });
          page.drawLine({
            start: { x: x + size * 0.4, y: y + size * 0.2 },
            end: { x: x + size * 0.9, y: y + size * 0.8 },
            thickness: lineThickness,
            color: iconColor,
          });
        } else if (annotation.iconType === 'cross') {
          page.drawLine({
            start: { x: x, y: y },
            end: { x: x + size, y: y + size },
            thickness: lineThickness,
            color: iconColor,
          });
          page.drawLine({
            start: { x: x, y: y + size },
            end: { x: x + size, y: y },
            thickness: lineThickness,
            color: iconColor,
          });
        }
      } else if (annotation.type === 'drawing') {
        const color = hexToRgb(annotation.strokeColor) || { r: 255, g: 0, b: 0 };
        const strokeWidth = Math.max(1, (annotation.strokeWidth || 3) * scale);
        const strokeRgb = rgb(color.r / 255, color.g / 255, color.b / 255);

        for (const path of annotation.paths) {
          if (!path || path.length === 0) continue;
          if (path.length === 1) {
            page.drawCircle({
              x: path[0].x * scale,
              y: pageHeight - path[0].y * scale,
              size: strokeWidth / 2,
              color: strokeRgb,
            });
            continue;
          }

          const svgPath = path
            .map((p, i) => {
              const pageX = p.x * scale;
              const pageY = pageHeight - p.y * scale;
              return `${i === 0 ? 'M' : 'L'} ${pageX} ${pageY}`;
            })
            .join(' ');

          page.drawSvgPath(svgPath, {
            borderColor: strokeRgb,
            borderWidth: strokeWidth,
          });
        }
      } else if (annotation.type === 'signature') {
        const isJpg = annotation.dataUrl.startsWith('data:image/jpeg') || annotation.dataUrl.startsWith('data:image/jpg');
        const embeddedImage = isJpg
          ? await pdfDoc.embedJpg(annotation.dataUrl)
          : await pdfDoc.embedPng(annotation.dataUrl);
        const x = annotation.x * scale;
        const width = annotation.width * scale;
        const height = annotation.height * scale;
        const y = pageHeight - (annotation.y * scale) - height;

        page.drawImage(embeddedImage, {
          x,
          y,
          width,
          height,
        });
      }
    } catch (err) {
      console.error(`Error applying annotation ${annotation.id} to PDF:`, err);
    }
  }
}
