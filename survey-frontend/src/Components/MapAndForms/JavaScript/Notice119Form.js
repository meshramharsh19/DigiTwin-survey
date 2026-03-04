import { useState } from "react";
import { X, Save } from "lucide-react";
import axios from "axios";
import "../Style/HouseDetailsModal.css";


import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

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

export default function Notice119Form({ isOpen, onClose }) {

  const [formData, setFormData] = useState(initialState);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };


  const handleSave = async () => {

    try {

      await axios.post(
        "http://localhost:5001/api/notice119",
        formData
      );

      alert("119 Notice saved successfully");

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
          <h3>119 Proposed Assessment Notice</h3>

          <button onClick={onClose} className="modal-close-button">
            <X size={20}/>
          </button>
        </div>

        <div className="modal-body">

          <fieldset>
            <legend>Notice Details</legend>

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

              <div className="form-group">
                <label>Taxable Value</label>
                <input
                  type="number"
                  name="taxableValue"
                  value={formData.taxableValue}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Proposed Tax</label>
                <input
                  type="number"
                  name="proposedTax"
                  value={formData.proposedTax}
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