# Project Next.js WebApp ‘SuperFast PDF Composer’

## Project Overview

PDF Composer is a powerful, client-side web application designed for intuitive and secure PDF manipulation. It provides a visual, drag-and-drop interface that allows users to merge pages from multiple source documents, reorder them, sign, annotate, and compile a new PDF, all directly within the browser. Because all processing happens on the client-side, user documents are never uploaded to a server, ensuring complete privacy and speed.

## Core Functionalities

1. **Dual-Pane PDF Management**: A side-by-side view allows users to manage source documents on one side and build their new target document on the other.
2. **Multi-Format Upload with Drag & Drop**:
    * Upload PDF files to serve as page sources.
    * Upload images (JPG, PNG) which are automatically converted to PDF pages.
    * Use the drag-and-drop zone in the source panel to quickly upload multiple PDFs and images at once.
3. **Target Document Composition**: Users can either start with a blank document or upload a "base" PDF to use as a starting point.
4. **Visual Page Manipulation**:
    * **Drag and Drop**: Easily drag pages from any source document and drop them into the target document.
    * **Reordering**: Intuitively reorder pages within the target document by dragging them into the desired position.
    * **Deletion**: Quickly remove unwanted pages from the target document with a single click.
5. **Page Editing & Annotation (in Preview)**:
    * **Rotation**: Rotate pages by 90-degree increments.
    * **Annotations**: Add text and icons (checkmarks, crosses) directly onto a page. Adjust colors, font sizes, and positions with an intuitive toolbar.
    * **Digital Signatures**: Draw a signature using a mouse or touchscreen, save it in browser storage for reuse, and place it precisely on any page.
6. **Flexible Export Options**:
    * **PDF Generation**: Compile the composed pages into a new PDF and download it.
    * **Client-Side Optimization**: For large PDFs (over 6MB), the app offers an optional client-side optimization that rasterizes pages to significantly reduce file size before download. A progress bar keeps you updated.
    * **Word Conversion**: Export the text content from your composed document into an editable .docx file. (Note: This is best for text-based documents, as complex layouts and formatting will not be preserved).

## Tech Stack

The application is built on a modern, client-focused web stack:

* **Framework**: **Next.js** with the App Router, leveraging React for building a dynamic user interface.
* **Language**: **TypeScript** is used throughout for type safety, code quality, and improved developer experience.
* **UI Components**: The interface is constructed with **ShadCN UI**, a collection of accessible and reusable components built on Radix UI primitives.
* **Styling**: **Tailwind CSS** provides a utility-first approach for all styling, enabling rapid and consistent UI development.
* **PDF Manipulation**: All core PDF functionality is handled by key JavaScript libraries:
  * **pdf-lib**: For creating, modifying, signing, rotating, and assembling PDF documents.
  * **pdf.js**: For rendering PDF pages as visual thumbnails in the browser.
  * **docx**: For converting text content into .docx files for export.
* **Drag and Drop**: The interactive drag-and-drop functionality is powered by **dnd-kit**, a lightweight and modern library for React.
* **Icons**: **Lucide React** is used for a clean and consistent set of icons throughout the application.
