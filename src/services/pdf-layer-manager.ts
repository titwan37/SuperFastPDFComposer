import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFString,
  PDFRef,
} from 'pdf-lib';
import type { PdfLayer, Annotation } from '@/lib/types';

export const DEFAULT_PDF_LAYERS: PdfLayer[] = [
  {
    id: 'layer-highlighters',
    name: 'Highlighters',
    isVisible: true,
    color: '#facc15',
    defaultSubtype: '/Highlight',
  },
  {
    id: 'layer-text',
    name: 'Text Annotations',
    isVisible: true,
    color: '#3b82f6',
    defaultSubtype: '/FreeText',
  },
  {
    id: 'layer-drawings',
    name: 'Drawings & Ink',
    isVisible: true,
    color: '#ef4444',
    defaultSubtype: '/Ink',
  },
  {
    id: 'layer-icons',
    name: 'Icons & Stamps',
    isVisible: true,
    color: '#8b5cf6',
    defaultSubtype: '/Stamp',
  },
  {
    id: 'layer-signatures',
    name: 'Signatures',
    isVisible: true,
    color: '#10b981',
    defaultSubtype: '/Stamp',
  },
  {
    id: 'layer-redactions',
    name: 'Redactions & Masks',
    isVisible: true,
    color: '#000000',
    defaultSubtype: '/Square',
  },
];

/**
 * Generates the /OCProperties dictionary in the PDF Document Catalog (Root),
 * enabling Optional Content Groups (OCGs / Layers) inside Adobe Acrobat, Preview, etc.
 *
 * @param pdfDoc The target PDFDocument from pdf-lib
 * @param layers Array of active PdfLayer configurations
 * @returns Map of layerId -> PDFRef for binding annotations to their parent layer
 */
export function generateOCGDictionary(
  pdfDoc: PDFDocument,
  layers: PdfLayer[] = DEFAULT_PDF_LAYERS
): Map<string, PDFRef> {
  const context = pdfDoc.context;
  const ocgMap = new Map<string, PDFRef>();

  if (!layers || layers.length === 0) {
    return ocgMap;
  }

  const ocgsArray = context.obj([]) as PDFArray;
  const orderArray = context.obj([]) as PDFArray;
  const onArray = context.obj([]) as PDFArray;
  const offArray = context.obj([]) as PDFArray;

  // 1. Create each OCG dictionary and register as an indirect object
  for (const layer of layers) {
    const ocgDict = context.obj({
      Type: PDFName.of('OCG'),
      Name: PDFString.of(layer.name),
    }) as PDFDict;

    const ocgRef = context.register(ocgDict);
    ocgMap.set(layer.id, ocgRef);

    ocgsArray.push(ocgRef);
    orderArray.push(ocgRef);

    if (layer.isVisible !== false) {
      onArray.push(ocgRef);
    } else {
      offArray.push(ocgRef);
    }
  }

  // 2. Build Default Viewing Configuration Dictionary (/D)
  const defaultDConfig = context.obj({
    Name: PDFString.of('Default View'),
    BaseState: PDFName.of('ON'),
    ON: onArray,
    OFF: offArray,
    Order: orderArray,
  }) as PDFDict;

  // 3. Create /OCProperties Dictionary
  const ocPropertiesDict = context.obj({
    OCGs: ocgsArray,
    D: defaultDConfig,
  }) as PDFDict;

  // 4. Attach to PDF Root / Catalog
  pdfDoc.catalog.set(PDFName.of('OCProperties'), ocPropertiesDict);

  return ocgMap;
}

/**
 * Resolves the appropriate layerId for an annotation based on explicit assignment
 * or automatic subtype heuristics.
 */
export function resolveLayerIdForAnnotation(annotation: Annotation): string {
  if (annotation.layerId) {
    return annotation.layerId;
  }
  switch (annotation.type) {
    case 'highlighter':
      return 'layer-highlighters';
    case 'signature':
      return 'layer-signatures';
    case 'text':
      return 'layer-text';
    case 'drawing':
      return 'layer-drawings';
    case 'icon':
      return 'layer-icons';
    case 'blackout':
    case 'mask':
      return 'layer-redactions';
    default:
      return 'layer-text';
  }
}

/**
 * Binds a native PDF Annotation dictionary to its corresponding Optional Content Group (OCG).
 *
 * @param annotDict The PDFDict representing the annotation
 * @param layerId The ID of the layer
 * @param ocgMap The map of layerId -> PDFRef from generateOCGDictionary
 */
export function bindAnnotationToOCG(
  annotDict: PDFDict,
  layerId: string | undefined,
  ocgMap: Map<string, PDFRef>
): void {
  if (!layerId) return;

  const ocgRef = ocgMap.get(layerId);
  if (ocgRef) {
    annotDict.set(PDFName.of('OC'), ocgRef);
  }
}
