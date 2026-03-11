import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import axios from "axios";
import "../Style/PropertyDetailsForm.css";

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

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

export default function PropertyDetailsForm({ isOpen, onClose, polygonLocation }) {

  const [formData, setFormData] = useState(initialState);

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

      await axios.post(
        "http://localhost:5001/api/property-details",
        formData
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
<div className="modal-content professional-form">

        <div className="modal-header">
       <button
  onClick={() => navigate(0)}
  className="modal-close-button"
>
  <ArrowLeft size={20}/>
</button>
<h3>Main Property Assessment Entry</h3>
<button onClick={onClose} className="modal-close-button">
<X size={20}/>
</button>
</div>

<div className="modal-body">

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