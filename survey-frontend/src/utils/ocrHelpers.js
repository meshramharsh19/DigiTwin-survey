import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const OCR_PAGE_LIMIT = 2;

export function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractLabeledValue(text, labelPatterns, allLabelPatterns) {
  const normalizedText = normalizeOcrText(text);
  let bestMatch = null;

  for (const pattern of labelPatterns) {
    const match = normalizedText.match(pattern);
    if (match && typeof match.index === "number") {
      const labelEndIndex = match.index + match[0].length;
      if (!bestMatch || match.index < bestMatch.index || (match.index === bestMatch.index && labelEndIndex > bestMatch.labelEndIndex)) {
        bestMatch = {
          index: match.index,
          labelEndIndex
        };
      }
    }
  }

  if (!bestMatch) {
    return "";
  }

  let nextLabelIndex = normalizedText.length;
  for (const pattern of allLabelPatterns) {
    const nextMatch = normalizedText.slice(bestMatch.labelEndIndex).match(pattern);
    if (nextMatch && typeof nextMatch.index === "number") {
      const absoluteIndex = bestMatch.labelEndIndex + nextMatch.index;
      if (absoluteIndex < nextLabelIndex) {
        nextLabelIndex = absoluteIndex;
      }
    }
  }

  return normalizedText
    .slice(bestMatch.labelEndIndex, nextLabelIndex)
    .replace(/^[:\-\s]+/, "")
    .replace(/[|]+$/g, "")
    .trim();
}

export function formatFileSize(sizeInBytes) {
  if (!sizeInBytes && sizeInBytes !== 0) return "";
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function ocrCanvas(canvas) {
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(canvas);
    return result.data.text || "";
  } finally {
    await worker.terminate();
  }
}

export async function extractTextFromImageFile(file) {
  return ocrCanvas(file);
}

function getDocumentTextFromPdf(pdfDocument, pageLimit = OCR_PAGE_LIMIT) {
  return new Promise(async (resolve, reject) => {
    try {
      const pageCount = Math.min(pdfDocument.numPages, pageLimit);
      let combinedText = "";

      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ").trim();
        combinedText += `${pageText}\n`;
      }

      resolve(combinedText.trim());
    } catch (error) {
      reject(error);
    }
  });
}

export async function extractTextFromPdfFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;

  const textContent = await getDocumentTextFromPdf(pdfDocument);
  if (textContent && textContent.length > 25) {
    return textContent;
  }

  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;
  return ocrCanvas(canvas);
}

export async function extractLocalDocumentText(file) {
  const mimeType = file.type || "";
  const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return extractTextFromPdfFile(file);
  }

  return extractTextFromImageFile(file);
}
