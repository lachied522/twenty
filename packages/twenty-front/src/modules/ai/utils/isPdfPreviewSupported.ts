// Browsers without pdfViewerEnabled predate the API but can still embed PDFs,
// so only an explicit false means unsupported
export const isPdfPreviewSupported = (): boolean =>
  typeof navigator === 'undefined' || navigator.pdfViewerEnabled !== false;
