import React from "react";
import "../Style/FormSelectionModal.css";

export default function FormSelectionModal({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Select Form Type</h3>
          <button onClick={onClose} className="modal-close-button">X</button>
        </div>

      <div className="modal-body form-selection-grid">
  <button className="form-card" onClick={() => onSelect("property")}>
    <h4>Property Details</h4>
    <p>Main Property Assessment Entry</p>
  </button>

  <button className="form-card" onClick={() => onSelect("notice119")}>
    <h4>119 Notice</h4>
    <p>Proposed Assessment Notice</p>
  </button>

  <button className="form-card" onClick={() => onSelect("hearing")}>
    <h4>Hearing Notice</h4>
    <p>Schedule Hearing for Assessment</p>
  </button>

  <button className="form-card" onClick={() => onSelect("appeal")}>
    <h4>Appeal Form</h4>
    <p>Tax Revision / Objection</p>
  </button>

  <button className="form-card" onClick={() => onSelect("namuna43")}>
    <h4>Namuna 43</h4>
    <p>Special Notice Entry</p>
  </button>
</div>

      </div>
    </div>
  );
}
