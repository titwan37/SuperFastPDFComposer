# Project Next.js WebApp ‘PDF Composer’

## Project Overview

PDF Composer is a powerful, client-side web application designed for intuitive and secure PDF manipulation. It provides a visual, drag-and-drop interface that allows users to merge pages from multiple source documents, reorder them, sign them, and compile a new PDF, all directly within the browser. Because all processing happens on the client-side, user documents are never uploaded to a server, ensuring complete privacy and speed.

## Core Functionalities

1.  **Dual-Pane PDF Management**: A side-by-side view allows users to manage source documents on one side and build their new target document on the other.
2.  **Source Document Upload**: Users can upload multiple PDF files from their local machine to act as sources for pages.
3.  **Target Document Composition**: Users can either start with a blank document or upload a "base" PDF to use as a starting point.
4.  **Visual Page Manipulation**:
    *   **Drag and Drop**: Easily drag pages from any source document and drop them into the target document.
    *   **Reordering**: Intuitively reorder pages within the target document by dragging them into the desired position.
    *   **Deletion**: Quickly remove unwanted pages from the target document with a single click.
5.  **Digital Signature Capture**:
    *   Draw a signature using a mouse or touchscreen in a dedicated dialog.
    *   Saved signatures are stored in the browser's local storage for easy reuse.
    *   Place the signature on any page within the target document, with controls for left, center, or right alignment and a horizontal offset for precise positioning.
6.  **PDF Generation and Download**: Once the document is arranged and signed, users can compile the pages into a single new PDF and download it to their device.

## Tech Stack

The application is built on a modern, client-focused web stack:

*   **Framework**: **Next.js** with the App Router, leveraging React for building a dynamic user interface.
*   **Language**: **TypeScript** is used throughout for type safety, code quality, and improved developer experience.
*   **UI Components**: The interface is constructed with **ShadCN UI**, a collection of accessible and reusable components built on Radix UI primitives.
*   **Styling**: **Tailwind CSS** provides a utility-first approach for all styling, enabling rapid and consistent UI development. The app also features a dark/light theme switcher.
*   **PDF Manipulation**: All core PDF functionality is handled by two key JavaScript libraries:
    *   **pdf-lib**: For creating, modifying, signing, and assembling PDF documents.
    *   **pdf.js**: For rendering PDF pages as visual thumbnails in the browser.
*   **Drag and Drop**: The interactive drag-and-drop functionality is powered by **dnd-kit**, a lightweight and modern library for React.
*   **Icons**: **Lucide React** is used for a clean and consistent set of icons throughout the application.
