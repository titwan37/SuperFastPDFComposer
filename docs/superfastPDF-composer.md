Based on the provided Technical Design Document, your current implementation relies on **`pdf-lib`** to "bake" (flatten) annotations directly into the PDF content stream using basic vector drawing and standard font embedding. While this is an excellent approach for a 100% client-side, zero-latency web app, it is not the **State of the Art (SOTA)** for enterprise-grade PDF manipulation.

Here is an analysis of the SOTA, how to elevate your architecture to the "next league," and a comprehensive AI prompt to execute the refactoring.

---

### 1. State of the Art (SOTA) in PDF Modification & Overlays
In the realm of high-fidelity, client-side PDF manipulation, the SOTA revolves around **Native PDF Dictionaries**, **WebAssembly (WASM) Native Engines**, and **Advanced Typography**.

1. **Native Annotation Dictionaries (`/Annot`) vs. Content Stream Baking**:
   * *Current Approach*: Drawing lines and text directly onto the page content stream (`page.drawSvgPath()`). This is destructive; it flattens the overlay, making text non-selectable and uneditable in standard PDF readers.
   * *SOTA*: Using native PDF Annotation objects (e.g., `/Subtype /FreeText`, `/Subtype /Ink`, `/Subtype /Stamp`). This keeps overlays non-destructive, accessible, searchable, and editable in Adobe Acrobat or Preview.
2. **WASM-Based Native Engines (MuPDF / PDFium)**:
   * *Current Approach*: `pdf-lib` is a pure JavaScript library. It struggles with complex PDF edge cases like advanced transparency groups, complex shadings, and precise font subsetting.
   * *SOTA*: Using WASM-compiled native C/C++ engines like **MuPDF** or **PDFium** (e.g., `mupdf-wasm`). These guarantee 100% Adobe-equivalent fidelity while still running entirely in the browser (maintaining your Zero Data Leakage pillar).
3. **Advanced Text Shaping (HarfBuzz)**:
   * *Current Approach*: Embedding standard fonts (Helvetica) or basic TTFs. Fails on complex scripts (Arabic, Hindi, CJK) or ligatures.
   * *SOTA*: Running **HarfBuzz** via WASM to shape text glyphs *before* generating PDF text operators, ensuring perfect global typography.
4. **Optional Content Groups (OCGs / Layers)**:
   * *SOTA*: Grouping overlays into toggleable PDF Layers (e.g., "Signatures", "Redactions", "Notes") using PDF OCG dictionaries, allowing end-users to hide/show specific overlay types in their PDF viewer.
5. **SVG Form XObjects**:
   * *SOTA*: Instead of parsing SVG paths into PDF drawing commands (which loses gradients/masks), injecting the raw SVG as a PDF Form XObject or using a WASM SVG-to-PDF converter.

---

### 2. How to Improve to the "Next League"
To transition from a "Great Web App" to an "Enterprise-Grade PDF Engine," you must implement the following architectural shifts:

#### Shift A: Non-Destructive Native Annotations
Refactor `src/lib/pdf-annotation-renderer.ts`. Instead of `page.drawSvgPath()`, construct PDF Dictionary objects.
* **Text**: Create a `/FreeText` annotation with rich text strings (`/RC`) and default appearance strings (`/DA`).
* **Drawings**: Create an `/Ink` annotation using an `/InkList` array of coordinate pairs.
* **Signatures**: Create a `/Stamp` or `/Widget` annotation referencing an embedded XObject image.

#### Shift B: Introduce WASM Native Engine for Final Compilation
Replace `pdf-lib`'s `save()` method with a WASM bridge to **MuPDF.js**.
* Use `pdf.js` for UI rendering.
* Use `pdf-lib` for fast, lightweight page copying and metadata reading.
* Use **MuPDF WASM** for the final document assembly, annotation baking (if flattening is requested), and high-fidelity export.

#### Shift C: Implement PDF Layers (OCGs)
Update `src/lib/types.ts` to include a `layerId` on annotations. During export, generate an `/OCProperties` dictionary in the PDF catalog, allowing users to toggle layers on/off in the final downloaded file.

#### Shift D: High-Performance WebGL Annotation Canvas
Replace the standard HTML5 Canvas / DOM-based annotation layer with a WebGL-accelerated engine like **Fabric.js** or **Konva.js**. This allows thousands of vector nodes, infinite zooming, and 120FPS panning without DOM thrashing.

---

### 3. AI Prompt to Perform the Improvements
*Copy and paste the following prompt into an AI coding assistant (like Cursor, GitHub Copilot Workspace, or an LLM) to generate the refactored codebase.*

***

**[START OF PROMPT]**

**Role:** You are a Principal Software Engineer and PDF/WebAssembly Expert.
**Context:** I am upgrading a 100% client-side Next.js PDF Composer app. Currently, it uses `pdf-lib` to "bake" annotations (text, drawings, signatures) directly into the PDF content stream using basic vector commands. 
**Goal:** Elevate the architecture to the State of the Art (SOTA) by implementing Native PDF Annotations, Optional Content Groups (Layers), and preparing for a WASM-based high-fidelity rendering engine, while strictly maintaining the "Zero Data Leakage / 100% Client-Side" constraint.

**Please execute the following refactoring tasks step-by-step:**

### Task 1: Update Domain Models for Native Annotations & Layers
Update `src/lib/types.ts`. 
1. Change the `Annotation` types to map to Native PDF Annotation subtypes (`/FreeText`, `/Ink`, `/Stamp`) rather than UI bounding boxes.
2. Add a `layerId: string` and `isLocked: boolean` property to all annotations to support PDF Optional Content Groups (OCGs).
3. Create a `PdfLayer` interface (id, name, isVisible, color) to manage UI and PDF OCG mapping.

### Task 2: Refactor Annotation Renderer to Native Dictionaries
Rewrite `src/lib/pdf-annotation-renderer.ts`. 
Instead of using `page.drawSvgPath()` or `page.drawText()`, implement a new function `applyNativeAnnotationsToPdfPage(page, annotations, layers)`.
1. **Text**: Generate a `/FreeText` annotation dictionary. Include `/DA` (Default Appearance) for font/color and `/RC` (Rich Text) for formatting.
2. **Drawings**: Generate an `/Ink` annotation dictionary. Map the `paths` array to the PDF `/InkList` array format `[[x1, y1, x2, y2], ...]`.
3. **Signatures**: Generate a `/Stamp` annotation dictionary referencing an embedded Image XObject.
4. **Coordinate Mapping**: Ensure the bottom-left origin `(0,0)` and PDF point scaling math is perfectly applied to the `/Rect` bounding boxes of these annotations.

### Task 3: Implement Optional Content Groups (OCGs / Layers)
Create a new service `src/services/pdf-layer-manager.ts`.
1. Write a function `generateOCGDictionary(pdfDoc, layers)` that creates the `/OCProperties` dictionary in the PDF Catalog.
2. Write a function `bindAnnotationsToOCGs(page, annotations, layers)` that adds the `/OC` (Optional Content) entry to each native annotation dictionary, linking it to the correct OCG reference.
3. Ensure that when the PDF is opened in Adobe Acrobat or Preview, the user can open the "Layers" panel and toggle the visibility of "Signatures", "Drawings", or "Text" independently.

### Task 4: Advanced Typography & Text Shaping Strategy
Provide a TypeScript implementation plan and code scaffold for integrating **HarfBuzz via WASM** (e.g., using `harfbuzz-wasm` or a similar client-side library). 
1. Show how to intercept the `TextAnnotation` data.
2. Show how to pass the string and font buffer to the HarfBuzz WASM module to get shaped glyph IDs and positions.
3. Show how to map these shaped glyphs into the `/FreeText` `/RC` rich text string or custom text operators to support CJK, RTL, and ligatures perfectly.

### Task 5: WebAssembly Engine Bridge Scaffold
Create `src/services/wasm-pdf-engine.bridge.ts`. 
Since `pdf-lib` lacks enterprise-grade fidelity for complex transparency and font subsetting, scaffold a TypeScript interface that wraps a WASM PDF engine (like `mupdf-wasm` or `pdfium-wasm`).
1. Define the interface for `loadDocument(buffer)`, `flattenAnnotations(doc)`, and `saveToBuffer(doc)`.
2. Add a feature flag in `usePdfComposerState` to toggle between the legacy `pdf-lib` flattening method and the new WASM high-fidelity flattening method.

**Constraints:**
- All code must run 100% in the browser (V8/WASM). No server calls.
- Maintain strict TypeScript typing.
- Ensure memory cleanup (`.cleanup()`, revoking object URLs) is handled in the WASM bridge to prevent OOM crashes on large documents.

Please provide the complete code for Tasks 1, 2, and 3, and the architectural scaffolds for Tasks 4 and 5.
**[END OF PROMPT]**

---

Here is the improved, highly technical prompt designed to be fed into an AI coding assistant (like Cursor, GitHub Copilot Workspace, or an LLM). It is specifically tailored to your existing architecture, referencing your exact file structure and the coordinate mapping logic defined in your Technical Design Document.

***

**[START OF PROMPT]**

**Role:** You are a Principal Frontend Engineer and PDF/WebAssembly Expert.
**Context:** I am adding three new advanced annotation features to the "SuperFast PDF Composer" application. The app is a 100% client-side Next.js app using `pdf-lib` for PDF manipulation and `pdf.js` for rendering. Annotations are currently baked into the PDF content stream via `src/lib/pdf-annotation-renderer.ts` using an 800px reference screen coordinate system mapped to native PDF points.

**Goal:** Implement the following three annotation tools:
1. **Redaction Masks:** Solid white rectangles to hide PDF zones (must be fully opaque and drawn *on top* of everything).
2. **Blackout Markers:** Bold, solid black freehand markers to overwrite writing (thick stroke, fully opaque).
3. **Fluorescent Highlighters (Stabilo):** Freehand underlining/highlighting markers in Yellow, Green, Pink, and Blue (must be semi-transparent to allow underlying text to remain readable).

**Please execute the following implementation tasks step-by-step. Provide complete, production-ready TypeScript/React code for each.**

### Task 1: Update Domain Models (`src/lib/types.ts`)
Extend the `Annotation` union type to include the new tools. Ensure they integrate seamlessly with the existing coordinate mapping system.
```typescript
// Add these to the Annotation union and define their interfaces:
export type RedactionMaskAnnotation = {
  id: string;
  type: 'mask';
  x: number; y: number; width: number; height: number; // Screen coords
  // No color needed, strictly white fill, no border
};

export type BlackoutMarkerAnnotation = {
  id: string;
  type: 'blackout';
  paths: { x: number; y: number }[][]; // Screen coords
  strokeWidth: number; // e.g., 12-16px for bold marker effect
};

export type HighlighterAnnotation = {
  id: string;
  type: 'highlighter';
  paths: { x: number; y: number }[][]; // Screen coords
  color: 'yellow' | 'green' | 'pink' | 'blue';
  strokeWidth: number; // e.g., 20-24px for stabilo effect
  opacity: number; // e.g., 0.35
};
```

### Task 2: Update UI & Canvas Drawing Logic
1. **`src/components/annotation-toolbar.tsx`**: Add buttons for "Mask", "Blackout", and "Highlighter". For the highlighter, include a color picker/dropdown for the 4 specific fluo colors.
2. **`src/components/annotation-page.tsx`**: Update the HTML5 Canvas drawing logic to handle these new tools. 
   * *Crucial for Highlighter:* Use `globalCompositeOperation = 'multiply'` or standard alpha blending (`ctx.globalAlpha = opacity`) so the fluo color blends naturally with the underlying PDF text.
   * *Crucial for Mask:* Ensure it draws a solid `#FFFFFF` rectangle with no stroke.

### Task 3: Refactor PDF Baking Engine (`src/lib/pdf-annotation-renderer.ts`)
This is the most critical part. You must update `applyAnnotationsToPdfPage` to handle the new types using `pdf-lib`. 

**1. Z-Index / Layering Order:**
PDF content streams draw in the order commands are issued. You MUST sort the annotations array before baking to ensure correct visual layering:
*Order:* `highlighter` (bottom) -> `text`/`drawing`/`icon` -> `blackout` -> `mask` (top).

**2. Implementation Details per Type:**
* **Highlighter (`pdf-lib` freehand with opacity):** 
  Convert paths to SVG path strings. Use `page.drawSvgPath(svgPath, { color: rgb(...), thickness: width, opacity: 0.35 })`. *Note: Ensure you map the fluo colors to accurate RGB values (e.g., Yellow: `rgb(1, 1, 0)`, Pink: `rgb(1, 0.4, 0.7)`, etc.).*
* **Blackout Marker:** 
  Convert paths to SVG path strings. Use `page.drawSvgPath(svgPath, { color: rgb(0, 0, 0), thickness: strokeWidth, lineCap: PageDrawOptions.lineCap.round, lineJoin: PageDrawOptions.lineJoin.round })` to simulate a smooth marker tip.
* **Redaction Mask:** 
  Use `page.drawRectangle({ x, y, width, height, color: rgb(1, 1, 1) })`. *Ensure `borderWidth` is 0 or undefined.*

**3. Coordinate Transformation:**
Apply the existing math from the TDD to all new shapes:
$$X_{\text{PDF}} = X_{\text{Screen}} \times S$$
$$Y_{\text{PDF}} = \text{PageHeight}_{\text{PDF}} - (Y_{\text{Screen}} \times S) - \text{ElementHeight}_{\text{PDF}}$$
*(Note: For freehand paths, you must transform every single `{x, y}` point in the `paths` array, not just the bounding box).*

### Task 4: Edge Cases & Polish
1. **Highlighter Bleed:** Ensure the highlighter paths use rounded line caps (`lineCap: 'round'`) so the ends of the strokes don't look like harsh, flat cuts.
2. **Mask Borders:** Ensure the white masks have absolutely no anti-aliased gray borders. If `pdf-lib` introduces sub-pixel rendering artifacts on `drawRectangle`, provide a workaround (e.g., expanding the rect by 0.5 points or using a slightly off-white color if pure white bleeds, though pure white is preferred).
3. **Memory/Performance:** Ensure that transforming hundreds of points in a freehand highlighter path doesn't block the main thread. If necessary, wrap the path transformation in a `setTimeout` or `requestIdleCallback`, or use a Web Worker (though for standard annotation sizes, main thread is likely fine).

**Constraints:**
- Strictly adhere to the existing file structure and TypeScript types.
- Do not alter the core `usePdfComposerState` drag-and-drop logic; only extend the annotation handling.
- Ensure all `pdf-lib` imports are correctly resolved.

Please provide the complete code for Tasks 1, 2, and 3.

**[END OF PROMPT]**