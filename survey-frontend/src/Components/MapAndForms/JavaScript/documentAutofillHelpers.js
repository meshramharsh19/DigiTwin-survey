import { useRef, useState } from "react";
import { X, UploadCloud, Sparkles } from "lucide-react";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export function mergeDraftValues(previousState, draft = {}) {
  const nextState = { ...previousState };

  Object.entries(draft).forEach(([fieldName, value]) => {
    const hasValue =
      value !== undefined &&
      value !== null &&
      !(typeof value === "string" && value.trim() === "");

    if (hasValue) {
      nextState[fieldName] = value;
    }
  });

  return nextState;
}

export function formatFileSize(sizeInBytes) {
  if (!sizeInBytes && sizeInBytes !== 0) return "";
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DOCUMENT_BOUNDARY_PATTERNS = [
  /owner\s*name/i,
  /occupier\s*name/i,
  /address/i,
  /mobile/i,
  /phone/i,
  /ward/i,
  /zone/i,
  /new\s*property\s*no\.?/i,
  /old\s*property\s*no\.?/i,
  /property\s*no\.?/i,
  /property\s*number/i,
  /usage\s*type/i,
  /construction\s*type/i,
  /construction\s*year/i,
  /year\s*of\s*construction/i,
  /area/i,
  /built\s*up\s*area/i,
  /rate/i,
  /taxable\s*value/i,
  /proposed\s*tax/i,
  /notice\s*date/i,
  /notice\s*reason/i,
  /appeal\s*reason/i,
  /reason\s*for\s*appeal/i,
  /hearing\s*date/i,
  /date\s*of\s*hearing/i,
  /hearing\s*time/i,
  /hearing\s*location/i,
  /location/i
];

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSectionValue(text, labelPatterns, allLabelPatterns) {
  const normalizedText = normalizeOcrText(text);
  let bestMatch = null;

  for (const pattern of labelPatterns) {
    const match = normalizedText.match(pattern);
    if (match && typeof match.index === "number") {
      const labelEndIndex = match.index + match[0].length;
      if (
        !bestMatch ||
        match.index < bestMatch.index ||
        (match.index === bestMatch.index && labelEndIndex > bestMatch.labelEndIndex)
      ) {
        bestMatch = {
          index: match.index,
          labelEndIndex
        };
      }
    }
  }

  if (!bestMatch) return "";

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

function postProcessValue(value, fieldDefinition = {}) {
  const candidate = String(value || "").trim();
  if (!candidate) return "";

  if (fieldDefinition.valuePattern) {
    const matchedValue = candidate.match(fieldDefinition.valuePattern);
    if (matchedValue && matchedValue[0]) {
      return String(matchedValue[0]).trim();
    }
  }

  if (fieldDefinition.type === "number") {
    const matchedNumber = candidate.match(/-?\d+(?:[.,]\d+)?/);
    return matchedNumber ? matchedNumber[0] : "";
  }

  if (fieldDefinition.type === "date") {
    const matchedDate = candidate.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{2}[/.-]\d{2}[/.-]\d{4}\b|\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/);
    return matchedDate ? matchedDate[0] : candidate;
  }

  if (fieldDefinition.type === "time") {
    const matchedTime = candidate.match(/\b\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)?\b/);
    return matchedTime ? matchedTime[0] : candidate;
  }

  if (fieldDefinition.transform) {
    return fieldDefinition.transform(candidate);
  }

  return candidate;
}

export function buildDraftFromText(documentText, fieldDefinitions = []) {
  const allLabelPatterns = [...fieldDefinitions.flatMap((definition) => definition.patterns || []), ...DOCUMENT_BOUNDARY_PATTERNS];

  return fieldDefinitions.reduce((draft, definition) => {
    const sectionValue = extractSectionValue(documentText, definition.patterns || [], allLabelPatterns);
    draft[definition.name] = postProcessValue(sectionValue, definition);
    return draft;
  }, {});
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

async function extractTextFromPdfFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true }).promise;

  let combinedText = "";
  const pageCount = Math.min(pdfDocument.numPages, 2);

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ").trim();
    combinedText += `${pageText}\n`;
  }

  const normalizedText = combinedText.trim();
  if (normalizedText && normalizedText.length > 25) {
    return normalizedText;
  }

  const firstPage = await pdfDocument.getPage(1);
  const viewport = firstPage.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await firstPage.render({ canvasContext: context, viewport }).promise;
  return ocrCanvas(canvas);
}

async function extractTextFromImageFile(file) {
  return ocrCanvas(file);
}

export async function extractLocalDocumentText(file) {
  const mimeType = file.type || "";
  const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return extractTextFromPdfFile(file);
  }

  return extractTextFromImageFile(file);
}

export function useDocumentAutofill(fieldDefinitions, { onDraft } = {}) {
  const fileInputRef = useRef(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [isAutofillPanelOpen, setIsAutofillPanelOpen] = useState(false);
  const [importError, setImportError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draftPreview, setDraftPreview] = useState(null);

  const openDocumentPicker = () => {
    fileInputRef.current?.click();
  };

  const handleDocumentImport = async (file) => {
    if (!file) return;

    setIsAutofillPanelOpen(true);
    setDocumentFile(file);
    setIsAnalyzing(true);
    setImportError("");

    try {
      const extractedText = await extractLocalDocumentText(file);
      const draft = buildDraftFromText(extractedText, fieldDefinitions);

      setDraftPreview({
        source: "local-ocr",
        extractedText,
        draft
      });

      if (onDraft) {
        onDraft(draft, extractedText);
      }

      setIsAutofillPanelOpen(false);
    } catch (error) {
      const rawMessage = error?.message || "Failed to analyze the uploaded file";
      setImportError(`Local OCR could not read this file: ${rawMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDocumentChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleDocumentImport(file);
    }
  };

  const handleDocumentDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleDocumentImport(file);
    }
  };

  const handleDocumentDragOver = (event) => {
    event.preventDefault();
  };

  return {
    fileInputRef,
    documentFile,
    isAutofillPanelOpen,
    setIsAutofillPanelOpen,
    importError,
    isAnalyzing,
    draftPreview,
    openDocumentPicker,
    handleDocumentImport,
    handleDocumentChange,
    handleDocumentDrop,
    handleDocumentDragOver
  };
}

export function DocumentAutofillOverlay({
  isOpen,
  onClose,
  title,
  description,
  fileInputRef,
  openDocumentPicker,
  documentFile,
  isAnalyzing,
  importError,
  draftPreview,
  handleDocumentChange,
  handleDocumentDrop,
  handleDocumentDragOver
}) {
  if (!isOpen) return null;

  return (
    <div className="autofill-overlay-layer" onClick={onClose}>
      <section
        className="document-import-panel document-import-panel--overlay"
        onClick={(event) => event.stopPropagation()}
        onDrop={handleDocumentDrop}
        onDragOver={handleDocumentDragOver}
      >
        <div className="document-import-copy document-import-copy--compact">
          <div className="document-import-head-row">
            <div className="document-import-eyebrow">
              <Sparkles size={14} />
              <span>Document auto-fill</span>
            </div>
            <button
              type="button"
              className="document-overlay-close"
              onClick={onClose}
              aria-label="Close document autofill"
            >
              <X size={16} />
            </button>
          </div>

          <h4>{title}</h4>
          <p>{description}</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleDocumentChange}
          className="document-file-input"
        />

        <button
          type="button"
          className={`document-upload-button ${isAnalyzing ? "is-working" : ""}`}
          onClick={openDocumentPicker}
          onDrop={handleDocumentDrop}
          onDragOver={handleDocumentDragOver}
        >
          <UploadCloud size={20} />
          <span>
            {documentFile ? "Replace uploaded hardcopy" : "Upload hardcopy to auto-fill"}
          </span>
          <small>
            {documentFile
              ? `${documentFile.name} • ${formatFileSize(documentFile.size)}`
              : "PNG, JPG, JPEG, or PDF"}
          </small>
        </button>

        {importError && <div className="document-import-error">{importError}</div>}

        {draftPreview?.draft && (
          <div className="document-preview">
            <div className="document-preview-header">
              <strong>Extracted draft</strong>
              <span>Source: {draftPreview.source}</span>
            </div>

            <div className="document-preview-grid">
              {Object.entries(draftPreview.draft)
                .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
                .slice(0, 6)
                .map(([key, value]) => (
                  <div key={key} className="document-preview-item">
                    <span>{key}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}