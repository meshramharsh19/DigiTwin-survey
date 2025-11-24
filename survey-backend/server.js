require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// If behind a proxy/NGINX that terminates TLS, enable this so req.protocol reflects original protocol
// app.set('trust proxy', true);

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

// ---------------------------------------------------------------------------
// Schema (kept your original fields, added centroid + style for convenience)
// ---------------------------------------------------------------------------
const surveySchema = new mongoose.Schema({
  propertyNumber: { type: String },
  assessmentYear: { type: String },
  oldAssessmentValue: { type: String },
  oldAssessmentYear: { type: String },

  ownerName: { type: String, required: true },
  ownerUID: { type: String },
  ownerType: { type: String },
  occupierName: { type: String },
  occupierUID: { type: String },

  propertyAddress: { type: String, required: true },
  propertyName: { type: String },
  pinCode: { type: String },

  latitude: { type: String },
  longitude: { type: String },

  propertyCategory: { type: String },
  natureOfProperty: { type: String },
  usageOfProperty: { type: String },

  ageOfBuilding: { type: String },
  mobileNumber: { type: String },
  email: { type: String },
  totalArea: { type: String },
  yearOfConstruction: { type: String },

  floorNumber: { type: String },
  floorArea: { type: String },
  floorConstructionType: { type: String },
  floorUseType: { type: String },
  shopOfficeNumber: { type: String },

  accuracy: { type: Number },

  kmlData: { type: String },
  kmlFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
  kmlUrl: { type: String, default: null },

  // GeoJSON Point for location
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      default: [0, 0]
    }
  },

  // convenience: centroid and style used for KML generation & quick client use
  centroid: { type: [Number], default: undefined }, // [lng, lat]
  style: {
    color: { type: String, default: '#7f7f7f' }, // "#RRGGBB"
    opacity: { type: Number, default: 0.5 },
    markerType: { type: String, default: 'square' }
  }
}, { timestamps: true });

surveySchema.index({ location: '2dsphere' });

const SurveyEntry = mongoose.model('SurveyEntry', surveySchema);

// ---------------------------------------------------------------------------
// GridFS upload helper (you already had this) - returns ObjectId
// ---------------------------------------------------------------------------
function uploadKmlToGridFS(fileName, kmlString) {
  return new Promise((resolve, reject) => {
    const db = mongoose.connection.db;
    if (!db) return reject(new Error('MongoDB not connected'));

    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'kmlFiles' });
    const buffer = Buffer.from(kmlString, 'utf8');
    const uploadStream = bucket.openUploadStream(fileName, {
      contentType: 'application/vnd.google-earth.kml+xml',
      metadata: { uploadedAt: new Date() }
    });

    uploadStream.end(buffer);

    uploadStream.on('finish', () => resolve(uploadStream.id));
    uploadStream.on('error', (err) => reject(err));
  });
}

// ---------------------------------------------------------------------------
// USAGE → STYLE mapping (adjust colors here)
// store colors as "#RRGGBB"
const USAGE_STYLES = {
  residential:          { color: '#1f77b4' }, // blue
  commercial:           { color: '#ff7f0e' }, // orange
  industrial:           { color: '#9467bd' }, // purple
  institutional:        { color: '#0000FF' }, // blue
  government:           { color: '#2ca02c' }, // green
  hospital:             { color: '#d62728' }, // red
  'community hall':     { color: '#8c564b' }, // brown
  'entertainment hall': { color: '#e377c2' }, // pink/violet
  'without cc':         { color: '#808080' }, // grey
  'change of properties': { color: '#bcbd22' }, // yellow-green
  'unauthorized towers': { color: '#7f7f7f' }, // darker grey
  default:              { color: '#00BFFF' }   // sky blue fallback
};

function getStyleForUsage(usage) {
  const key = (usage || '').toLowerCase();
  const base = USAGE_STYLES[key] || USAGE_STYLES.default;
  return { color: base.color, opacity: 0.5, markerType: 'square' };
}

// ---------------------------------------------------------------------------
// KML helpers
// - hexToKmlColor: "#RRGGBB" -> "AABBGGRR" (alphaHex='80' => 50%)
// - geojsonPolygonToKmlCoords: polygon coords -> "lon,lat,0 lon,lat,0 ..."
// - simpleCentroid: average of ring vertices
// - buildKmlForParcel: returns full KML string with style + SURVEY POINT marker
// ---------------------------------------------------------------------------
function hexToKmlColor(hex, alphaHex = '80') {
  const h = (hex || '').replace('#','');
  if (h.length !== 6) throw new Error('Invalid hex color: ' + hex);
  const r = h.slice(0,2), g = h.slice(2,4), b = h.slice(4,6);
  return (alphaHex + b + g + r).toLowerCase();
}

function geojsonPolygonToKmlCoords(polygonCoords) {
  // Accept either [ [ [lng,lat], ... ] ] or [ [lng,lat], ... ]
  const ring = Array.isArray(polygonCoords[0][0]) ? polygonCoords[0] : polygonCoords;
  const closed = ring.slice();
  const first = ring[0], last = ring[ring.length - 1];
  if (!first || !last) return '';
  if (first[0] !== last[0] || first[1] !== last[1]) closed.push([first[0], first[1]]);
  return closed.map(([lng,lat]) => `${lng},${lat},0`).join(' ');
}

function simpleCentroid(polygonCoords) {
  const ring = Array.isArray(polygonCoords[0][0]) ? polygonCoords[0] : polygonCoords;
  let sumX = 0, sumY = 0;
  for (const [x,y] of ring) { sumX += x; sumY += y; }
  const n = ring.length || 1;
  return [sumX / n, sumY / n];
}

// Minimal XML escape for name/description fields
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
       default:  return c; // explicit default to satisfy eslint "default-case"
    }
  });
}

// Build KML string with polygon + SURVEY POINT marker (inline SVG for polygon marker stays)
// NOTE: surveyObj is optional — if it contains latitude/longitude those will be used for the survey point.
// Otherwise the centroid will be used as a fallback.
function buildKmlForParcel({
  name = 'parcel',
  polygonCoords,
  colorHex = '#7f7f7f',
  description = '',
  surveyObj = {}
}) {
  const kmlColor = hexToKmlColor(colorHex, '80'); // 50% alpha
  const coords = geojsonPolygonToKmlCoords(polygonCoords);

  // ----------------------------------------------------------
  // IMPORTANT CHANGE:
  // Always use centroid of THIS polygon as the Survey Point
  // ----------------------------------------------------------
  const [centroidLon, centroidLat] = simpleCentroid(polygonCoords);
  const surveyLon = centroidLon;
  const surveyLat = centroidLat;

  // Description block (optional)
  const surveyDescriptionHtml = `<![CDATA[
    <b>Owner:</b> ${escapeXml(surveyObj?.ownerName || '')}<br/>
    <b>Occupier:</b> ${escapeXml(surveyObj?.occupierName || '')}<br/>
    <b>Address:</b> ${escapeXml(surveyObj?.propertyAddress || '')}<br/>
    <b>Usage:</b> ${escapeXml(surveyObj?.usageOfProperty || '')}<br/>
    <b>Total Area:</b> ${escapeXml(surveyObj?.totalArea || '')}
  ]]>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(name)}</name>
    <description>${escapeXml(description)}</description>

    <Style id="parcel-style">
      <LineStyle>
        <color>${kmlColor}</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>${kmlColor}</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>

    <!-- Polygon -->
    <Placemark>
      <name>${escapeXml(name)}</name>
      <styleUrl>#parcel-style</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>

    <!-- SURVEY POINT (unique for each polygon) -->
    <Placemark>
      <name>Survey Point</name>
      <description>${surveyDescriptionHtml}</description>
      <Style>
        <IconStyle>
          <scale>1.2</scale>
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
          </Icon>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>${surveyLon},${surveyLat},0</coordinates>
      </Point>
    </Placemark>

  </Document>
</kml>`;
}


// ---------------------------------------------------------------------------
// /api/save-survey
// - Accepts survey payload. If polygons/polygon/geometry is present, generate & upload KML.
// - If frontend supplied kmlData, upload that instead.
// ---------------------------------------------------------------------------
app.post('/api/save-survey', async (req, res) => {
  try {
    console.log('Received data for "survey" DB:', req.body);
    const data = req.body;

    // Build base survey object
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
      kmlData: undefined,
      kmlFileId: null,
      kmlUrl: null,
      location: data.location || { type: 'Point', coordinates: [0, 0] },
      centroid: undefined,
      style: undefined
    };

    // ---------------------------
    // 1) If frontend provided polygons FeatureCollection, handle it
    // ---------------------------
    let polygonGeoJson = null; // { type: 'Polygon'|'MultiPolygon', coordinates: [...] }
    let polygonUsage = surveyObj.usageOfProperty || 'default';
    let polygonDescription = '';

    // Accept FeatureCollection (polygons) from frontend: use first polygon feature
    if (data.polygons && data.polygons.type === 'FeatureCollection' && Array.isArray(data.polygons.features) && data.polygons.features.length > 0) {
      const first = data.polygons.features[0];
      if (first.geometry && ['Polygon','MultiPolygon'].includes(first.geometry.type)) {
        polygonGeoJson = { type: first.geometry.type, coordinates: first.geometry.coordinates };
        polygonUsage = first.properties?.usageOfProperty || polygonUsage;
        // try to build a short description from properties
        polygonDescription = first.properties?.description || '';
      }
    }

    // Accept direct polygon geometry
    if (!polygonGeoJson && data.polygon && ['Polygon','MultiPolygon'].includes(data.polygon.type)) {
      polygonGeoJson = { type: data.polygon.type, coordinates: data.polygon.coordinates };
      polygonUsage = data.polygon.properties?.usageOfProperty || polygonUsage;
    }

    // Accept data.geometry (legacy)
    if (!polygonGeoJson && data.geometry && ['Polygon','MultiPolygon'].includes(data.geometry.type)) {
      polygonGeoJson = { type: data.geometry.type, coordinates: data.geometry.coordinates };
    }

    // ---------------------------
    // 2) If polygonGeoJson found -> compute centroid, style, generate KML and upload
    // ---------------------------
    if (polygonGeoJson) {
      try {
        const centroid = simpleCentroid(polygonGeoJson.coordinates);
        surveyObj.centroid = centroid;
        // set location to centroid if no meaningful location provided
        if (!data.location || !Array.isArray(data.location.coordinates) || (data.location.coordinates[0] === 0 && data.location.coordinates[1] === 0)) {
          surveyObj.location = { type: 'Point', coordinates: [centroid[0], centroid[1]] };
          surveyObj.latitude = String(centroid[1]);
          surveyObj.longitude = String(centroid[0]);
        }

        // style from usage
        const style = getStyleForUsage(polygonUsage);
        surveyObj.style = style;

        // build KML string (50% opacity)
        const kmlString = buildKmlForParcel({
          name: surveyObj.propertyName || surveyObj.propertyNumber || 'Parcel',
          polygonCoords: polygonGeoJson.coordinates,
          colorHex: style.color,
          description: polygonDescription || (`Usage: ${polygonUsage}`),
          surveyObj // <-- minimal change: pass survey object so SURVEY POINT uses stored lat/lng & data
        });

        // upload to GridFS
        const fileName = `${surveyObj.propertyNumber || surveyObj.propertyName || 'survey'}.kml`;
        try {
          const fileId = await uploadKmlToGridFS(fileName, kmlString);
          surveyObj.kmlFileId = fileId;
          surveyObj.kmlData = kmlString.length > 20000 ? kmlString.slice(0, 20000) : kmlString;
          const host = req.headers.host;
          const protocol = req.protocol;
          surveyObj.kmlUrl = `${protocol}://${host}/api/kml/public/${fileId.toString()}`;
        } catch (uploadErr) {
          console.error('Failed to upload generated KML to GridFS:', uploadErr);
          // fallback: store KML inline
          surveyObj.kmlData = kmlString;
        }
      } catch (err) {
        console.error('Error processing polygon:', err);
        // continue — don't fail whole request, but log and proceed with saving base survey
      }
    } else if (typeof data.kmlData === 'string' && data.kmlData.trim().length > 0) {
      // ---------------------------
      // 3) If frontend sent kmlData directly, upload that (your original behavior)
      // ---------------------------
      const fileName = `${surveyObj.propertyNumber || surveyObj.propertyName || 'survey'}.kml`;
      try {
        const fileId = await uploadKmlToGridFS(fileName, data.kmlData);
        surveyObj.kmlFileId = fileId;
        surveyObj.kmlData = data.kmlData.length > 20000 ? data.kmlData.slice(0, 20000) : data.kmlData;
        const host = req.headers.host;
        const protocol = req.protocol;
        surveyObj.kmlUrl = `${protocol}://${host}/api/kml/public/${fileId.toString()}`;
      } catch (uploadErr) {
        console.error('GridFS upload error — falling back to storing KML text in doc:', uploadErr);
        surveyObj.kmlData = data.kmlData;
      }
    }

    // ---------------------------
    // 4) Save document
    // ---------------------------
    const savedSurvey = await SurveyEntry.create(surveyObj);
    console.log('Data saved:', savedSurvey);

    res.status(201).json({
      message: 'Survey saved successfully!',
      data: savedSurvey,
      kmlFileId: savedSurvey.kmlFileId || null,
      kmlUrl: savedSurvey.kmlUrl || null
    });

  } catch (error) {
    console.error('Error saving to DB:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error', error: error.message });
    }
    res.status(500).json({ message: 'Error saving data', error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Standalone endpoint: upload arbitrary KML string to GridFS
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Download GridFS file by filename
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Public KML streaming by fileId (no token)
// ---------------------------------------------------------------------------
app.get('/api/kml/public/:fileId', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    const db = mongoose.connection.db;
    if (!db) return res.status(500).send('MongoDB not connected');

    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'kmlFiles' });

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.on('error', (err) => {
      console.error('GridFS download error:', err);
      return res.status(404).send('File not found');
    });

    // Serve inline so clients (Google Earth Web/Pro) can fetch and open directly
    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader('Content-Disposition', 'inline; filename="survey.kml"');

    downloadStream.pipe(res);
  } catch (err) {
    console.error('Public download route error:', err);
    res.status(500).send('Server error');
  }
});

// ---------------------------------------------------------------------------
// Get saved surveys
// ---------------------------------------------------------------------------
app.get('/api/get-surveys', async (req, res) => {
  try {
    const surveys = await SurveyEntry.find({}).sort({ createdAt: -1 }).limit(100);
    res.status(200).json(surveys);
  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ message: 'Error fetching data', error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
