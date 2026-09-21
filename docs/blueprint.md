# SuperFast PDF Composer - Project Blueprint

## 1. Core Vision & Mission

**Vision**: To be the most intuitive, private, and fast browser-based tool for common PDF assembly tasks.

**Mission**: Empower users to visually merge, reorder, and edit PDF documents directly on their client machine, ensuring their data never leaves their browser, with a seamless drag-and-drop interface.

## 2. Target Audience

-   **Professionals**: Individuals who need to quickly assemble reports, combine scanned documents, or prepare presentations from various sources.
-   **Students**: Students who need to merge lecture notes, research papers, and assignments into a single document.
-   **Administrative Staff**: Anyone who handles digital paperwork and needs a quick way to reorder pages, add a signature, or make minor annotations.
-   **Privacy-Conscious Individuals**: Users who are reluctant to upload sensitive documents (e.g., contracts, financial statements) to online services.

## 3. Core Features & Functionalities

### 3.1. Document Management
-   [x] **Dual-Pane Layout**: A "Source" panel for uploaded documents and a "Target" panel for building the new document.
-   [x] **Source Upload**: Users can upload multiple source documents.
    -   [x] PDF Upload via file input.
    -   [x] Image (JPG, PNG) upload, which are automatically converted to single-page PDFs.
-   [x] **Drag-and-Drop Upload**: The entire source panel acts as a drop zone for PDFs and images.
-   [x] **Target Seeding**: Users can start with a blank target document or upload a "base" PDF to populate the target panel.

### 3.2. Page Manipulation & Composition
-   [x] **Drag from Source to Target**: Users can drag any page from any source document and drop it into the target panel.
-   [x] **Reorder in Target**: Pages within the target panel can be reordered via drag-and-drop.
-   [x] **Page Deletion**: Users can delete individual pages from the target panel.
-   [x] **Clear All**: A button to clear all pages from the target document.

### 3.3. Page-Level Editing
-   [x] **Page Preview**: A modal dialog allows users to view a high-resolution preview of any page (source or target).
-   [x] **Page Rotation**: Within the preview dialog, users can rotate a target page by 90-degree increments.
-   [x] **Digital Signatures**:
    -   [x] A signature pad dialog allows users to draw a signature.
    -   [x] The drawn signature is saved to the browser's `localStorage` for reuse.
    -   [x] Users can place the saved signature on a page, with options for position (left, center, right) and horizontal offset.
-   [x] **Annotations**:
    -   [x] An annotation mode/dialog for adding elements to a page.
    -   [x] **Text Tool**: Add text with configurable color and font size.
    -   [x] **Icon Tool**: Add simple vector icons (checkmark, cross) with configurable color and stroke width.
    -   [x] All annotations are movable and resizable directly on the page preview.

### 3.4. Exporting & Finalization
-   [x] **PDF Compilation**: Compile all pages in the target panel into a single, new PDF document.
-   [x] **Client-Side Optimization**:
    -   [x] Before downloading, if the PDF size exceeds a threshold (e.g., 6MB), a dialog prompts the user to optimize.
    -   [x] The optimization rasterizes each page into a compressed JPEG, significantly reducing file size.
    -   [x] A progress bar is displayed during the client-side optimization process.
-   [x] **Word (.docx) Conversion**:
    -   [x] Export the text content of the target document into a `.docx` file.
    -   [x] A tooltip warns the user that this feature is for text extraction only and that complex formatting and layouts will not be preserved.

## 4. Technical Stack

-   **Framework**: Next.js (App Router)
-   **Language**: TypeScript
-   **UI Library**: ShadCN UI on top of Radix UI & Tailwind CSS
-   **State Management**: React Hooks (`useState`, `useRef`, `useCallback`)
-   **Drag & Drop**: `dnd-kit`
-   **PDF Rendering**: `pdf.js`
-   **PDF Manipulation**: `pdf-lib`
-   **Word Export**: `docx`
-   **Icons**: Lucide React

## 5. User Experience & Design

-   **Theme**: A clean, professional theme with a configurable dark/light mode.
-   **Primary Colors**: Indigo for primary actions, with a light gray background.
-   **Feedback**:
    -   Toasts for notifications (success, error).
    -   Loading spinners and progress bars for long-running operations.
    -   Visual cues for drag-and-drop (highlighted drop zones).
-   **Responsiveness**: The dual-pane layout adapts to a single-column (vertical) view on smaller screens for usability.
