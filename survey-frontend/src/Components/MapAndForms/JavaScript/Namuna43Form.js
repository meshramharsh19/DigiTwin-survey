import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import axios from "axios";
import "../Style/HouseDetailsModal.css";

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const initialState = {
  ownerName: "",
  ward: "",
  zone: "",
  propertyNo: "",
  noticeReason: "",
  noticeDate: "",
  latitude: "",
  longitude: "",
  polygonGeometry: null,
  polygonCoordinates: null
};

export default function Namuna43Form({ isOpen, onClose, polygonLocation }) {

  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
  if (polygonLocation) {
    setFormData(prev => ({
      ...prev,
      latitude: polygonLocation.latitude,
      longitude: polygonLocation.longitude,
      polygonGeometry: polygonLocation.geometry || null,
      polygonCoordinates: polygonLocation.coordinates || null
    }));
  }
  }, [polygonLocation]);
  
  const navigate = useNavigate();
  
  const handleChange = (e) =>
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

  const handleSave = async () => {

    try {

      await axios.post(
        "http://localhost:5001/api/namuna43",
        formData
      );

      alert("Namuna 43 notice saved successfully");

      setFormData(initialState);

      onClose();

    } catch (error) {

      console.error(error);

      alert("Failed to save notice");

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
          <h3>Namuna 43 Notice</h3>
          <button onClick={onClose} className="modal-close-button">
            <X size={20}/>
          </button>
        </div>

        <div className="modal-body">

          <fieldset>
            <legend>Notice Information</legend>

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
                <label>Zone</label>
                <input
                  name="zone"
                  value={formData.zone}
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

              <div className="form-group full-width">
                <label>Notice Reason</label>
                <textarea
                  name="noticeReason"
                  rows="3"
                  value={formData.noticeReason}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Notice Date</label>
                <input
                  type="date"
                  name="noticeDate"
                  value={formData.noticeDate}
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