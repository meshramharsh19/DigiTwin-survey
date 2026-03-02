import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import "../Style/PropertyDetailsForm.css";

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
};

export default function PropertyDetailsForm({ isOpen, onClose }) {
  const [formData, setFormData] = useState(initialState);

  // ------------------------------
  // AUTO TAX CALCULATION
  // ------------------------------
  useEffect(() => {
    const area = parseFloat(formData.area) || 0;
    const rate = parseFloat(formData.rate) || 0;

    const taxableValue = area * rate;
    const deduction = taxableValue * 0.10; // 10% deduction
    const finalTaxableValue = taxableValue - deduction;

    // Example tax percentages (you can change later)
    const propertyTax = finalTaxableValue * 0.12;  // 12%
    const educationTax = finalTaxableValue * 0.02; // 2%
    const treeTax = finalTaxableValue * 0.01;      // 1%
    const fireTax = finalTaxableValue * 0.01;      // 1%

    const totalTax =
      propertyTax + educationTax + treeTax + fireTax;

    setFormData((prev) => ({
      ...prev,
      taxableValue,
      deduction,
      finalTaxableValue,
      propertyTax,
      educationTax,
      treeTax,
      fireTax,
      totalTax,
    }));
  }, [formData.area, formData.rate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    console.log("Final Property Assessment Data:", formData);

    fetch("http://localhost:5001/api/property-details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((res) => res.json())
      .then((data) => {
        alert("Property Details Saved Successfully");
        onClose();
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to Save");
      });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
  <div className="modal-content professional-form">
    <div className="modal-header">
      <h3>Main Property Assessment Entry</h3>
      <button onClick={onClose} className="modal-close-button">
        <X size={20} />
      </button>
    </div>

    <div className="modal-body">

      {/* SECTION 1 */}
      <fieldset>
        <legend>Owner Details</legend>
        <div className="form-grid-2">

          <div className="form-group">
            <label>Owner Name</label>
            <input name="ownerName" onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Occupier Name</label>
            <input name="occupierName" onChange={handleChange} />
          </div>

          <div className="form-group full-width">
            <label>Address</label>
            <textarea name="address" onChange={handleChange} rows="2" />
          </div>

          <div className="form-group">
            <label>Mobile</label>
            <input name="mobile" onChange={handleChange} />
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

        </div>
      </fieldset>

      {/* SECTION 2 */}
      <fieldset>
        <legend>Property Structure</legend>
        <div className="form-grid-3">

          <div className="form-group">
            <label>Usage Type</label>
            <select name="usageType" onChange={handleChange}>
              <option>Residential</option>
              <option>Commercial</option>
              <option>Industrial</option>
            </select>
          </div>

          <div className="form-group">
            <label>Construction Type</label>
            <select name="constructionType" onChange={handleChange}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
            </select>
          </div>

          <div className="form-group">
            <label>Construction Year</label>
            <input type="number" name="constructionYear" onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Area (Sq.m)</label>
            <input type="number" name="area" onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Rate</label>
            <input type="number" name="rate" onChange={handleChange} />
          </div>

        </div>
      </fieldset>

      {/* SECTION 3 */}
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
            <span>Property Tax (12%)</span>
            <strong>₹ {formData.propertyTax.toFixed(2)}</strong>
          </div>

          <div>
            <span>Education Tax (2%)</span>
            <strong>₹ {formData.educationTax.toFixed(2)}</strong>
          </div>

          <div>
            <span>Tree Tax (1%)</span>
            <strong>₹ {formData.treeTax.toFixed(2)}</strong>
          </div>

          <div>
            <span>Fire Tax (1%)</span>
            <strong>₹ {formData.fireTax.toFixed(2)}</strong>
          </div>

          <div className="total-tax">
            <span>Total Tax</span>
            <strong>₹ {formData.totalTax.toFixed(2)}</strong>
          </div>

        </div>
      </fieldset>

    </div>

    <div className="modal-footer">
      <button onClick={onClose} className="button-secondary">
        Cancel
      </button>
      <button onClick={handleSave} className="button-primary">
        <Save size={16} /> Save
      </button>
    </div>
  </div>
</div>

  );
}
