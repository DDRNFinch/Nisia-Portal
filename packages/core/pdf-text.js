/* The text of a PDF, a line at a time, in reading order: for reading a standard's KSBs out of the official document.
   Loads the PDF reader (pdf.js, packages/vendor) only when it's needed. */
const LIB = new URL("../vendor/pdfjs-4.10.38/pdf.min.mjs", import.meta.url).href;
const WORKER = new URL("../vendor/pdfjs-4.10.38/pdf.worker.min.mjs", import.meta.url).href;

export async function pdfText(file) {
  const pdfjs = await import(LIB);
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n), { items } = await page.getTextContent();
    /* Pieces of text on the same line (within a couple of points) join up, left to right; lines go top to bottom. */
    const rows = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5], x = it.transform[4];
      let row = rows.find((r) => Math.abs(r.y - y) < 2.5);
      if (!row) rows.push(row = { y, parts: [] });
      row.parts.push({ x, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    pages.push(rows.map((r) => r.parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(" ").replace(/\s+/g, " ").trim()).join("\n"));
  }
  return pages.join("\n");
}
