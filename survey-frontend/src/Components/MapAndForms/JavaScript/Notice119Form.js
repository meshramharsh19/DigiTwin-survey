import { useState } from "react";
import { X, Save } from "lucide-react";
import "../Style/HouseDetailsModal.css";

const initialState = {
  ownerName: "",
  ward: "",
  zone: "",
  newPropertyNo: "",
  oldPropertyNo: "",
  taxableValue: "",
  proposedTax: "",
  noticeDate: "",
};

export default function Notice119Form({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(initialState);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content professional-form">
        <div className="modal-header">
          <h3>119 Proposed Assessment Notice</h3>
          <button onClick={onClose} className="modal-close-button">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <fieldset>
            <legend>Notice Details</legend>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Owner Name</label>
                <input name="ownerName" onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Ward</label>
                <input name="ward" onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Zone</label>
                <input name="zone" onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>New Property No</label>
                <input name="newPropertyNo" onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Old Property No</label>
                <input name="oldPropertyNo" onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Taxable Value</label>
                <input name="taxableValue" type="number" onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Proposed Tax</label>
                <input name="proposedTax" type="number" onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Notice Date</label>
                <input name="noticeDate" type="date" onChange={handleChange} />
              </div>
            </div>
          </fieldset>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="button-secondary">Cancel</button>
          <button onClick={handleSave} className="button-primary">
            <Save size={16}/> Save
          </button>
        </div>
      </div>
    </div>
  );
}
