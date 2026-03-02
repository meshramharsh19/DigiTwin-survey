import { useState } from "react";
import { X, Save } from "lucide-react";
import "../Style/HouseDetailsModal.css";

const initialState = {
  ownerName: "",
  ward: "",
  propertyNo: "",
  previousTax: "",
  revisedTax: "",
  appealReason: "",
};

export default function AppealForm({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(initialState);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content professional-form">
        <div className="modal-header">
          <h3>Appeal Form</h3>
          <button onClick={onClose} className="modal-close-button">
            <X size={20}/>
          </button>
        </div>

        <div className="modal-body">
          <fieldset>
            <legend>Appeal Details</legend>
            <div className="form-grid-2">

              <div className="form-group">
                <label>Owner Name</label>
                <input name="ownerName" onChange={handleChange}/>
              </div>

              <div className="form-group">
                <label>Ward</label>
                <input name="ward" onChange={handleChange}/>
              </div>

              <div className="form-group">
                <label>Property No</label>
                <input name="propertyNo" onChange={handleChange}/>
              </div>

              <div className="form-group">
                <label>Previous Tax</label>
                <input name="previousTax" type="number" onChange={handleChange}/>
              </div>

              <div className="form-group">
                <label>Revised Tax</label>
                <input name="revisedTax" type="number" onChange={handleChange}/>
              </div>

              <div className="form-group full-width">
                <label>Appeal Reason</label>
                <textarea name="appealReason" rows="3" onChange={handleChange}/>
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
