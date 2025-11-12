const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors()); // React app se connection allow karega
app.use(express.json()); // Frontend se JSON data samajhne ke liye

// --- MongoDB Connection ---
// 
// --- (!!! YAHAN UPDATE KAREIN !!!) ---
// 
// Bas "<db_password>" ko apne asli password se badal dein.
//
const MONGO_URI = 'mongodb+srv://meshramharsh19:<db_password>@cojag.p4nxuuy.mongodb.net/survey?appName=Cojag';


mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB! (Database: survey)'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- (!!! YAHAN BADLAV KIYA GAYA HAI !!!) ---
// --- MongoDB Schema (PTAX Fields) ---
const surveySchema = new mongoose.Schema({
  // PMC Fields
  propertyNumber: { type: String }, // Isse 'houseNumber' se 'propertyNumber' kar diya hai
  assessmentYear: { type: String },
  oldAssessmentValue: { type: String },
  oldAssessmentYear: { type: String },
  
  // Owner Details
  ownerName: { type: String, required: true }, // Yeh 'M' (Mandatory) tha
  ownerUID: { type: String },
  ownerType: { type: String },
  occupierName: { type: String },
  occupierUID: { type: String },
  
  // Property Address
  propertyAddress: { type: String, required: true }, // Yeh 'M' (Mandatory) tha
  propertyName: { type: String },
  pinCode: { type: String },
  
  // GPS (Auto-filled)
  latitude: { type: String },
  longitude: { type: String },
  
  // Classification
  propertyCategory: { type: String },
  natureOfProperty: { type: String },
  usageOfProperty: { type: String },
  
  // Building Details
  ageOfBuilding: { type: String },
  mobileNumber: { type: String },
  email: { type: String },
  totalArea: { type: String },
  yearOfConstruction: { type: String },
  
  // Floor Details
  floorNumber: { type: String },
  floorArea: { type: String },
  floorConstructionType: { type: String },
  floorUseType: { type: String },
  shopOfficeNumber: { type: String },
  
  // KML and Location
  accuracy: { type: Number },
  kmlData: { type: String }, 
  location: {
    type: {
      type: String,
      enum: ['Point'], 
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  }
}, { timestamps: true }); // timestamps adds createdAt and updatedAt

surveySchema.index({ location: '2dsphere' });

const SurveyEntry = mongoose.model('SurveyEntry', surveySchema);

// --- API Endpoint (React yahaan data bhejega) ---
app.post('/api/save-survey', async (req, res) => {
  try {
    console.log('Received data for "survey" DB:', req.body);
    
    // Naya data entry banayein
    const newSurvey = new SurveyEntry(req.body);

    // Database mein save karein
    const savedSurvey = await newSurvey.save();
    
    console.log('Data saved:', savedSurvey);
    res.status(201).json({ message: 'Survey saved successfully!', data: savedSurvey });

  } catch (error) {
    // Agar validation error (jaise ownerName na ho) toh error dikhayega
    console.error('Error saving to DB:', error.message);
    res.status(500).json({ message: 'Error saving data', error: error.message });
  }
});

// --- (Future ke liye: Datqa wapas laane ka endpoint) ---
app.get('/api/get-surveys', async (req, res) => {
  try {
    const surveys = await SurveyEntry.find({});
    res.status(200).json(surveys);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  }
});


// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});