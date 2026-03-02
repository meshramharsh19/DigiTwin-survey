import { useState } from "react";
import { X, Save } from "lucide-react";
import "../Style/HouseDetailsModal.css";

const initialState = {
  ownerName: "",
  address: "",
  ward: "",
  zone: "",
  hearingDate: "",
  hearingTime: "",
  hearingLocation: "",
};

export default function HearingNoticeForm({ isOpen, onClose, onSave }) {
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
          <h3>Hearing Notice</h3>
          <button onClick={onClose} className="modal-close-button">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <fieldset>
            <legend>Hearing Details</legend>
            <div className="form-grid-2">

              <div className="form-group">
                <label>Owner Name</label>
                <input name="ownerName" onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Address</label>
                <input name="address" onChange={handleChange} />
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
                <label>Hearing Date</label>
                <input name="hearingDate" type="date" onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Hearing Time</label>
                <input name="hearingTime" type="time" onChange={handleChange} />
              </div>

              <div className="form-group full-width">
                <label>Hearing Location</label>
                <input name="hearingLocation" onChange={handleChange} />
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
