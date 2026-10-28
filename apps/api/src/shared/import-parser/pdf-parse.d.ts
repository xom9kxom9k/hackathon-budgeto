declare module 'pdf-parse/lib/pdf-parse.js' {
  type PdfPage = { getTextContent: () => Promise<{ items: unknown[] }> };

  type PdfParser = (
    content: Buffer,
    options?: {
      max?: number;
      pagerender?: (page: PdfPage) => string | Promise<string>;
    },
  ) => Promise<{ numpages: number; text: string }>;

  const pdfParse: PdfParser;
  export = pdfParse;
}
