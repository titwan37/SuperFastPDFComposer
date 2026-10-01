/**
 * HarfBuzz WASM Text Shaping Service
 * 
 * Provides client-side, WebAssembly-accelerated text shaping for complex scripts
 * (Arabic, Hebrew RTL, Indic, Thai, CJK, and OpenType ligatures) before generating
 * native PDF text operators and /FreeText /RC dictionaries.
 */

export interface ShapedGlyph {
  glyphId: number;
  cluster: number;
  xAdvance: number;
  yAdvance: number;
  xOffset: number;
  yOffset: number;
}

export interface ShapingResult {
  glyphs: ShapedGlyph[];
  totalAdvanceWidth: number;
  isRtl: boolean;
  script: string;
  language: string;
}

export interface HarfBuzzWasmExports {
  memory: WebAssembly.Memory;
  malloc: (size: number) => number;
  free: (ptr: number) => void;
  hb_blob_create: (dataPtr: number, length: number, mode: number, userData: number, destroyFunc: number) => number;
  hb_face_create: (blobPtr: number, index: number) => number;
  hb_font_create: (facePtr: number) => number;
  hb_buffer_create: () => number;
  hb_buffer_add_utf8: (bufferPtr: number, textPtr: number, textLength: number, itemOffset: number, itemLength: number) => void;
  hb_buffer_guess_segment_properties: (bufferPtr: number) => void;
  hb_buffer_set_direction: (bufferPtr: number, direction: number) => void;
  hb_buffer_set_script: (bufferPtr: number, scriptTag: number) => void;
  hb_shape: (fontPtr: number, bufferPtr: number, featuresPtr: number, numFeatures: number) => void;
  hb_buffer_get_glyph_infos: (bufferPtr: number, lengthPtr: number) => number;
  hb_buffer_get_glyph_positions: (bufferPtr: number, lengthPtr: number) => number;
  hb_buffer_destroy: (bufferPtr: number) => void;
  hb_font_destroy: (fontPtr: number) => void;
  hb_face_destroy: (facePtr: number) => void;
  hb_blob_destroy: (blobPtr: number) => void;
}

export class HarfBuzzTextShaper {
  private wasmInstance: WebAssembly.Instance | null = null;
  private hb: HarfBuzzWasmExports | null = null;
  private fontCache = new Map<string, { fontPtr: number; facePtr: number; blobPtr: number }>();

  /**
   * Initializes the HarfBuzz WASM binary in the browser runtime.
   */
  public async initialize(wasmUrl = '/wasm/hb-shape.wasm'): Promise<void> {
    if (this.wasmInstance) return;

    try {
      const response = await fetch(wasmUrl);
      const wasmBytes = await response.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(wasmBytes, {
        env: {
          memory: new WebAssembly.Memory({ initial: 256, maximum: 1024 }),
          abort: () => console.error('HarfBuzz WASM abort called'),
        },
      });

      this.wasmInstance = instance;
      this.hb = instance.exports as unknown as HarfBuzzWasmExports;
    } catch (err) {
      console.warn('HarfBuzz WASM initialization fallback to mock/heuristic shaper:', err);
    }
  }

  /**
   * Registers a TrueType / OpenType font binary with the HarfBuzz engine.
   */
  public registerFont(fontName: string, fontBuffer: ArrayBuffer): void {
    if (!this.hb) return;

    const fontBytes = new Uint8Array(fontBuffer);
    const dataPtr = this.hb.malloc(fontBytes.length);
    new Uint8Array(this.hb.memory.buffer).set(fontBytes, dataPtr);

    const blobPtr = this.hb.hb_blob_create(dataPtr, fontBytes.length, 1, 0, 0);
    const facePtr = this.hb.hb_face_create(blobPtr, 0);
    const fontPtr = this.hb.hb_font_create(facePtr);

    this.fontCache.set(fontName, { fontPtr, facePtr, blobPtr });
  }

  /**
   * Shapes a string using the specified font and direction heuristics.
   *
   * @param text Input UTF-8 string (e.g., Arabic, Hebrew, English with ligatures, Hindi)
   * @param fontName Identifier of registered font
   * @param fontSize Target font size in PDF points
   * @returns Shaped glyph layout positions and cluster metadata
   */
  public shapeText(text: string, fontName = 'default', fontSize = 12): ShapingResult {
    const isRtl = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(text);

    if (!this.hb || !this.fontCache.has(fontName)) {
      // Fallback heuristic shaper when WASM module is loading or unavailable
      return this.fallbackShaper(text, fontSize, isRtl);
    }

    const { fontPtr } = this.fontCache.get(fontName)!;
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);

    const textPtr = this.hb.malloc(encodedText.length);
    new Uint8Array(this.hb.memory.buffer).set(encodedText, textPtr);

    const bufferPtr = this.hb.hb_buffer_create();
    this.hb.hb_buffer_add_utf8(bufferPtr, textPtr, encodedText.length, 0, encodedText.length);
    this.hb.hb_buffer_guess_segment_properties(bufferPtr);

    if (isRtl) {
      this.hb.hb_buffer_set_direction(bufferPtr, 5); // HB_DIRECTION_RTL = 5
    }

    // Execute HarfBuzz Shaping
    this.hb.hb_shape(fontPtr, bufferPtr, 0, 0);

    const lengthPtr = this.hb.malloc(4);
    const infosPtr = this.hb.hb_buffer_get_glyph_infos(bufferPtr, lengthPtr);
    const positionsPtr = this.hb.hb_buffer_get_glyph_positions(bufferPtr, lengthPtr);
    const glyphCount = new Uint32Array(this.hb.memory.buffer, lengthPtr, 1)[0];

    const glyphs: ShapedGlyph[] = [];
    let totalAdvance = 0;

    const infoView = new Int32Array(this.hb.memory.buffer, infosPtr, glyphCount * 5);
    const posView = new Int32Array(this.hb.memory.buffer, positionsPtr, glyphCount * 5);

    for (let i = 0; i < glyphCount; i++) {
      const glyphId = infoView[i * 5];
      const cluster = infoView[i * 5 + 2];
      const xAdvance = (posView[i * 5] / 64) * (fontSize / 12);
      const yAdvance = (posView[i * 5 + 1] / 64) * (fontSize / 12);
      const xOffset = (posView[i * 5 + 2] / 64) * (fontSize / 12);
      const yOffset = (posView[i * 5 + 3] / 64) * (fontSize / 12);

      glyphs.push({ glyphId, cluster, xAdvance, yAdvance, xOffset, yOffset });
      totalAdvance += xAdvance;
    }

    // Clean up allocated buffer memory
    this.hb.hb_buffer_destroy(bufferPtr);
    this.hb.free(textPtr);
    this.hb.free(lengthPtr);

    return {
      glyphs,
      totalAdvanceWidth: totalAdvance,
      isRtl,
      script: isRtl ? 'Arab' : 'Latn',
      language: isRtl ? 'ar' : 'en',
    };
  }

  /**
   * Translates HarfBuzz shaped glyph positions into PDF Content Stream text operators
   * or a rich XHTML structure for /FreeText /RC annotations.
   */
  public generatePdfTextOperators(result: ShapingResult, startX: number, startY: number): string {
    const ops: string[] = ['BT'];
    let currentX = startX;

    for (const g of result.glyphs) {
      const gx = currentX + g.xOffset;
      const gy = startY + g.yOffset;
      ops.push(`1 0 0 1 ${gx.toFixed(2)} ${gy.toFixed(2)} Tm`);
      ops.push(`/${g.glyphId} Tj`);
      currentX += g.xAdvance;
    }

    ops.push('ET');
    return ops.join('\n');
  }

  /**
   * Generates a bidirectional XHTML string formatted for native PDF /FreeText /RC annotations.
   */
  public generateRichContentXml(text: string, fontColor: string, fontSize: number, isRtl: boolean): string {
    const dir = isRtl ? 'rtl' : 'ltr';
    const align = isRtl ? 'right' : 'left';
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return `<?xml version="1.0"?><body xmlns="http://www.w3.org/1999/xhtml" xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/" xfa:APIVersion="Acroform:2.7.0.0" xfa:spec="2.1"><p dir="${dir}" style="text-align:${align};font-size:${fontSize}pt;color:${fontColor};font-family:sans-serif">${escaped}</p></body>`;
  }

  private fallbackShaper(text: string, fontSize: number, isRtl: boolean): ShapingResult {
    const charWidth = fontSize * 0.6;
    const glyphs: ShapedGlyph[] = text.split('').map((char, i) => ({
      glyphId: char.charCodeAt(0),
      cluster: i,
      xAdvance: charWidth,
      yAdvance: 0,
      xOffset: 0,
      yOffset: 0,
    }));

    return {
      glyphs,
      totalAdvanceWidth: glyphs.length * charWidth,
      isRtl,
      script: isRtl ? 'Arab' : 'Latn',
      language: isRtl ? 'ar' : 'en',
    };
  }
}

export const harfBuzzTextShaper = new HarfBuzzTextShaper();
