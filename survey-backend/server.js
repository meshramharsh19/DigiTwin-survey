// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '10mb' })); // increase if KML / payloads are big
app.use(express.urlencoded({ extended: true }));

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/survey';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Successfully connected to MongoDB! (Database: survey)'))
  .catch(err => console.error('MongoDB connection error:', err));

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
  kmlFileId: { type: mongoose.Schema.Types.ObjectId, default: null }, // GridFS file id
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
}, { timestamps: true });

surveySchema.index({ location: '2dsphere' });

const SurveyEntry = mongoose.model('SurveyEntry', surveySchema);

// --- Helper: upload KML string to GridFS, returns Promise that resolves to ObjectId string ---
function uploadKmlToGridFS(fileName, kmlString) {
  return new Promise((resolve, reject) => {
    // ensure mongoose connection db is ready
    const db = mongoose.connection.db;
    if (!db) return reject(new Error('MongoDB not connected'));

    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'kmlFiles' });

    const buffer = Buffer.from(kmlString, 'utf8');
    const uploadStream = bucket.openUploadStream(fileName, {
      contentType: 'application/vnd.google-earth.kml+xml',
      metadata: { uploadedAt: new Date() }
    });

    uploadStream.end(buffer);

    uploadStream.on('finish', () => {
      // uploadStream.id is an ObjectId
      resolve(uploadStream.id);
    });

    uploadStream.on('error', (err) => {
      reject(err);
    });
  });
}

// --- API Endpoint (React yahaan data bhejega) ---
app.post('/api/save-survey', async (req, res) => {
  try {
    console.log('Received data for "survey" DB:', req.body);

    const data = req.body;

    // Build survey object (validate or sanitize fields as required)
    const surveyObj = {
      propertyNumber: data.propertyNumber || data.houseNumber || '',
      assessmentYear: data.assessmentYear || '',
      oldAssessmentValue: data.oldAssessmentValue || '',
      oldAssessmentYear: data.oldAssessmentYear || '',
      ownerName: data.ownerName || '',
      ownerUID: data.ownerUID || '',
      ownerType: data.ownerType || '',
      occupierName: data.occupierName || '',
      occupierUID: data.occupierUID || '',
      propertyAddress: data.propertyAddress || '',
      propertyName: data.propertyName || '',
      pinCode: data.pinCode || '',
      latitude: data.location && Array.isArray(data.location.coordinates) ? String(data.location.coordinates[1]) : (data.latitude || ''),
      longitude: data.location && Array.isArray(data.location.coordinates) ? String(data.location.coordinates[0]) : (data.longitude || ''),
      propertyCategory: data.propertyCategory || '',
      natureOfProperty: data.natureOfProperty || '',
      usageOfProperty: data.usageOfProperty || '',
      ageOfBuilding: data.ageOfBuilding || '',
      mobileNumber: data.mobileNumber || '',
      email: data.email || '',
      totalArea: data.totalArea || '',
      yearOfConstruction: data.yearOfConstruction || '',
      floorNumber: data.floorNumber || '',
      floorArea: data.floorArea || '',
      floorConstructionType: data.floorConstructionType || '',
      floorUseType: data.floorUseType || '',
      shopOfficeNumber: data.shopOfficeNumber || '',
      accuracy: data.accuracy || null,
      kmlData: undefined, // will set below
      kmlFileId: null,
      location: data.location || { type: 'Point', coordinates: [0, 0] },
    };

    // If frontend sent full KML text, try uploading to GridFS
    if (typeof data.kmlData === 'string' && data.kmlData.trim().length > 0) {
      const fileName = `${surveyObj.propertyNumber || surveyObj.propertyName || 'survey'}.kml`;
      try {
        const fileId = await uploadKmlToGridFS(fileName, data.kmlData);
        surveyObj.kmlFileId = fileId;
        // store a small preview (first 20k chars) to avoid huge documents
        surveyObj.kmlData = data.kmlData.length > 20000 ? data.kmlData.slice(0, 20000) : data.kmlData;
      } catch (uploadErr) {
        console.error('GridFS upload error — falling back to storing KML text in doc:', uploadErr);
        // fallback: store full KML text in doc (if acceptable)
        surveyObj.kmlData = data.kmlData;
      }
    }

    const savedSurvey = await SurveyEntry.create(surveyObj);
    console.log('Data saved:', savedSurvey);
    res.status(201).json({
      message: 'Survey saved successfully!',
      data: savedSurvey,
      kmlFileId: savedSurvey.kmlFileId || null
    });

  } catch (error) {
    console.error('Error saving to DB:', error);
    // If Mongoose validation error, return 400 with message
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', error: error.message });
    }
    res.status(500).json({ message: 'Error saving data', error: error.message });
  }
});

// --- Standalone endpoint: upload arbitrary KML string to GridFS ---
app.post('/api/kml/grid-upload', async (req, res) => {
  try {
    const { fileName, kmlString } = req.body;
    if (!fileName || !kmlString) return res.status(400).json({ message: 'Missing fileName or kmlString' });

    const fileId = await uploadKmlToGridFS(fileName, kmlString);
    res.json({ message: 'Uploaded to GridFS', fileId: fileId.toString(), fileName });
  } catch (err) {
    console.error('GridFS upload failed:', err);
    res.status(500).json({ message: 'GridFS upload failed', error: err.message });
  }
});

// --- Download GridFS file by filename ---
app.get('/api/kml/download/byname/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const db = mongoose.connection.db;
    if (!db) return res.status(500).send('MongoDB not connected');

    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'kmlFiles' });

    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const downloadStream = bucket.openDownloadStreamByName(filename);
    downloadStream.on('error', (err) => {
      console.error('GridFS download error:', err);
      return res.status(404).send('File not found');
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// --- Get saved surveys ---
app.get('/api/get-surveys', async (req, res) => {
  try {
    const surveys = await SurveyEntry.find({}).sort({ createdAt: -1 }).limit(100);
    res.status(200).json(surveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  }
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
