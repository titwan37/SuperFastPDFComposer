import {
  PDFDocument,
  PDFPage,
  PDFName,
  PDFDict,
  PDFArray,
  PDFString,
  PDFHexString,
  PDFNumber,
  PDFRef,
  rgb,
  StandardFonts,
} from 'pdf-lib';
import type {
  Annotation,
  TextAnnotation,
  DrawingAnnotation,
  IconAnnotation,
  SignatureAnnotation,
  RedactionMaskAnnotation,
  BlackoutMarkerAnnotation,
  HighlighterAnnotation,
  HighlighterColor,
  PdfLayer,
} from './types';
import {
  bindAnnotationToOCG,
  resolveLayerIdForAnnotation,
} from '@/services/pdf-layer-manager';

export const hexToRgb = (
  hex: string
): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export const HIGHLIGHTER_RGB_MAP: Record<HighlighterColor, { r: number; g: number; b: number }> = {
  yellow: { r: 1.0, g: 0.95, b: 0.2 },
  green: { r: 0.25, g: 0.95, b: 0.45 },
  pink: { r: 1.0, g: 0.4, b: 0.72 },
  blue: { r: 0.2, g: 0.75, b: 1.0 },
};

/**
 * Returns numeric Z-index for sorting annotations prior to baking:
 * Order: highlighter (bottom) -> text/drawing/icon/signature -> blackout -> mask (top)
 */
export function getAnnotationZIndex(type: string): number {
  switch (type) {
    case 'highlighter':
      return 10;
    case 'drawing':
      return 20;
    case 'icon':
      return 30;
    case 'text':
      return 40;
    case 'signature':
      return 50;
    case 'blackout':
      return 60;
    case 'mask':
      return 70;
    default:
      return 25;
  }
}

/**
 * Ensures the Annots array exists on a PDFPage and returns the reference to it.
 */
function getOrCreateAnnotsArray(page: PDFPage, pdfDoc: PDFDocument): PDFArray {
  const pageNode = page.node;
  let annots = pageNode.lookup(PDFName.of('Annots'));

  if (!annots || !(annots instanceof PDFArray)) {
    const newAnnotsArray = pdfDoc.context.obj([]) as PDFArray;
    pageNode.set(PDFName.of('Annots'), newAnnotsArray);
    return newAnnotsArray;
  }

  return annots;
}

/**
 * Creates a native PDF /FreeText annotation dictionary.
 */
async function createFreeTextAnnotation(
  annotation: TextAnnotation,
  scale: number,
  pageHeight: number,
  pdfDoc: PDFDocument
): Promise<PDFDict> {
  const context = pdfDoc.context;
  const color = hexToRgb(annotation.fontColor) || { r: 0, g: 0, b: 0 };
  const rNorm = (color.r / 255).toFixed(3);
  const gNorm = (color.g / 255).toFixed(3);
  const bNorm = (color.b / 255).toFixed(3);

  const fontSize = Math.max(4, annotation.fontSize * scale);
  const x = annotation.x * scale;
  const width = Math.max(20, (annotation.width || 120) * scale);
  const height = Math.max(fontSize * 1.4, (annotation.height || fontSize * 1.5) * scale);
  const y = pageHeight - (annotation.y * scale) - height;

  const rect = context.obj([
    PDFNumber.of(x),
    PDFNumber.of(y),
    PDFNumber.of(x + width),
    PDFNumber.of(y + height),
  ]) as PDFArray;

  const daString = `/Helv ${fontSize.toFixed(1)} Tf ${rNorm} ${gNorm} ${bNorm} rg`;

  const escapedText = (annotation.text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const richTextXml = `<?xml version="1.0"?><body xmlns="http://www.w3.org/1999/xhtml" xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/" xfa:APIVersion="Acroform:2.7.0.0" xfa:spec="2.1"><p style="text-align:left;font-size:${fontSize.toFixed(1)}pt;color:${annotation.fontColor};font-family:Helvetica">${escapedText}</p></body>`;

  const annotDict = context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('FreeText'),
    Rect: rect,
    Contents: PDFHexString.fromText(annotation.text || ''),
    DA: PDFString.of(daString),
    RC: PDFString.of(richTextXml),
    C: context.obj([
      PDFNumber.of(color.r / 255),
      PDFNumber.of(color.g / 255),
      PDFNumber.of(color.b / 255),
    ]),
    F: PDFNumber.of(annotation.isLocked ? 132 : 4),
    NM: PDFString.of(annotation.id),
    M: PDFString.of(`D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z`),
  }) as PDFDict;

  try {
    try {
      await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch {}

    const appStream = context.flateStream(
      `BT /Helv ${fontSize.toFixed(1)} Tf ${rNorm} ${gNorm} ${bNorm} rg 2 ${(height - fontSize).toFixed(1)} Td (${(annotation.text || '').replace(/[()\\]/g, '\\$&')}) Tj ET`
    );
    appStream.dict.set(PDFName.of('Type'), PDFName.of('XObject'));
    appStream.dict.set(PDFName.of('Subtype'), PDFName.of('Form'));
    appStream.dict.set(
      PDFName.of('BBox'),
      context.obj([
        PDFNumber.of(0),
        PDFNumber.of(0),
        PDFNumber.of(width),
        PDFNumber.of(height),
      ])
    );

    const apDict = context.obj({
      N: context.register(appStream),
    }) as PDFDict;
    annotDict.set(PDFName.of('AP'), apDict);
  } catch (err) {
    console.warn('Could not generate /AP stream for FreeText:', err);
  }

  return annotDict;
}

/**
 * Creates a native PDF /Ink annotation dictionary for drawings and blackout markers.
 */
function createInkAnnotation(
  annotation: DrawingAnnotation | BlackoutMarkerAnnotation,
  scale: number,
  pageHeight: number,
  pdfDoc: PDFDocument
): PDFDict | null {
  const context = pdfDoc.context;
  if (!annotation.paths || annotation.paths.length === 0) return null;

  const isBlackout = annotation.type === 'blackout';
  const color = isBlackout
    ? { r: 0, g: 0, b: 0 }
    : hexToRgb(annotation.strokeColor) || { r: 255, g: 0, b: 0 };
  const strokeWidth = Math.max(
    1,
    (isBlackout ? annotation.strokeWidth || 16 : annotation.strokeWidth || 3) * scale
  );

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const inkListArray = context.obj([]) as PDFArray;

  for (const path of annotation.paths) {
    if (!path || path.length === 0) continue;
    const pathPoints: PDFNumber[] = [];

    for (const pt of path) {
      const px = pt.x * scale;
      const py = pageHeight - pt.y * scale;

      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);

      pathPoints.push(PDFNumber.of(px), PDFNumber.of(py));
    }

    if (pathPoints.length > 0) {
      inkListArray.push(context.obj(pathPoints));
    }
  }

  if (minX === Infinity) return null;

  const pad = strokeWidth * 2;
  const rect = context.obj([
    PDFNumber.of(Math.max(0, minX - pad)),
    PDFNumber.of(Math.max(0, minY - pad)),
    PDFNumber.of(maxX + pad),
    PDFNumber.of(maxY + pad),
  ]) as PDFArray;

  const bsDict = context.obj({
    Type: PDFName.of('Border'),
    W: PDFNumber.of(strokeWidth),
    S: PDFName.of('S'),
  }) as PDFDict;

  const annotDict = context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Ink'),
    Rect: rect,
    InkList: inkListArray,
    BS: bsDict,
    C: context.obj([
      PDFNumber.of(color.r / 255),
      PDFNumber.of(color.g / 255),
      PDFNumber.of(color.b / 255),
    ]),
    F: PDFNumber.of(annotation.isLocked ? 132 : 4),
    NM: PDFString.of(annotation.id),
    M: PDFString.of(`D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z`),
  }) as PDFDict;

  return annotDict;
}

/**
 * Creates a native PDF /Highlight annotation dictionary with opacity.
 */
function createHighlighterAnnotation(
  annotation: HighlighterAnnotation,
  scale: number,
  pageHeight: number,
  pdfDoc: PDFDocument
): PDFDict | null {
  const context = pdfDoc.context;
  if (!annotation.paths || annotation.paths.length === 0) return null;

  const fluo = HIGHLIGHTER_RGB_MAP[annotation.color] || HIGHLIGHTER_RGB_MAP.yellow;
  const strokeWidth = Math.max(1, (annotation.strokeWidth || 24) * scale);
  const opacity = annotation.opacity || 0.35;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const inkListArray = context.obj([]) as PDFArray;

  for (const path of annotation.paths) {
    if (!path || path.length === 0) continue;
    const pathPoints: PDFNumber[] = [];

    for (const pt of path) {
      const px = pt.x * scale;
      const py = pageHeight - pt.y * scale;

      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);

      pathPoints.push(PDFNumber.of(px), PDFNumber.of(py));
    }

    if (pathPoints.length > 0) {
      inkListArray.push(context.obj(pathPoints));
    }
  }

  if (minX === Infinity) return null;

  const pad = strokeWidth * 2;
  const rect = context.obj([
    PDFNumber.of(Math.max(0, minX - pad)),
    PDFNumber.of(Math.max(0, minY - pad)),
    PDFNumber.of(maxX + pad),
    PDFNumber.of(maxY + pad),
  ]) as PDFArray;

  const bsDict = context.obj({
    Type: PDFName.of('Border'),
    W: PDFNumber.of(strokeWidth),
    S: PDFName.of('S'),
  }) as PDFDict;

  const annotDict = context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Ink'), // Standardized /Ink with blend opacity for broad PDF support
    Rect: rect,
    InkList: inkListArray,
    BS: bsDict,
    C: context.obj([
      PDFNumber.of(fluo.r),
      PDFNumber.of(fluo.g),
      PDFNumber.of(fluo.b),
    ]),
    CA: PDFNumber.of(opacity),
    ca: PDFNumber.of(opacity),
    F: PDFNumber.of(annotation.isLocked ? 132 : 4),
    NM: PDFString.of(annotation.id),
  }) as PDFDict;

  return annotDict;
}

/**
 * Creates a native PDF /Square annotation dictionary for solid white redaction masks.
 */
function createRedactionMaskAnnotation(
  annotation: RedactionMaskAnnotation,
  scale: number,
  pageHeight: number,
  pdfDoc: PDFDocument
): PDFDict {
  const context = pdfDoc.context;
  const x = annotation.x * scale;
  const width = Math.max(10, annotation.width * scale);
  const height = Math.max(10, annotation.height * scale);
  const y = pageHeight - (annotation.y * scale) - height;

  const rect = context.obj([
    PDFNumber.of(x),
    PDFNumber.of(y),
    PDFNumber.of(x + width),
    PDFNumber.of(y + height),
  ]) as PDFArray;

  const bsDict = context.obj({
    Type: PDFName.of('Border'),
    W: PDFNumber.of(0),
  }) as PDFDict;

  const annotDict = context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Square'),
    Rect: rect,
    BS: bsDict,
    C: context.obj([PDFNumber.of(1), PDFNumber.of(1), PDFNumber.of(1)]), // White border
    IC: context.obj([PDFNumber.of(1), PDFNumber.of(1), PDFNumber.of(1)]), // White solid fill
    F: PDFNumber.of(annotation.isLocked ? 132 : 4),
    NM: PDFString.of(annotation.id),
  }) as PDFDict;

  return annotDict;
}

/**
 * Creates a native PDF /Stamp annotation dictionary referencing an embedded image XObject.
 */
async function createStampAnnotation(
  annotation: SignatureAnnotation,
  scale: number,
  pageHeight: number,
  pdfDoc: PDFDocument
): Promise<PDFDict | null> {
  const context = pdfDoc.context;
  if (!annotation.dataUrl) return null;

  const isJpg =
    annotation.dataUrl.startsWith('data:image/jpeg') ||
    annotation.dataUrl.startsWith('data:image/jpg');

  const embeddedImage = isJpg
    ? await pdfDoc.embedJpg(annotation.dataUrl)
    : await pdfDoc.embedPng(annotation.dataUrl);

  const x = annotation.x * scale;
  const width = Math.max(10, annotation.width * scale);
  const height = Math.max(10, annotation.height * scale);
  const y = pageHeight - (annotation.y * scale) - height;

  const rect = context.obj([
    PDFNumber.of(x),
    PDFNumber.of(y),
    PDFNumber.of(x + width),
    PDFNumber.of(y + height),
  ]) as PDFArray;

  const imgName = PDFName.of('Img0');
  const appStream = context.flateStream(
    `q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} 0 0 cm /${imgName.asString()} Do Q`
  );
  appStream.dict.set(PDFName.of('Type'), PDFName.of('XObject'));
  appStream.dict.set(PDFName.of('Subtype'), PDFName.of('Form'));
  appStream.dict.set(
    PDFName.of('BBox'),
    context.obj([
      PDFNumber.of(0),
      PDFNumber.of(0),
      PDFNumber.of(width),
      PDFNumber.of(height),
    ])
  );

  const xObjectDict = context.obj({
    [imgName.asString()]: embeddedImage.ref,
  }) as PDFDict;
  const resDict = context.obj({
    XObject: xObjectDict,
  }) as PDFDict;
  appStream.dict.set(PDFName.of('Resources'), resDict);

  const appStreamRef = context.register(appStream);

  const apDict = context.obj({
    N: appStreamRef,
  }) as PDFDict;

  const annotDict = context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Stamp'),
    Rect: rect,
    Name: PDFName.of('Sign'),
    AP: apDict,
    F: PDFNumber.of(annotation.isLocked ? 132 : 4),
    NM: PDFString.of(annotation.id),
  }) as PDFDict;

  return annotDict;
}

/**
 * Creates a native PDF Stamp / Icon annotation for checkmarks & crosses.
 */
function createIconStampAnnotation(
  annotation: IconAnnotation,
  scale: number,
  pageHeight: number,
  pdfDoc: PDFDocument
): PDFDict | null {
  const context = pdfDoc.context;
  const color = hexToRgb(annotation.strokeColor) || { r: 255, g: 0, b: 0 };
  const rNorm = (color.r / 255).toFixed(3);
  const gNorm = (color.g / 255).toFixed(3);
  const bNorm = (color.b / 255).toFixed(3);

  const size = annotation.size * scale;
  const strokeWidth = Math.max(1, (annotation.strokeWidth || 3) * scale);
  const x = annotation.x * scale;
  const y = pageHeight - (annotation.y * scale) - size;

  const rect = context.obj([
    PDFNumber.of(x),
    PDFNumber.of(y),
    PDFNumber.of(x + size),
    PDFNumber.of(y + size),
  ]) as PDFArray;

  let streamOps = '';
  if (annotation.iconType === 'check') {
    streamOps = `
      q
      ${rNorm} ${gNorm} ${bNorm} RG
      ${strokeWidth.toFixed(1)} w
      1 J 1 j
      ${(size * 0.1).toFixed(1)} ${(size * 0.5).toFixed(1)} m
      ${(size * 0.4).toFixed(1)} ${(size * 0.2).toFixed(1)} l
      ${(size * 0.9).toFixed(1)} ${(size * 0.8).toFixed(1)} l
      S
      Q
    `;
  } else {
    streamOps = `
      q
      ${rNorm} ${gNorm} ${bNorm} RG
      ${strokeWidth.toFixed(1)} w
      1 J 1 j
      ${(size * 0.1).toFixed(1)} ${(size * 0.1).toFixed(1)} m
      ${(size * 0.9).toFixed(1)} ${(size * 0.9).toFixed(1)} l
      ${(size * 0.1).toFixed(1)} ${(size * 0.9).toFixed(1)} m
      ${(size * 0.9).toFixed(1)} ${(size * 0.1).toFixed(1)} l
      S
      Q
    `;
  }

  const appStream = context.flateStream(streamOps.trim());
  appStream.dict.set(PDFName.of('Type'), PDFName.of('XObject'));
  appStream.dict.set(PDFName.of('Subtype'), PDFName.of('Form'));
  appStream.dict.set(
    PDFName.of('BBox'),
    context.obj([
      PDFNumber.of(0),
      PDFNumber.of(0),
      PDFNumber.of(size),
      PDFNumber.of(size),
    ])
  );

  const appStreamRef = context.register(appStream);

  const annotDict = context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Stamp'),
    Rect: rect,
    Name: PDFName.of(annotation.iconType === 'check' ? 'Approved' : 'Rejected'),
    AP: context.obj({ N: appStreamRef }),
    F: PDFNumber.of(annotation.isLocked ? 132 : 4),
    NM: PDFString.of(annotation.id),
  }) as PDFDict;

  return annotDict;
}

/**
 * Bakes annotations directly into the PDF content stream in strict Z-index order
 * while simultaneously attaching native PDF Annotation Dictionaries and OCG Layers.
 */
export async function applyNativeAnnotationsToPdfPage(
  page: PDFPage,
  annotations: Annotation[],
  pdfDoc: PDFDocument,
  ocgMap?: Map<string, PDFRef>,
  baseContainerWidth = 800
): Promise<void> {
  if (!annotations || annotations.length === 0) return;

  const { width: pageWidth, height: pageHeight } = page.getSize();
  const scale = pageWidth / baseContainerWidth;
  const annotsArray = getOrCreateAnnotsArray(page, pdfDoc);

  // 1. Sort annotations by Z-Index:
  // highlighter (bottom) -> text/drawing/icon/signature -> blackout -> mask (top)
  const sortedAnnotations = [...annotations].sort(
    (a, b) => getAnnotationZIndex(a.type) - getAnnotationZIndex(b.type)
  );

  for (const annotation of sortedAnnotations) {
    try {
      let annotDict: PDFDict | null = null;

      // 2. Direct Content-Stream Baking for Guaranteed Visual Output
      if (annotation.type === 'mask') {
        const x = annotation.x * scale;
        const width = Math.max(10, annotation.width * scale);
        const height = Math.max(10, annotation.height * scale);
        const y = pageHeight - (annotation.y * scale) - height;

        // Draw solid white rectangle on the content stream with zero border
        page.drawRectangle({
          x: x - 0.25, // 0.25pt subpixel anti-aliasing seam expansion
          y: y - 0.25,
          width: width + 0.5,
          height: height + 0.5,
          color: rgb(1, 1, 1),
          borderWidth: 0,
        });

        annotDict = createRedactionMaskAnnotation(annotation, scale, pageHeight, pdfDoc);
      } else if (annotation.type === 'blackout') {
        const strokeWidth = Math.max(1, (annotation.strokeWidth || 16) * scale);
        const strokeRgb = rgb(0, 0, 0);

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

        annotDict = createInkAnnotation(annotation, scale, pageHeight, pdfDoc);
      } else if (annotation.type === 'highlighter') {
        const fluo = HIGHLIGHTER_RGB_MAP[annotation.color] || HIGHLIGHTER_RGB_MAP.yellow;
        const strokeWidth = Math.max(1, (annotation.strokeWidth || 24) * scale);
        const strokeRgb = rgb(fluo.r, fluo.g, fluo.b);
        const opacity = annotation.opacity || 0.35;

        for (const path of annotation.paths) {
          if (!path || path.length === 0) continue;
          if (path.length === 1) {
            page.drawCircle({
              x: path[0].x * scale,
              y: pageHeight - path[0].y * scale,
              size: strokeWidth / 2,
              color: strokeRgb,
              opacity,
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
            borderOpacity: opacity,
            opacity,
          });
        }

        annotDict = createHighlighterAnnotation(annotation, scale, pageHeight, pdfDoc);
      } else if (annotation.type === 'text') {
        annotDict = await createFreeTextAnnotation(annotation, scale, pageHeight, pdfDoc);
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

        annotDict = createInkAnnotation(annotation, scale, pageHeight, pdfDoc);
      } else if (annotation.type === 'signature') {
        const isJpg =
          annotation.dataUrl.startsWith('data:image/jpeg') ||
          annotation.dataUrl.startsWith('data:image/jpg');
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

        annotDict = await createStampAnnotation(annotation, scale, pageHeight, pdfDoc);
      } else if (annotation.type === 'icon') {
        annotDict = createIconStampAnnotation(annotation, scale, pageHeight, pdfDoc);
      }

      // 3. Register Native PDF Annotation Dictionary & OCG Layer Binding
      if (annotDict) {
        if (ocgMap) {
          const targetLayerId = resolveLayerIdForAnnotation(annotation);
          bindAnnotationToOCG(annotDict, targetLayerId, ocgMap);
        }

        const annotRef = pdfDoc.context.register(annotDict);
        annotsArray.push(annotRef);
      }
    } catch (err) {
      console.error(`Error baking annotation ${annotation.id} to PDF:`, err);
    }
  }
}

/**
 * Backward-compatible alias for applyNativeAnnotationsToPdfPage.
 */
export async function applyAnnotationsToPdfPage(
  page: PDFPage,
  annotations: Annotation[],
  pdfDoc: PDFDocument,
  baseContainerWidth = 800
): Promise<void> {
  return applyNativeAnnotationsToPdfPage(
    page,
    annotations,
    pdfDoc,
    undefined,
    baseContainerWidth
  );
}
