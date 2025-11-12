import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import '../Style/HouseDetailsModal.css'; 

const initialState = {
  propertyNumber: '',
  assessmentYear: '',
  oldAssessmentValue: '',
  oldAssessmentYear: '',
  ownerName: '',
  ownerUID: '',
  ownerType: 'Private', 
  occupierName: '',
  occupierUID: '',
  propertyAddress: '',
  propertyName: '',
  pinCode: '',
  latitude: '',
  longitude: '',
  propertyCategory: 'Owner', 
  natureOfProperty: 'Individual', 
  usageOfProperty: 'Residential', 
  ageOfBuilding: '',
  mobileNumber: '',
  email: '',
  yearOfConstruction: '',
  floorNumber: '',
  floorArea: '',
  floorConstructionType: 'RCC structure', 
  floorUseType: 'Residential', 
  shopOfficeNumber: '',
  
  photos: null,
};

export default function HouseDetailsModal({ isOpen, onClose, onSave, capturedLocation }) {
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (capturedLocation) {
      setFormData(prev => ({
        ...prev,
        latitude: capturedLocation.lat.toFixed(7),
        longitude: capturedLocation.lng.toFixed(7),
      }));
    }
  }, [capturedLocation]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: e.target.files }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveClick = () => {
    if (!formData.ownerName || !formData.propertyAddress) {
      alert('Please fill in required fields like Owner Name and Address.');
      return;
    }
    onSave(formData);
    setFormData(initialState); 
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">PTAX Data Collection</h3>
          <button onClick={onClose} className="modal-close-button"><X size={20} /></button>
        </div>

        <div className="modal-body">
          <fieldset>
            <legend>PMC Details (If available)</legend>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Property Number</label>
                <input name="propertyNumber" value={formData.propertyNumber} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Assessment Year</label>
                <input name="assessmentYear" value={formData.assessmentYear} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Old Assessment Value</label>
                <input name="oldAssessmentValue" value={formData.oldAssessmentValue} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Old Assessment Year</label>
                <input name="oldAssessmentYear" value={formData.oldAssessmentYear} onChange={handleChange} />
              </div>
            </div>
          </fieldset>

          
          <fieldset>
            <legend>Owner & Occupier Details</legend>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Property Owner Name (M)</label>
                <input name="ownerName" value={formData.ownerName} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Owner UID (M)</label>
                <input name="ownerUID" value={formData.ownerUID} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Type of Owner (M)</label>
                <select name="ownerType" value={formData.ownerType} onChange={handleChange}>
                  <option>Private</option>
                  <option>Public</option>
                  <option>State Government</option>
                  <option>Central Government</option>
                  <option>Semi Government</option>
                  <option>Municipal Corporation</option>
                  <option>Co-opp. Society (CHS)</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Name of Occupier / Tenant (M)</label>
                <input name="occupierName" value={formData.occupierName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Occupier UID (M)</label>
                <input name="occupierUID" value={formData.occupierUID} onChange={handleChange} />
              </div>
            </div>
          </fieldset>

          
          <fieldset>
            <legend>Property Address & Location</legend>
            <div className="form-group">
              <label>Address of Property (M)</label>
              <textarea name="propertyAddress" value={formData.propertyAddress} onChange={handleChange} rows="2"></textarea>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Name of the Property (M)</label>
                <input name="propertyName" value={formData.propertyName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Postal Pin code (M)</label>
                <input name="pinCode" value={formData.pinCode} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Latitude (M) (Auto-filled)</label>
                <input name="latitude" value={formData.latitude} readOnly />
              </div>
              <div className="form-group">
                <label>Longitude (M) (Auto-filled)</label>
                <input name="longitude" value={formData.longitude} readOnly />
              </div>
            </div>
          </fieldset>
          
          
          <fieldset>
            <legend>Property Classification</legend>
             <div className="form-grid-3">
               <div className="form-group">
                <label>Category of Property (M)</label>
                <select name="propertyCategory" value={formData.propertyCategory} onChange={handleChange}>
                  <option>Owner</option>
                  <option>Tenant/Occupier</option>
                  <option>Lease or Rent</option>
                </select>
              </div>
              <div className="form-group">
                <label>Nature of Property (M)</label>
                <select name="natureOfProperty" value={formData.natureOfProperty} onChange={handleChange}>
                  <option>Individual</option>
                  <option>Apartments</option>
                  <option>Row House</option>
                  <option>Building</option>
                  <option>Shopping mall</option>
                  <option>Open plot</option>
                </select>
              </div>
              <div className="form-group">
                <label>Usage of Property (M)</label>
                <select name="usageOfProperty" value={formData.usageOfProperty} onChange={handleChange}>
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Industrial</option>
                  <option>Institutional</option>
                  <option>Government</option>
                  <option>Hospital</option>
                  <option>Community Hall</option>
                  <option>Entertainment Hall</option>
                  <option>Without CC</option>
                  <option>Change of properties</option>
                  <option>Unauthorized towers</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Building Details</legend>
            <div className="form-grid-2">
               <div className="form-group">
                <label>Age of Building (M)</label>
                <input name="ageOfBuilding" type="number" value={formData.ageOfBuilding} onChange={handleChange} />
              </div>
               <div className="form-group">
                <label>Year of Construction (M)</label>
                <input name="yearOfConstruction" type="number" placeholder="e.g., 2010" value={formData.yearOfConstruction} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Total Carpet/Built-up Area (M)</label>
                <input name="totalArea" type="number" placeholder="in Sq. Meter" value={formData.totalArea} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Mobile Number (Optional)</label>
                <input name="mobileNumber" type="tel" value={formData.mobileNumber} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>E-mail ID (Optional)</label>
                <input name="email" type="email" value={formData.email} onChange={handleChange} />
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Floor Details (Add for each floor)</legend>
            <div className="form-grid-3">
              <div className="form-group">
                <label>Floor Number (M)</label>
                <input name="floorNumber" type="number" placeholder="e.g., 0 for Ground" value={formData.floorNumber} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Floor Area (M)</label>
                <input name="floorArea" type="number" placeholder="in Sq. Meter" value={formData.floorArea} onChange={handleChange} />
              </div>
               <div className="form-group">
                <label>Shop / Office No. (M)</label>
                <input name="shopOfficeNumber" value={formData.shopOfficeNumber} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Floor Construction (M)</label>
                <select name="floorConstructionType" value={formData.floorConstructionType} onChange={handleChange}>
                  <option>RCC structure</option>
                  <option>Load baring</option>
                  <option>Permanent shade</option>
                  <option>Temporary shade</option>
                </select>
              </div>
              <div className="form-group">
                <label>Floor Use Type (M)</label>
                <select name="floorUseType" value={formData.floorUseType} onChange={handleChange}>
                  <option>Residential</option>
                  <option>Commercial</option>
                  <option>Semi Commercial</option>
                  <option>Institution</option>
                  <option>Religious</option>
                  <option>Government</option>
                </select>
              </div>
            </div>
            
          </fieldset>
          
        
          <fieldset>
            <legend>Attachments</legend>
            <div className="form-group">
              <label>Photograph of Building (M)</label>
              <input name="photos" type="file" accept="image/*" multiple onChange={handleChange} />
            </div>
          </fieldset>

        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="button-secondary">Cancel</button>
          <button onClick={handleSaveClick} className="button-primary">
            <Save size={16} /> Save Survey Details
          </button>
        </div>
      </div>
    </div>
  );
}