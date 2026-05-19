import { useState, useEffect, useRef } from "react";
import { X, Save, Sparkles, UploadCloud } from "lucide-react";
import axios from "axios";
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import "../Style/PropertyDetailsForm.css";

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";
const OCR_PAGE_LIMIT = 2;

const initialState = {
  ownerName: "",
  occupierName: "",
  address: "",
  mobile: "",
  ward: "",
  zone: "",
  newPropertyNo: "",
  oldPropertyNo: "",

  usageType: "Residential",
  constructionType: "A",
  constructionYear: "",
  area: "",
  rate: "",

  taxableValue: 0,
  deduction: 0,
  finalTaxableValue: 0,
  propertyTax: 0,
  educationTax: 0,
  treeTax: 0,
  fireTax: 0,
  totalTax: 0,

   latitude: "",
  longitude: ""
};

const AUTOFILL_FIELDS = [
  "ownerName",
  "occupierName",
  "address",
  "mobile",
  "ward",
  "zone",
  "newPropertyNo",
  "oldPropertyNo",
  "usageType",
  "constructionType",
  "constructionYear",
  "area",
  "rate",
  "latitude",
  "longitude"
];

function applyDraftToForm(previousState, draft = {}) {
  const nextState = { ...previousState };

  AUTOFILL_FIELDS.forEach((fieldName) => {
    const value = draft[fieldName];
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

function formatFileSize(sizeInBytes) {
  if (!sizeInBytes && sizeInBytes !== 0) return "";
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLabeledValue(text, labelPatterns, allLabelPatterns) {
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

function extractDraftFromText(documentText = "") {
  const text = String(documentText || "");

  const fieldLabelPatterns = {
    ownerName: [/owner\s*name/i, /name\s*of\s*owner/i],
    occupierName: [/occupier\s*name/i],
    address: [/address/i],
    mobile: [/mobile/i, /phone/i],
    ward: [/ward/i],
    zone: [/zone/i],
    newPropertyNo: [/new\s*property\s*no\.?/i, /property\s*no\.?/i],
    oldPropertyNo: [/old\s*property\s*no\.?/i],
    usageType: [/usage\s*type/i],
    constructionType: [/construction\s*type/i],
    constructionYear: [/construction\s*year/i, /year\s*of\s*construction/i],
    area: [/area/i, /built\s*up\s*area/i],
    rate: [/rate/i]
  };

  const allLabelPatterns = Object.values(fieldLabelPatterns).flat();

  return {
    ownerName: extractLabeledValue(text, fieldLabelPatterns.ownerName, allLabelPatterns),
    occupierName: extractLabeledValue(text, fieldLabelPatterns.occupierName, allLabelPatterns),
    address: extractLabeledValue(text, fieldLabelPatterns.address, allLabelPatterns),
    mobile: extractLabeledValue(text, fieldLabelPatterns.mobile, allLabelPatterns).match(/[0-9+\-()\s]{7,}/)?.[0]?.trim() || "",
    ward: extractLabeledValue(text, fieldLabelPatterns.ward, allLabelPatterns).match(/[0-9A-Za-z]+/)?.[0]?.trim() || "",
    zone: extractLabeledValue(text, fieldLabelPatterns.zone, allLabelPatterns).match(/[0-9A-Za-z]+/)?.[0]?.trim() || "",
    newPropertyNo: extractLabeledValue(text, fieldLabelPatterns.newPropertyNo, allLabelPatterns).match(/[0-9A-Za-z/-]+/)?.[0]?.trim() || "",
    oldPropertyNo: extractLabeledValue(text, fieldLabelPatterns.oldPropertyNo, allLabelPatterns).match(/[0-9A-Za-z/-]+/)?.[0]?.trim() || "",
    usageType: extractLabeledValue(text, fieldLabelPatterns.usageType, allLabelPatterns).match(/[A-Za-z]+/)?.[0]?.trim() || "",
    constructionType: extractLabeledValue(text, fieldLabelPatterns.constructionType, allLabelPatterns).match(/[A-Za-z0-9]+/)?.[0]?.trim() || "",
    constructionYear: extractLabeledValue(text, fieldLabelPatterns.constructionYear, allLabelPatterns).match(/[0-9]{4}/)?.[0]?.trim() || "",
    area: extractLabeledValue(text, fieldLabelPatterns.area, allLabelPatterns).match(/[0-9.,]+/)?.[0]?.trim() || "",
    rate: extractLabeledValue(text, fieldLabelPatterns.rate, allLabelPatterns).match(/[0-9.,]+/)?.[0]?.trim() || ""
  };
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

async function extractTextFromImageFile(file) {
  return ocrCanvas(file);
}

async function extractLocalDocumentText(file) {
  const mimeType = file.type || "";
  const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return extractTextFromPdfFile(file);
  }

  return extractTextFromImageFile(file);
}

export default function PropertyDetailsForm({ isOpen, onClose, polygonLocation }) {

  const [formData, setFormData] = useState(initialState);
  const fileInputRef = useRef(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [isAutofillPanelOpen, setIsAutofillPanelOpen] = useState(false);
  const [importError, setImportError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draftPreview, setDraftPreview] = useState(null);

  useEffect(() => {
  if (polygonLocation) {
    setFormData(prev => ({
      ...prev,
      latitude: polygonLocation.latitude,
      longitude: polygonLocation.longitude
    }));
  }
}, [polygonLocation]);

  const navigate = useNavigate();

  // -------------------------
  // AUTO TAX CALCULATION
  // -------------------------
  useEffect(() => {

    const area = parseFloat(formData.area) || 0;
    const rate = parseFloat(formData.rate) || 0;

    const taxableValue = area * rate;
    const deduction = taxableValue * 0.10;

    const finalTaxableValue = taxableValue - deduction;

    const propertyTax = finalTaxableValue * 0.12;
    const educationTax = finalTaxableValue * 0.02;
    const treeTax = finalTaxableValue * 0.01;
    const fireTax = finalTaxableValue * 0.01;

    const totalTax =
      propertyTax +
      educationTax +
      treeTax +
      fireTax;

    setFormData(prev => ({
      ...prev,
      taxableValue,
      deduction,
      finalTaxableValue,
      propertyTax,
      educationTax,
      treeTax,
      fireTax,
      totalTax
    }));

  }, [formData.area, formData.rate]);

  // This is the document-to-form bridge: upload a scan, extract text locally,
  // then merge only the filled fields into the current form.
  const handleDocumentImport = async (file) => {
    if (!file) return;

    setIsAutofillPanelOpen(true);
    setDocumentFile(file);
    setIsAnalyzing(true);
    setImportError("");

    try {
      const extractedText = await extractLocalDocumentText(file);
      const draft = extractDraftFromText(extractedText);

      setDraftPreview({
        source: "local-ocr",
        extractedText,
        draft
      });

      setFormData((previousState) => applyDraftToForm(previousState, draft));

      // Close the upload overlay after a successful autofill so the user
      // lands directly on the filled form fields.
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

  const openDocumentPicker = () => {
    fileInputRef.current?.click();
  };


  const handleChange = (e) => {

    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

  };



  // -------------------------
  // SAVE TO BACKEND
  // -------------------------
  const handleSave = async () => {

    try {

      // include polygon geometry if available so backend can persist full polygon
      const payload = { ...formData };
      if (polygonLocation && polygonLocation.geometry) {
        payload.geometry = polygonLocation.geometry;
        payload.polygonCoordinates = polygonLocation.coordinates;
      }

      await axios.post(
        `${API_BASE_URL}/api/property-details`,
        payload
      );

      alert("Property details saved successfully");

      setFormData(initialState);

      onClose();

    } catch (error) {

      console.error(error);

      alert("Failed to save property details");

    }

  };


  if (!isOpen) return null;



  return (
<div className="modal-overlay">
<div className={`modal-content professional-form ${isAutofillPanelOpen ? "autofill-open" : ""}`}>

        <div className="modal-header">
          <button onClick={() => navigate(0)} className="modal-close-button" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <h3 className="modal-title">Main Property Assessment Entry</h3>
          <button onClick={onClose} className="modal-close-button" aria-label="Close">
            <X size={18} />
          </button>
        </div>

<div className="modal-body">

<div className={`property-form-shell ${isAutofillPanelOpen ? "is-blurred" : ""}`}>

<fieldset>
<legend>Owner Details</legend>

<div className="form-grid-2">

<div className="form-group">
<label>Owner Name</label>
<input
name="ownerName"
value={formData.ownerName}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Occupier Name</label>
<input
name="occupierName"
value={formData.occupierName}
onChange={handleChange}
/>
</div>

<div className="form-group full-width">
<label>Address</label>
<textarea
name="address"
rows="2"
value={formData.address}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Mobile</label>
<input
name="mobile"
value={formData.mobile}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Ward</label>
<input
name="ward"
value={formData.ward}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Zone</label>
<input
name="zone"
value={formData.zone}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>New Property No</label>
<input
name="newPropertyNo"
value={formData.newPropertyNo}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Old Property No</label>
<input
name="oldPropertyNo"
value={formData.oldPropertyNo}
onChange={handleChange}
/>
</div>

</div>
</fieldset>


<fieldset>
<legend>Property Structure</legend>

<div className="form-grid-3">

<div className="form-group">
<label>Usage Type</label>
<select
name="usageType"
value={formData.usageType}
onChange={handleChange}
>
<option>Residential</option>
<option>Commercial</option>
<option>Industrial</option>
</select>
</div>

<div className="form-group">
<label>Construction Type</label>
<select
name="constructionType"
value={formData.constructionType}
onChange={handleChange}
>
<option value="A">A</option>
<option value="B">B</option>
<option value="C">C</option>
<option value="D">D</option>
<option value="E">E</option>
</select>
</div>

<div className="form-group">
<label>Construction Year</label>
<input
type="number"
name="constructionYear"
value={formData.constructionYear}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Area (Sq.m)</label>
<input
type="number"
name="area"
value={formData.area}
onChange={handleChange}
/>
</div>

<div className="form-group">
<label>Rate</label>
<input
type="number"
name="rate"
value={formData.rate}
onChange={handleChange}
/>
</div>

</div>
</fieldset>


<fieldset className="tax-section">

<legend>Tax Calculation (System Generated)</legend>

<div className="tax-grid">

<div>
<span>Taxable Value</span>
<strong>₹ {formData.taxableValue.toFixed(2)}</strong>
</div>

<div>
<span>10% Deduction</span>
<strong>₹ {formData.deduction.toFixed(2)}</strong>
</div>

<div>
<span>Final Taxable Value</span>
<strong>₹ {formData.finalTaxableValue.toFixed(2)}</strong>
</div>

<div>
<span>Property Tax</span>
<strong>₹ {formData.propertyTax.toFixed(2)}</strong>
</div>

<div>
<span>Education Tax</span>
<strong>₹ {formData.educationTax.toFixed(2)}</strong>
</div>

<div>
<span>Tree Tax</span>
<strong>₹ {formData.treeTax.toFixed(2)}</strong>
</div>

<div>
<span>Fire Tax</span>
<strong>₹ {formData.fireTax.toFixed(2)}</strong>
</div>

<div className="total-tax">
<span>Total Tax</span>
<strong>₹ {formData.totalTax.toFixed(2)}</strong>
</div>

</div>

</fieldset>

</div>

</div>

<div className={`modal-footer ${isAutofillPanelOpen ? "is-blurred" : ""}`}>

<button
type="button"
onClick={() => setIsAutofillPanelOpen((previousState) => !previousState)}
className="button-ghost footer-autofill-button"
>
<UploadCloud size={16} /> {isAutofillPanelOpen ? "Hide Doc Autofill" : "Doc Autofill"}
</button>

<button onClick={onClose} className="button-secondary">
Cancel
</button>

<button onClick={handleSave} className="button-primary">
<Save size={16}/> Save
</button>

</div>

{isAutofillPanelOpen && (
<div className="autofill-overlay-layer" onClick={() => setIsAutofillPanelOpen(false)}>
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
        onClick={() => setIsAutofillPanelOpen(false)}
      >
        <X size={16} />
      </button>
    </div>

    <h4>Upload hardcopy, auto-fill the form</h4>
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
)}

</div>
</div>
  );
}