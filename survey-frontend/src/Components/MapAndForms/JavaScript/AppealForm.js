import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import axios from "axios";
import "../Style/HouseDetailsModal.css";

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const initialState = {
  ownerName: "",
  ward: "",
  propertyNo: "",
  previousTax: "",
  revisedTax: "",
  appealReason: "",
  latitude: "",
  longitude: ""
};

export default function AppealForm({ isOpen, onClose, polygonLocation }){
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
  if (polygonLocation) {
    setFormData((prev) => ({
      ...prev,
      latitude: polygonLocation.latitude,
      longitude: polygonLocation.longitude
    }));
  }
}, [polygonLocation]);
  

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });
  const navigate = useNavigate();

  
  const handleSave = async () => {
    try {
      await axios.post("http://localhost:5001/api/appeal", formData);

      alert("Appeal saved successfully");

      setFormData(initialState);
      onClose();

    } catch (error) {
      console.error("Error saving appeal:", error);
      alert("Failed to save appeal");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content professional-form">
        <div className="modal-header">

  <button
  onClick={() => navigate(0)}
  className="modal-close-button"
>
  <ArrowLeft size={20}/>
</button>
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
                <input
                  name="ownerName"
                  value={formData.ownerName}
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
                <label>Property No</label>
                <input
                  name="propertyNo"
                  value={formData.propertyNo}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Previous Tax</label>
                <input
                  name="previousTax"
                  type="number"
                  value={formData.previousTax}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Revised Tax</label>
                <input
                  name="revisedTax"
                  type="number"
                  value={formData.revisedTax}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full-width">
                <label>Appeal Reason</label>
                <textarea
                  name="appealReason"
                  rows="3"
                  value={formData.appealReason}
                  onChange={handleChange}
                />
              </div>

            </div>
          </fieldset>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="button-secondary">
            Cancel
          </button>

          <button onClick={handleSave} className="button-primary">
            <Save size={16}/> Save
          </button>
        </div>
      </div>
    </div>
  );
}