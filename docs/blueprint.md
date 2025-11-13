# **App Name**: PDF Composer

## Core Features:

- Source PDF Upload and Rendering: Allows users to upload a PDF from their local drive and renders its pages as thumbnails in the left pane.
- Target PDF Upload and Rendering: Allows users to upload a PDF to use as a base document or creates a new document in the right pane and renders its pages as thumbnails.
- Drag and Drop Page Reordering: Enables users to drag and drop pages from the source pane to the target pane and reorder pages within the target pane.
- Page Deletion: Allows users to delete pages from the target pane.
- PDF Composition and Download: Compiles the pages in the target pane into a new PDF byte array, prompts for a filename, and allows the user to download it.

## Style Guidelines:

- Primary color: Indigo (#4F46E5) to give a professional and focused feel.
- Background color: Light gray (#F9FAFB), creating a clean and non-distracting backdrop.
- Accent color: Purple (#A855F7) for interactive elements, providing visual interest and signaling interactivity.
- Font pairing: 'Inter' (sans-serif) for both headings and body text due to its modern and readable appearance.
- Lucide-React icons for actions like Upload, Download, Delete, and Move; provide intuitive visual cues.
- Dual-pane layout (Source/Target) with responsive adjustments for smaller screens (vertical stacking or tabbed interface).
- Subtle 'ghost' image during drag and drop; clear highlight on drop zones for visual feedback.