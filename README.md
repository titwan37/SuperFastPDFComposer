# PDF Composer

PDF Composer is a web-based tool for visually manipulating PDF documents. It allows users to upload multiple PDFs, drag and drop pages to reorder or merge them, and download the final composed document. All processing is done securely on the client-side for speed and privacy.

## Features

- **Dual Pane Layout**: View source PDFs and the target composition side-by-side.
- **PDF Upload**: Upload source PDFs and a base PDF for the target document.
- **Page Thumbnails**: Visual preview of each page in the PDF.
- **Drag & Drop Interface**:
    - Drag pages from source documents to the target document.
    - Reorder pages within the target document.
- **Page Deletion**: Remove pages from the target document.
- **PDF Composition**: Merge and compile the pages in the target pane into a new PDF.
- **Download**: Download the final composed PDF document.
- **Client-Side Processing**: All PDF manipulation happens in the browser, ensuring user data remains private.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with React)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [ShadCN UI](https://ui.shadcn.com/)
- **Drag & Drop**: [dnd-kit](https://dndkit.com/)
- **PDF Manipulation**: [pdf-lib](https://pdf-lib.js.org/) and [pdf.js](https://mozilla.github.io/pdf.js/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- npm

### Installation & Running Locally

1.  **Clone the repository**
    ```sh
    git clone https://github.com/your_username/pdf-composer.git
    ```
2.  **Navigate to the project directory**
    ```sh
    cd pdf-composer
    ```
3.  **Install NPM packages**
    ```sh
    npm install
    ```
4.  **Run the development server**
    ```sh
    npm run dev
    ```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## How to Use

1.  **Add Source PDF**: Click the "Add PDF" button in the "Source Documents" pane to upload a PDF from your computer. You can add multiple source documents.
2.  **Compose Your Document**:
    - Drag pages from any source document on the left and drop them into the "New Target Document" pane on the right.
    - To use an existing PDF as a starting point, click the "Load Base" button in the target pane.
    - Reorder pages within the target pane by dragging and dropping them.
    - Delete a page by hovering over it and clicking the trash icon.
3.  **Download**: Once you are happy with the composition, click the "Download" button to generate and save your new PDF.

