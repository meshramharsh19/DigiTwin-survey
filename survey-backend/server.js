// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const http = require('http');
// const { Server } = require('socket.io');
// const Redis = require('ioredis');
// const { createAdapter } = require('@socket.io/redis-adapter');

// const app = express();
// const PORT = process.env.PORT || 5000;
// const REDIS_URL = process.env.REDIS_URL || null; // e.g. redis://:password@host:6379
// const SURVEYS_CACHE_KEY = 'surveys:latest';    // simple cache key

// // --- HTTP + Socket.IO setup ---
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: { origin: '*' } // tighten in prod
// });

// // Optional: Redis clients for adapter/pubsub (used if REDIS_URL provided)
// let pubClient, subClient, redisClient;
// if (REDIS_URL) {
//   pubClient = new Redis(REDIS_URL);
//   subClient = pubClient.duplicate();
//   // socket.io adapter
//   io.adapter(createAdapter(pubClient, subClient));
//   // general-purpose redis client (cache + pub/sub)
//   redisClient = new Redis(REDIS_URL);
// } else {
//   // fallback in-memory redis-like API (very small) - WARNING: not shared across instances
//   const MapCache = new Map();
//   redisClient = {
//     async get(k) { return MapCache.has(k) ? MapCache.get(k) : null; },
//     async set(k, v, mode, ttlSec) {
//       MapCache.set(k, v);
//       if (mode === 'EX' && ttlSec) setTimeout(() => MapCache.delete(k), ttlSec * 1000);
//       return 'OK';
//     },
//     async del(k) { MapCache.delete(k); return 1; },
//     async publish(channel, message) { /* no-op fallback */ return 0; }
//   };
// }

// // If you want a dedicated pub/sub channel for invalidation/notifications
// const REDIS_CHANNEL = 'surveys:events';

// // --- Middleware ---
// app.use(cors());
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true }));

// // --- MongoDB Connection ---
// const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/survey';
// mongoose.connect(MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
//   .then(() => console.log('Successfully connected to MongoDB! (Database: survey)'))
//   .catch(err => console.error('MongoDB connection error:', err));

// // --- Schema (unchanged from your file, shortened here for brevity) ---
// const surveySchema = new mongoose.Schema({
//   propertyNumber: { type: String },
//   ownerName: { type: String, required: true },
//   propertyAddress: { type: String, required: true },
//   latitude: { type: String },
//   longitude: { type: String },
//   usageOfProperty: { type: String },
//   location: {
//     type: { type: String, enum: ['Point'], default: 'Point' },
//     coordinates: { type: [Number], default: [0, 0] }
//   },
//   centroid: { type: [Number], default: undefined },
//   style: {
//     color: { type: String, default: '#7f7f7f' },
//     opacity: { type: Number, default: 0.5 },
//     markerType: { type: String, default: 'square' }
//   },
//   kmlData: { type: String },
//   kmlFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
//   kmlUrl: { type: String, default: null }
// }, { timestamps: true });

// surveySchema.index({ location: '2dsphere' });
// const SurveyEntry = mongoose.model('SurveyEntry', surveySchema);

// // --- GridFS helper (same as your uploadKmlToGridFS) ---
// function uploadKmlToGridFS(fileName, kmlString) {
//   return new Promise((resolve, reject) => {
//     const db = mongoose.connection.db;
//     if (!db) return reject(new Error('MongoDB not connected'));
//     const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'kmlFiles' });
//     const buffer = Buffer.from(kmlString, 'utf8');
//     const uploadStream = bucket.openUploadStream(fileName, {
//       contentType: 'application/vnd.google-earth.kml+xml',
//       metadata: { uploadedAt: new Date() }
//     });
//     uploadStream.end(buffer);
//     uploadStream.on('finish', () => resolve(uploadStream.id));
//     uploadStream.on('error', (err) => reject(err));
//   });
// }

// // ---------- (Your KML helpers: hexToKmlColor, geojsonPolygonToKmlCoords, simpleCentroid, escapeXml, buildKmlForParcel) ----------
// function hexToKmlColor(hex, alphaHex = '80') {
//   const h = (hex || '').replace('#','');
//   if (h.length !== 6) throw new Error('Invalid hex color: ' + hex);
//   const r = h.slice(0,2), g = h.slice(2,4), b = h.slice(4,6);
//   return (alphaHex + b + g + r).toLowerCase();
// }
// function geojsonPolygonToKmlCoords(polygonCoords) {
//   const ring = Array.isArray(polygonCoords[0][0]) ? polygonCoords[0] : polygonCoords;
//   const closed = ring.slice();
//   const first = ring[0], last = ring[ring.length - 1];
//   if (first[0] !== last[0] || first[1] !== last[1]) closed.push([first[0], first[1]]);
//   return closed.map(([lng,lat]) => `${lng},${lat},0`).join(' ');
// }
// function simpleCentroid(polygonCoords) {
//   const ring = Array.isArray(polygonCoords[0][0]) ? polygonCoords[0] : polygonCoords;
//   let sumX = 0, sumY = 0;
//   for (const [x,y] of ring) { sumX += x; sumY += y; }
//   const n = ring.length || 1;
//   return [sumX / n, sumY / n];
// }
// function escapeXml(unsafe) {
//   if (!unsafe) return '';
//   return String(unsafe).replace(/[<>&'"]/g, function (c) {
//     switch (c) {
//       case '<': return '&lt;'; case '>': return '&gt;'; case '&': return '&amp;';
//       case "'": return '&apos;'; case '"': return '&quot;'; default: return c;
//     }
//   });
// }
// function buildKmlForParcel({ name='parcel', polygonCoords, colorHex='#7f7f7f', description='', surveyObj = {} }) {
//   const kmlColor = hexToKmlColor(colorHex, '80');
//   const coords = geojsonPolygonToKmlCoords(polygonCoords);
//   const [centroidLon, centroidLat] = simpleCentroid(polygonCoords);
//   const surveyLon = centroidLon, surveyLat = centroidLat;
//   const surveyDescriptionHtml = `<![CDATA[
//     <b>Owner:</b> ${escapeXml(surveyObj?.ownerName || '')}<br/>
//     <b>Address:</b> ${escapeXml(surveyObj?.propertyAddress || '')}<br/>
//     <b>Usage:</b> ${escapeXml(surveyObj?.usageOfProperty || '')}<br/>
//     <b>Total Area:</b> ${escapeXml(surveyObj?.totalArea || '')}
//   ]]>`;
//   return `<?xml version="1.0" encoding="UTF-8"?>
// <kml xmlns="http://www.opengis.net/kml/2.2">
//   <Document>
//     <name>${escapeXml(name)}</name>
//     <description>${escapeXml(description)}</description>
//     <Style id="parcel-style">
//       <LineStyle><color>${kmlColor}</color><width>2</width></LineStyle>
//       <PolyStyle><color>${kmlColor}</color><fill>1</fill><outline>1</outline></PolyStyle>
//     </Style>
//     <Placemark>
//       <name>${escapeXml(name)}</name>
//       <styleUrl>#parcel-style</styleUrl>
//       <Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon>
//     </Placemark>
//     <Placemark>
//       <name>Survey Point</name>
//       <description>${surveyDescriptionHtml}</description>
//       <Style><IconStyle><scale>1.2</scale><Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon></IconStyle></Style>
//       <Point><coordinates>${surveyLon},${surveyLat},0</coordinates></Point>
//     </Placemark>
//   </Document>
// </kml>`;
// }

// // ---------- USAGE styles ----------
// const USAGE_STYLES = {
//   residential: { color: '#4895EF' },
//   commercial: { color: '#4361EE' },
//   industrial: { color: '#3A0CA3' },
//   institutional: { color: '#4CC9F0' },
//   government: { color: '#7209B7' },
//   hospital: { color: '#F72585' },
//   'community hall': { color: '#8C5E99' },
//   'entertainment hall': { color: '#B892FF' },
//   'without cc': { color: '#A0A4B8' },
//   'change of properties': { color: '#89C2D9' },
//   'unauthorized towers': { color: '#6C757D' },
//   default: { color: '#4895EF' }
// };
// function getStyleForUsage(usage) {
//   const key = (usage || '').toLowerCase();
//   const base = USAGE_STYLES[key] || USAGE_STYLES.default;
//   return { color: base.color, opacity: 0.5, markerType: 'square' };
// }


// // ---------------------------------------------------------------------------
// // Helper: publish an event to Redis and emit via socket.io
// async function announceEvent(eventType, payload = {}) {
//   try {
//     // publish to redis channel
//     if (redisClient && typeof redisClient.publish === 'function') {
//       await redisClient.publish(REDIS_CHANNEL, JSON.stringify({ event: eventType, payload }));
//     }
//   } catch (e) {
//     console.warn('Redis publish failed:', e.message);
//   }
//   // emit to connected websocket clients
//   try {
//     io.emit(eventType, payload);
//   } catch (e) {
//     console.warn('Socket emit failed:', e.message);
//   }
// }

// // If using Redis pub/sub, listen for messages (useful for multi-instance)
// if (REDIS_URL && subClient) {
//   subClient.subscribe(REDIS_CHANNEL, (err, count) => {
//     if (err) console.error('Failed to sub to redis channel', err);
//   });
//   subClient.on('message', (channel, message) => {
//     try {
//       const m = JSON.parse(message);
//       if (m && m.event) {
//         // re-emit to local io (so all instances reach their clients)
//         io.emit(m.event, m.payload || {});
//       }
//     } catch (e) { /* ignore malformed */ }
//   });
// }

// // ---------------------------------------------------------------------------
// // Socket.IO connection handlers (basic)
// io.on('connection', (socket) => {
//   console.log('Socket connected:', socket.id);

//   socket.on('join', (room) => {
//     if (room) socket.join(room);
//   });

//   socket.on('disconnect', () => {
//     console.log('Socket disconnected:', socket.id);
//   });
// });

// // ---------------------------------------------------------------------------
// // Endpoints (kept your logic, but I added cache + notifications)
// // ---------------------------------------------------------------------------

// // Save survey (same logic but invalidates cache and announces)
// app.post('/api/save-survey', async (req, res) => {
//   try {
//     console.log('Received data for "survey" DB:', req.body);
//     const data = req.body;

//     // -- build surveyObj (same as you used) --
//     const surveyObj = {
//       propertyNumber: data.propertyNumber || data.houseNumber || '',
//       assessmentYear: data.assessmentYear || '',
//       oldAssessmentValue: data.oldAssessmentValue || '',
//       oldAssessmentYear: data.oldAssessmentYear || '',
//       ownerName: data.ownerName || '',
//       ownerUID: data.ownerUID || '',
//       ownerType: data.ownerType || '',
//       occupierName: data.occupierName || '',
//       occupierUID: data.occupierUID || '',
//       propertyAddress: data.propertyAddress || '',
//       propertyName: data.propertyName || '',
//       pinCode: data.pinCode || '',
//       latitude: data.location && Array.isArray(data.location.coordinates) ? String(data.location.coordinates[1]) : (data.latitude || ''),
//       longitude: data.location && Array.isArray(data.location.coordinates) ? String(data.location.coordinates[0]) : (data.longitude || ''),
//       propertyCategory: data.propertyCategory || '',
//       natureOfProperty: data.natureOfProperty || '',
//       usageOfProperty: data.usageOfProperty || '',
//       ageOfBuilding: data.ageOfBuilding || '',
//       mobileNumber: data.mobileNumber || '',
//       email: data.email || '',
//       totalArea: data.totalArea || '',
//       yearOfConstruction: data.yearOfConstruction || '',
//       floorNumber: data.floorNumber || '',
//       floorArea: data.floorArea || '',
//       floorConstructionType: data.floorConstructionType || '',
//       floorUseType: data.floorUseType || '',
//       shopOfficeNumber: data.shopOfficeNumber || '',
//       accuracy: data.accuracy || null,
//       kmlData: undefined,
//       kmlFileId: null,
//       kmlUrl: null,
//       location: data.location || { type: 'Point', coordinates: [0, 0] },
//       centroid: undefined,
//       style: undefined
//     };

//     // polygon detection & KML generation (same as original)
//     let polygonGeoJson = null;
//     let polygonUsage = surveyObj.usageOfProperty || 'default';
//     let polygonDescription = '';

//     if (data.polygons && data.polygons.type === 'FeatureCollection' && Array.isArray(data.polygons.features) && data.polygons.features.length > 0) {
//       const first = data.polygons.features[0];
//       if (first.geometry && ['Polygon','MultiPolygon'].includes(first.geometry.type)) {
//         polygonGeoJson = { type: first.geometry.type, coordinates: first.geometry.coordinates };
//         polygonUsage = first.properties?.usageOfProperty || polygonUsage;
//         polygonDescription = first.properties?.description || '';
//       }
//     }
//     if (!polygonGeoJson && data.polygon && ['Polygon','MultiPolygon'].includes(data.polygon.type)) {
//       polygonGeoJson = { type: data.polygon.type, coordinates: data.polygon.coordinates };
//       polygonUsage = data.polygon.properties?.usageOfProperty || polygonUsage;
//     }
//     if (!polygonGeoJson && data.geometry && ['Polygon','MultiPolygon'].includes(data.geometry.type)) {
//       polygonGeoJson = { type: data.geometry.type, coordinates: data.geometry.coordinates };
//     }

//     if (polygonGeoJson) {
//       try {
//         const centroid = simpleCentroid(polygonGeoJson.coordinates);
//         surveyObj.centroid = centroid;
//         if (!data.location || !Array.isArray(data.location.coordinates) || (data.location.coordinates[0] === 0 && data.location.coordinates[1] === 0)) {
//           surveyObj.location = { type: 'Point', coordinates: [centroid[0], centroid[1]] };
//           surveyObj.latitude = String(centroid[1]);
//           surveyObj.longitude = String(centroid[0]);
//         }
//         const style = getStyleForUsage(polygonUsage);
//         surveyObj.style = style;
//         const kmlString = buildKmlForParcel({
//           name: surveyObj.propertyName || surveyObj.propertyNumber || 'Parcel',
//           polygonCoords: polygonGeoJson.coordinates,
//           colorHex: style.color,
//           description: polygonDescription || (`Usage: ${polygonUsage}`),
//           surveyObj
//         });
//         const fileName = `${surveyObj.propertyNumber || surveyObj.propertyName || 'survey'}.kml`;
//         try {
//           const fileId = await uploadKmlToGridFS(fileName, kmlString);
//           surveyObj.kmlFileId = fileId;
//           surveyObj.kmlData = kmlString.length > 20000 ? kmlString.slice(0,20000) : kmlString;
//           const host = req.headers.host;
//           const protocol = req.protocol;
//           surveyObj.kmlUrl = `${protocol}://${host}/api/kml/public/${fileId.toString()}`;
//         } catch (uploadErr) {
//           console.error('Failed to upload generated KML to GridFS:', uploadErr);
//           surveyObj.kmlData = kmlString;
//         }
//       } catch (err) {
//         console.error('Error processing polygon:', err);
//       }
//     } else if (typeof data.kmlData === 'string' && data.kmlData.trim().length > 0) {
//       const fileName = `${surveyObj.propertyNumber || surveyObj.propertyName || 'survey'}.kml`;
//       try {
//         const fileId = await uploadKmlToGridFS(fileName, data.kmlData);
//         surveyObj.kmlFileId = fileId;
//         surveyObj.kmlData = data.kmlData.length > 20000 ? data.kmlData.slice(0,20000) : data.kmlData;
//         const host = req.headers.host;
//         const protocol = req.protocol;
//         surveyObj.kmlUrl = `${protocol}://${host}/api/kml/public/${fileId.toString()}`;
//       } catch (uploadErr) {
//         console.error('GridFS upload error — falling back to storing KML text in doc:', uploadErr);
//         surveyObj.kmlData = data.kmlData;
//       }
//     }

//     // save
//     const savedSurvey = await SurveyEntry.create(surveyObj);
//     console.log('Data saved:', savedSurvey);

//     // invalidate cache & announce via redis + socket.io
//     try {
//       await redisClient.del(SURVEYS_CACHE_KEY);
//     } catch (e) { console.warn('Cache del failed', e.message); }
//     await announceEvent('survey:created', { id: savedSurvey._id, propertyNumber: savedSurvey.propertyNumber });

//     res.status(201).json({
//       message: 'Survey saved successfully!',
//       data: savedSurvey,
//       kmlFileId: savedSurvey.kmlFileId || null,
//       kmlUrl: savedSurvey.kmlUrl || null
//     });

//   } catch (error) {
//     console.error('Error saving to DB:', error);
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({ message: 'Validation error', error: error.message });
//     }
//     res.status(500).json({ message: 'Error saving data', error: error.message });
//   }
// });

// // GET surveys with caching
// app.get('/api/get-surveys', async (req, res) => {
//   try {
//     // try cache
//     const cached = await redisClient.get(SURVEYS_CACHE_KEY);
//     if (cached) {
//       return res.status(200).json(JSON.parse(cached));
//     }

//     const surveys = await SurveyEntry.find({}).sort({ createdAt: -1 }).limit(100).lean();
//     await redisClient.set(SURVEYS_CACHE_KEY, JSON.stringify(surveys), 'EX', 30); // cache 30s (adjust as needed)

//     res.status(200).json(surveys);
//   } catch (error) {
//     console.error('Error fetching surveys:', error);
//     res.status(500).json({ message: 'Error fetching data', error: error.message });
//   }
// });

// // 3D read endpoints (same as yours, lightly kept)
// app.get('/api/3d/surveys', async (req, res) => {
//   try {
//     const { search, limit = 500 } = req.query;
//     const q = {};
//     if (search) {
//       const s = new RegExp(search, 'i');
//       q.$or = [{ propertyNumber: s }, { ownerName: s }, { propertyName: s }, { propertyAddress: s }];
//     }
//     const docs = await SurveyEntry.find(q).sort({ createdAt: -1 }).limit(Number(limit)).lean();
//     const features = docs.map(d => {
//       let geometry = d.geometry || null;
//       if (!geometry) {
//         if (d.kmlData) geometry = null;
//         else if (d.location && Array.isArray(d.location.coordinates)) geometry = { type: 'Point', coordinates: d.location.coordinates };
//         else if (Array.isArray(d.centroid)) geometry = { type: 'Point', coordinates: [d.centroid[0], d.centroid[1]] };
//       }
//       return {
//         type: 'Feature',
//         geometry,
//         properties: {
//           _id: d._id,
//           propertyNumber: d.propertyNumber,
//           propertyName: d.propertyName,
//           ownerName: d.ownerName,
//           usageOfProperty: d.usageOfProperty,
//           propertyAddress: d.propertyAddress,
//           style: d.style || { color: '#00BFFF', opacity: 0.5 },
//           kmlUrl: d.kmlUrl || null,
//           createdAt: d.createdAt,
//           totalArea: d.totalArea,
//           yearOfConstruction: d.yearOfConstruction,
//           mobileNumber: d.mobileNumber,
//           email: d.email
//         }
//       };
//     });
//     res.json({ type: 'FeatureCollection', features });
//   } catch (err) {
//     console.error('GET /api/3d/surveys error:', err);
//     res.status(500).json({ error: 'internal' });
//   }
// });

// app.get('/api/3d/surveys/:id', async (req, res) => {
//   try {
//     const d = await SurveyEntry.findById(req.params.id).lean();
//     if (!d) return res.status(404).json({ error: 'not found' });
//     let geometry = d.geometry || null;
//     if (!geometry && d.location && Array.isArray(d.location.coordinates)) geometry = { type: 'Point', coordinates: d.location.coordinates };
//     else if (!geometry && Array.isArray(d.centroid)) geometry = { type: 'Point', coordinates: [d.centroid[0], d.centroid[1]] };
//     const feature = {
//       type: 'Feature',
//       geometry,
//       properties: {
//         _id: d._id,
//         propertyNumber: d.propertyNumber,
//         propertyName: d.propertyName,
//         ownerName: d.ownerName,
//         usageOfProperty: d.usageOfProperty,
//         propertyAddress: d.propertyAddress,
//         style: d.style || { color: '#00BFFF', opacity: 0.5 },
//         kmlUrl: d.kmlUrl || null,
//         totalArea: d.totalArea,
//         yearOfConstruction: d.yearOfConstruction,
//         mobileNumber: d.mobileNumber,
//         email: d.email
//       }
//     };
//     res.json(feature);
//   } catch (err) {
//     console.error('GET /api/3d/surveys/:id error:', err);
//     res.status(500).json({ error: 'internal' });
//   }
// });

// // UPDATE polygon color by ID (invalidation + socket notification)
// app.put('/api/3d/surveys/:id/color', async (req, res) => {
//   try {
//     const { color } = req.body;
//     if (!color) return res.status(400).json({ message: "Color is required" });

//     const updated = await SurveyEntry.findByIdAndUpdate(
//       req.params.id,
//       { $set: { "style.color": color } },
//       { new: true }
//     );
//     if (!updated) return res.status(404).json({ message: "Polygon not found" });

//     // invalidate cache + announce
//     try { await redisClient.del(SURVEYS_CACHE_KEY); } catch (e){ /* ignore */ }
//     await announceEvent('survey:updated', { id: updated._id, color: updated.style.color });

//     res.json({ success: true, data: updated });
//   } catch (err) {
//     console.error('Error updating color:', err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // GridFS public endpoints (unchanged)
// app.post('/api/kml/grid-upload', async (req, res) => {
//   try {
//     const { fileName, kmlString } = req.body;
//     if (!fileName || !kmlString) return res.status(400).json({ message: 'Missing fileName or kmlString' });
//     const fileId = await uploadKmlToGridFS(fileName, kmlString);
//     res.json({ message: 'Uploaded to GridFS', fileId: fileId.toString(), fileName });
//   } catch (err) {
//     console.error('GridFS upload failed:', err);
//     res.status(500).json({ message: 'GridFS upload failed', error: err.message });
//   }
// });

// app.get('/api/kml/download/byname/:filename', async (req, res) => {
//   try {
//     const filename = req.params.filename;
//     const db = mongoose.connection.db;
//     if (!db) return res.status(500).send('MongoDB not connected');
//     const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'kmlFiles' });
//     res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
//     res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
//     const downloadStream = bucket.openDownloadStreamByName(filename);
//     downloadStream.on('error', (err) => {
//       console.error('GridFS download error:', err);
//       return res.status(404).send('File not found');
//     });
//     downloadStream.pipe(res);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// });

// app.get('/api/kml/public/:fileId', async (req, res) => {
//   try {
//     const fileId = new mongoose.Types.ObjectId(req.params.fileId);
//     const db = mongoose.connection.db;
//     if (!db) return res.status(500).send('MongoDB not connected');
//     const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'kmlFiles' });
//     const downloadStream = bucket.openDownloadStream(fileId);
//     downloadStream.on('error', (err) => {
//       console.error('GridFS download error:', err);
//       return res.status(404).send('File not found');
//     });
//     res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
//     res.setHeader('Content-Disposition', 'inline; filename="survey.kml"');
//     downloadStream.pipe(res);
//   } catch (err) {
//     console.error('Public download route error:', err);
//     res.status(500).send('Server error');
//   }
// });

// // ---------------------------------------------------------------------------
// // Start server (use server instead of app so socket.io works)
// server.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

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
  residential:            { color: '#4895EF' }, // Soft Professional Blue
  commercial:             { color: '#4361EE' }, // Indigo (strong + premium)
  industrial:             { color: '#3A0CA3' }, // Deep Violet (distinct)
  institutional:          { color: '#4CC9F0' }, // Sky Blue Accent
  government:             { color: '#7209B7' }, // Royal Purple
  hospital:               { color: '#F72585' }, // Magenta Highlight (stands out)
  'community hall':       { color: '#8C5E99' }, // Muted Purple-Grey (professional)
  'entertainment hall':   { color: '#B892FF' }, // Light Lavender (soft + visible)
  'without cc':           { color: '#A0A4B8' }, // Cool Grey
  'change of properties': { color: '#89C2D9' }, // Muted Cyan (easy to notice)
  'unauthorized towers':  { color: '#6C757D' }, // Dark Professional Grey
  default:                { color: '#4895EF' }  // Professional Blue (fallback)
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

// adding api for 3d platform data

// ------------------ 3D platform read API ------------------
// GET /api/3d/surveys       -> returns GeoJSON FeatureCollection
// GET /api/3d/surveys/:id   -> returns single Feature
app.get('/api/3d/surveys', async (req, res) => {
  try {
    const { search, limit = 500 } = req.query;
    const q = {};
    if (search) {
      const s = new RegExp(search, 'i');
      q.$or = [
        { propertyNumber: s },
        { ownerName: s },
        { propertyName: s },
        { propertyAddress: s }
      ];
    }

    const docs = await SurveyEntry.find(q).sort({ createdAt: -1 }).limit(Number(limit)).lean();

    const features = docs.map(d => {
      // use polygon/geometry if saved (you use polygons -> KML), otherwise fallback to location/centroid
      let geometry = d.geometry || null;

      if (!geometry) {
        if (d.kmlData) {
          // don't convert here (heavy) — prefer using kmlUrl in client.
          geometry = null;
        } else if (d.location && Array.isArray(d.location.coordinates)) {
          geometry = { type: 'Point', coordinates: d.location.coordinates };
        } else if (Array.isArray(d.centroid)) {
          geometry = { type: 'Point', coordinates: [d.centroid[0], d.centroid[1]] };
        }
      }

      return {
        type: 'Feature',
        geometry,
        properties: {
          _id: d._id,
          propertyNumber: d.propertyNumber,
          propertyName: d.propertyName,
          ownerName: d.ownerName,
          usageOfProperty: d.usageOfProperty,
          propertyAddress: d.propertyAddress,
          style: d.style || { color: '#00BFFF', opacity: 0.5 },
          kmlUrl: d.kmlUrl || null,
          createdAt: d.createdAt,
          // include any other fields you need in the popup:
          totalArea: d.totalArea,
          yearOfConstruction: d.yearOfConstruction,
          mobileNumber: d.mobileNumber,
          email: d.email
        }
      };
    });

    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('GET /api/3d/surveys error:', err);
    res.status(500).json({ error: 'internal' });
  }
});

app.get('/api/3d/surveys/:id', async (req, res) => {
  try {
    const d = await SurveyEntry.findById(req.params.id).lean();
    if (!d) return res.status(404).json({ error: 'not found' });

    let geometry = d.geometry || null;
    if (!geometry && d.location && Array.isArray(d.location.coordinates)) {
      geometry = { type: 'Point', coordinates: d.location.coordinates };
    } else if (!geometry && Array.isArray(d.centroid)) {
      geometry = { type: 'Point', coordinates: [d.centroid[0], d.centroid[1]] };
    }

    const feature = {
      type: 'Feature',
      geometry,
      properties: {
        _id: d._id,
        propertyNumber: d.propertyNumber,
        propertyName: d.propertyName,
        ownerName: d.ownerName,
        usageOfProperty: d.usageOfProperty,
        propertyAddress: d.propertyAddress,
        style: d.style || { color: '#00BFFF', opacity: 0.5 },
        kmlUrl: d.kmlUrl || null,
        totalArea: d.totalArea,
        yearOfConstruction: d.yearOfConstruction,
        mobileNumber: d.mobileNumber,
        email: d.email
      }
    };

    res.json(feature);
  } catch (err) {
    console.error('GET /api/3d/surveys/:id error:', err);
    res.status(500).json({ error: 'internal' });
  }
});


// UPDATE polygon color by ID
app.put('/api/3d/surveys/:id/color', async (req, res) => {
  try {
    const { color } = req.body; // new color hex (#FF0000)
    if (!color) return res.status(400).json({ message: "Color is required" });

    const updated = await SurveyEntry.findByIdAndUpdate(
      req.params.id,
      { $set: { "style.color": color } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Polygon not found" });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});