// // MapComponent.js (ready to paste)
// import { useState, useEffect, useRef, useCallback } from 'react';
// // --- NAYA IMPORT (Download icon ke liye) ---
// import { MapPin, Navigation, Loader, Crosshair, CheckSquare, Download } from 'lucide-react';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// // --- NAYE IMPORTS (Leaflet-Draw ke liye) ---
// import 'leaflet-draw/dist/leaflet.draw.css';
// import 'leaflet-draw';
// import tokml from 'tokml'; // KML export ke liye

// import '../Style/map.css';
// import HouseDetailsModal from './HouseDetailsModal';
// Socket.io client setup
// const socket = io('http://localhost:5001'); // change origin in prod
//   socket.on('connect', () => console.log('connected', socket.id));
//   socket.on('survey:created', (data) => {
//     console.log('New survey created:', data);
//     // e.g. re-fetch /api/get-surveys or update map
//   });
//   socket.on('survey:updated', (data) => {
//     console.log('Survey updated:', data);
//     // update styles on map
//   });
// /*
//   Color map for usage -> used to style polygons on map and in exported KML.
//   Modify these hex values as desired.
// */
// const propertyUsageColors = {
//  default: "#00BFFF"          // Sky Blue fallback
// };

// /**
//  * KML string ko file ke roop mein download karata hai.
//  * @param {string} kmlString - Poora KML content.
//  * @param {string} fileName - File ka naam (e.g., "house-123.kml").
//  */
// const downloadKML = (kmlString, fileName) => {
//   const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
//   const link = document.createElement('a');
//   link.href = URL.createObjectURL(blob);
//   link.download = fileName;
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
//   URL.revokeObjectURL(link.href);
// };

// export default function MapComponent() {
//   const [location, setLocation] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isModalOpen, setModalOpen] = useState(false);
//   const [capturedLocation, setCapturedLocation] = useState(null);

//   const mapRef = useRef(null);
//   const mapInstanceRef = useRef(null);
//   const markerRef = useRef(null);
//   const circleRef = useRef(null);
  
//   // --- NAYA REF (Drawn shapes ko store karne ke liye) ---
//   const drawnItemsRef = useRef(null);

//   // --- helper: ensure a layer stores usage on its feature.properties + options ---
//   function setLayerUsageProperty(layer, usage) {
//     layer.feature = layer.feature || { type: 'Feature', properties: {} };
//     layer.feature.properties = layer.feature.properties || {};
//     layer.feature.properties.usageOfProperty = usage || 'default';
//     layer.options = layer.options || {};
//     layer.options.usageOfProperty = usage || 'default';
//   }

//   // --- helper: collect drawn items as a FeatureCollection and ensure usage exists ---
//  function collectPolygonsGeoJSON() {
//   if (!drawnItemsRef.current) return null;
//   const fc = drawnItemsRef.current.toGeoJSON();

//   fc.features.forEach((feature, index) => {
//     feature.properties = feature.properties || {};

//     // ensure usageOfProperty exists
//     feature.properties.usageOfProperty = feature.properties.usageOfProperty || 'default';

//     // ensure surveyPoint exists
//     if (!feature.properties.surveyPoint) {
//       feature.properties.surveyPoint = [
//         location.lng,
//         location.lat,
//       ];
//     }
//   });

//   return fc;
// }


//   // Apply color to drawn polygons and set usage property on each layer
//   const applyPolygonColor = (usage) => {
//     if (!drawnItemsRef.current) return;
//     const color = propertyUsageColors[usage] || propertyUsageColors.default;

//     drawnItemsRef.current.eachLayer((layer) => {
//       // L.Polygon includes rectangles as well; use geometry type check if needed
//       if (layer instanceof L.Polygon) {
//         layer.setStyle({
//           color: color,
//           fillColor: color,
//           fillOpacity: 0.5
//         });
//         setLayerUsageProperty(layer, usage);
//       }
//     });
//   };

//   // ... (fetchAccurateLocation function waisa hi hai) ...
//   const fetchAccurateLocation = useCallback((onSuccess, onError) => {
//     if (!navigator.geolocation) {
//       onError('Geolocation is not supported by your browser');
//       return;
//     }
//     let bestAccuracy = Infinity;
//     let attempts = 0;
//     const maxAttempts = 5;
//     const watchId = navigator.geolocation.watchPosition(
//       (position) => {
//         attempts++;
//         const currentAccuracy = position.coords.accuracy;
//         if (currentAccuracy < bestAccuracy) {
//           bestAccuracy = currentAccuracy;
//           const newLocation = {
//             lat: position.coords.latitude,
//             lng: position.coords.longitude,
//             accuracy: position.coords.accuracy,
//             altitude: position.coords.altitude,
//             altitudeAccuracy: position.coords.altitudeAccuracy,
//             heading: position.coords.heading,
//             speed: position.coords.speed,
//           };
//           onSuccess(newLocation);
//         }
//         if (attempts >= maxAttempts || currentAccuracy < 10) {
//           navigator.geolocation.clearWatch(watchId);
//         }
//       },
//       (error) => {
//         onError(error.message);
//         navigator.geolocation.clearWatch(watchId);
//       },
//       {
//         enableHighAccuracy: true,
//         timeout: 10000,
//         maximumAge: 0,
//       }
//     );
//   }, []);


//   // ... (Pehla useEffect waisa hi hai) ...
//   useEffect(() => {
//     setLoading(true);
//     fetchAccurateLocation(
//       (newLocation) => {
//         setLocation(newLocation);
//         setLoading(false);
//         setError(null);
//       },
//       (errorMessage) => {
//         setError(errorMessage);
//         setLoading(false);
//       }
//     );
//   }, [fetchAccurateLocation]);


//   // --- (IS useEffect MEIN BADLAV HAI) ---
//   useEffect(() => {
//     if (location && mapRef.current && !mapInstanceRef.current) {
//       const userPosition = [location.lat, location.lng];
//       const customIcon = L.divIcon({
//         className: 'leaflet-pulsing-icon',
//         iconSize: [20, 20],
//         iconAnchor: [10, 10],
//       });
//       const map = L.map(mapRef.current, {
//         zoomControl: true,
//       }).setView(userPosition, 19);
      
//    const isRetina = window.devicePixelRatio && window.devicePixelRatio > 1;
// const googleScale = isRetina ? 2 : 1;

// L.tileLayer(
//   `https://mt1.google.com/vt/lyrs=s&scale=${googleScale}&x={x}&y={y}&z={z}`,
//   {
//     maxZoom: 23,
//     maxNativeZoom: 20,   // prevents Leaflet from requesting too-high native tiles
//     tileSize: isRetina ? 512 : 256, // use 512 when using scale=2
//     zoomOffset: isRetina ? -1 : 0,  // align zoom when tileSize=512
//     attribution: '© Google'
//   }
// ).addTo(map);

//       const marker = L.marker(userPosition, { icon: customIcon }).addTo(map);
//       const circle = L.circle(userPosition, {
//         radius: location.accuracy,
//         color: '#4F46E5',
//         fillColor: '#4F46E5',
//         fillOpacity: 0.1,
//         weight: 1,
//       }).addTo(map);

//       mapInstanceRef.current = map;
//       markerRef.current = marker;
//       circleRef.current = circle;

//       // --- NAYA CODE (LEAFLET-DRAW) ---
//       // 1. Ek FeatureGroup banayein jahan drawn items store honge
//       const drawnItems = new L.FeatureGroup();
//       map.addLayer(drawnItems);
//       drawnItemsRef.current = drawnItems; // Ref mein store karein

//       // 2. Draw controls ko map par add karein
//       const drawControl = new L.Control.Draw({
//         edit: {
//           featureGroup: drawnItems, // Allow editing/deleting drawn items
//           remove: true,
//         },
//         draw: {
//           polygon: true,   // Polygon drawing enable karein
//           polyline: true,  // Line drawing enable karein
//           rectangle: true, // Rectangle drawing enable karein
//           circle: false,   // Disable circle
//           marker: false,   // Disable marker (hum GPS marker use kar rahe hain)
//           circlemarker: false, // Disable circle marker
//         },
//       });
//       map.addControl(drawControl);

//       // 3. Jab koi shape create ho, toh use 'drawnItems' group mein add karein
//       map.on(L.Draw.Event.CREATED, function (event) {
//   const layer = event.layer;

//   // attach GPS survey point to this polygon
//   layer.feature = layer.feature || { type: 'Feature', properties: {} };
//   layer.feature.properties.surveyPoint = [
//     location.lng,
//     location.lat,
//   ];

//   // keep your old usage default
//   setLayerUsageProperty(layer, 'default');

//   // add to group
//   drawnItems.addLayer(layer);
// });


//       // --- NAYA CODE (LEAFLET-DRAW) KHATAM ---

//     }
//   }, [location]); // Dependency waisi hi hai

//   // ... (Baaki useEffects, recenterMap, refreshLocation, handleProceedClick... sab waisa hi hai) ...
//   useEffect(() => {
//     if (location && mapInstanceRef.current && markerRef.current && circleRef.current) {
//       const newPos = [location.lat, location.lng];
//       markerRef.current.setLatLng(newPos);
//       circleRef.current.setLatLng(newPos).setRadius(location.accuracy);
//     }
//   }, [location]);

//   const recenterMap = useCallback(() => {
//     if (mapInstanceRef.current && location) {
//       mapInstanceRef.current.setView([location.lat, location.lng], 19);
//     }
//   }, [location]);

//   const refreshLocation = useCallback(() => {
//     setLoading(true);
//     setError(null);
//     fetchAccurateLocation(
//       (newLocation) => {
//         setLocation(newLocation);
//         setLoading(false);
//         setError(null);
//         if (mapInstanceRef.current) {
//           mapInstanceRef.current.setView([newLocation.lat, newLocation.lng], 19);
//         }
//       },
//       (errorMessage) => {
//         setError(errorMessage);
//         setLoading(false);
//       }
//     );
//   }, [fetchAccurateLocation]);

//   const handleProceedClick = () => {
//     if (location) {
//       setCapturedLocation(location);
//       setModalOpen(true);
//     } else {
//       alert('Location not available. Please wait or refresh.');
//     }
//   };
  

//   // --- (handleSaveSurvey function) ---
//   const handleSaveSurvey = (formData) => {
//     // Build point KML (keeps existing point-download behavior)
//     const kmlString = `<?xml version="1.0" encoding="UTF-8"?>
// <kml xmlns="http://www.opengis.net/kml/2.2">
//  <Placemark>
//    <name>${formData.propertyName || formData.houseNumber || 'Survey Point'}</name>
//    <description>
//      Owner: ${formData.ownerName}
//      Occupier: ${formData.occupierName}
//      Address: ${formData.propertyAddress}
//      Usage: ${formData.usageOfProperty}
//      Total Area: ${formData.totalArea}
//    </description>
//    <Point>
//      <coordinates>${capturedLocation.lng},${capturedLocation.lat},${capturedLocation.altitude || 0}</coordinates>
//    </Point>
//  </Placemark>
// </kml>`;

//     // build survey payload
//     const surveyData = {
//       ...formData,
//       location: {
//         type: 'Point',
//         coordinates: [capturedLocation.lng, capturedLocation.lat],
//       },
//       accuracy: capturedLocation.accuracy,
//       kmlData: kmlString,
//     };
    
//     // remove large fields if present
//     delete surveyData.photos;
//     console.log('Data to be sent to MongoDB:', surveyData);

//     // Download the point KML locally (existing behavior)
//     const fileName = `${formData.houseNumber || formData.propertyName || 'survey'}.kml`;
//     downloadKML(kmlString, fileName); // Helper function ka istemal

//     // --- NEW: apply color to drawn polygons on map (instant feedback + store usage on layer) ---
//     if (formData.usageOfProperty) {
//       applyPolygonColor(formData.usageOfProperty);
//     }

//     // --- NEW: collect drawn polygons (if any) and attach to payload so server persists them ---
//     const polygonsGeoJSON = collectPolygonsGeoJSON();
//     if (polygonsGeoJSON && polygonsGeoJSON.features && polygonsGeoJSON.features.length > 0) {
//       surveyData.polygons = polygonsGeoJSON;
//     }

//     // send to backend
//     fetch('http://localhost:5001/api/save-survey', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(surveyData),
//     })
//     .then(async (response) => {
//       const json = await response.json().catch(() => ({}));
//       return { status: response.status, body: json };
//     })
//     .then(({ status, body }) => {
//       console.log('Server response:', status, body);
//       // server should return kmlUrl either at top level or in body.data
//       const publicKml = body.kmlUrl || (body.data && body.data.kmlUrl);
//       if (publicKml) {
//         alert('Survey saved. Public KML URL:\n' + publicKml);
//         // open the public KML in a new tab
//         window.open(publicKml, '_blank');
//       } else {
//         alert('Survey data saved to DB. KML downloaded locally (if any).');
//       }
//     })
//     .catch((error) => {
//       console.error('Error:', error);
//       alert('Failed to save data to DB. See console. (KML might have downloaded)');
//     });
//   };

//   // --- NAYI FUNCTION (Aapke KML.js se) ---
//   // Yeh function drawn POLYGONS/LINES ko KML mein download karegi
//   //modified function with styling
//   const handleDownloadDrawnKML = () => {
//     if (!drawnItemsRef.current) {
//       alert("Draw layer abhi initialize nahin hua hai.");
//       return;
//     }

//     // Convert drawn shapes to GeoJSON
//     const allGeoJSON = drawnItemsRef.current.toGeoJSON();

//     // Keep polygons / lines
//     const filtered = {
//       type: "FeatureCollection",
//       features: allGeoJSON.features.filter((f) =>
//         ["Polygon", "Rectangle", "LineString"].includes(f.geometry.type)
//       ),
//     };

//     if (filtered.features.length === 0) {
//       alert("Export karne ke liye koi Polygon ya Line draw nahin kiya gaya hai.");
//       return;
//     }

//     // Generate base KML
//     let kml = tokml(filtered);

//     // ---------------------------
//     // 🔵 BLUE STYLING FOR KML
//     // Leaflet blue = #4F46E5
//     // Fill opacity 0.1 => alpha hex = 19
//     // KML format = AABBGGRR
//     //
//     // stroke = FF E5 46 4F  => FFE5464F
//     // fill   = 19 E5 46 4F  => 19E5464F
//     // ---------------------------

//     const styleBlock = `
//       <Style id="bluePolygon">
//         <LineStyle>
//           <color>FFE5464F</color>   <!-- Blue stroke -->
//           <width>2</width>
//         </LineStyle>
//         <PolyStyle>
//           <color>80E5464F</color>   <!-- Blue fill with opacity ~50% -->
//           <fill>1</fill>
//           <outline>1</outline>
//         </PolyStyle>
//       </Style>
//     `;

//     // Insert style inside <Document>
//     kml = kml.replace(/<Document([^>]*)>/i, `<Document$1>${styleBlock}`);

//     // Attach style to each Placemark
//     kml = kml.replace(/<Placemark>/g, `<Placemark>\n<styleUrl>#bluePolygon</styleUrl>`);

//     // Download final styled KML
//     const blob = new Blob([kml], {
//       type: "application/vnd.google-earth.kml+xml",
//     });

//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "drawn_boundary.kml";
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };

//   const handleProceedPolygonSurvey = () => {
//   if (!drawnItemsRef.current) {
//     alert("Please draw a polygon first");
//     return;
//   }

//   const polygonsGeoJSON = collectPolygonsGeoJSON();

//   if (!polygonsGeoJSON || polygonsGeoJSON.features.length === 0) {
//     alert("No polygon found");
//     return;
//   }

//   // KML generate (same logic as download but no file)
//   const kmlString = tokml(polygonsGeoJSON);

//   const payload = {
//     layerType: "road",
//     polygons: polygonsGeoJSON,
//     kmlData: kmlString,
//     hasVideo: true,
//     videoUrl: "/videos/road-survey.mp4", // future use (PART-2)
//     createdFrom: "digital-twin",
//   };

//   fetch("http://localhost:5001/api/road-survey/save", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(payload),
//   })
//     .then((res) => res.json())
//     .then((data) => {
//       alert("Polygon survey saved successfully");
//       console.log("Saved polygon:", data);
//     })
//     .catch((err) => {
//       console.error(err);
//       alert("Failed to save polygon survey");
//     });
// };


//   return (
//     <div className="map-container">
//       <div className="map-content">
//         <div className="main-layout-container">
//           <div className="layout-left">
//             {location && (
//               <div className="location-card fade-in-item">
//                 <div className="location-card-header">
//                   <h2 className="location-card-title">Location Details</h2>
//                   <button
//                     onClick={refreshLocation}
//                     className="refresh-button"
//                     disabled={loading}
//                   >
//                     <Crosshair className="refresh-icon" strokeWidth={1.5} />
//                     Refresh
//                   </button>
//                 </div>
//                 <div className="location-grid">
//                   {/* ... (saare location-item divs waise hi hain) ... */}
//                   <div className="location-item">
//                     <p className="location-label">Latitude</p>
//                     <p className="location-value">{location.lat.toFixed(7)}°</p>
//                   </div>
//                   <div className="location-item">
//                     <p className="location-label">Longitude</p>
//                     <p className="location-value">{location.lng.toFixed(7)}°</p>
//                   </div>
//                   <div
//                     className={`location-item ${
//                       location.accuracy < 10
//                         ? 'accuracy-excellent'
//                         : location.accuracy < 30
//                         ? 'accuracy-good'
//                         : 'accuracy-poor'
//                     }`}
//                   >
//                     <p className="location-label">Accuracy</p>
//                     <p
//                       className={`location-value ${
//                         location.accuracy < 10
//                           ? 'accuracy-excellent-text'
//                           : location.accuracy < 30
//                           ? 'accuracy-good-text'
//                           : 'accuracy-poor-text'
//                       }`}
//                     >
//                       {location.accuracy.toFixed(2)} m
//                     </p>
//                   </div>
//                   <div className="location-item">
//                     <p className="location-label">Altitude</p>
//                     <p className="location-value">
//                       {location.altitude
//                         ? `${location.altitude.toFixed(1)} m`
//                         : 'N/A'}
//                     </p>
//                   </div>
//                 </div>
//                 <div className="quality-indicator">
//                   <div
//                     className={`quality-dot ${
//                       location.accuracy < 10
//                         ? 'quality-excellent'
//                         : location.accuracy < 30
//                         ? 'quality-good'
//                         : 'quality-poor'
//                     }`}
//                   ></div>
//                   <p className="quality-text">
//                     {location.accuracy < 10
//                       ? 'Excellent GPS Signal'
//                       : location.accuracy < 30
//                       ? 'Good GPS Signal'
//                       : 'Poor GPS Signal'}
//                   </p>
//                 </div>
                
//                 {/* --- (YAHAN BADLAV HAI) --- */}
//                 <div className="proceed-button-container">
//                   <button
//                     onClick={handleProceedClick}
//                     className="proceed-button"
//                     disabled={loading}
//                   >
//                     <CheckSquare size={18} /> Proceed to Survey (Point)
//                   </button>
                  
//                   {/* --- new btn for road/polygon survey --- */}
// <button
 // onClick={handleProceedPolygonSurvey}
  //className="proceed-button"
 // style={{ backgroundColor: '#4CAF50', marginTop: '10px' }}
//>
 // <CheckSquare size={18} /> Proceed to Survey (Polygon)
//</button>

//                   {/* --- NAYA BUTTON (Polygon download ke liye) --- */}
//                   <button
//                     onClick={handleDownloadDrawnKML}
//                     className="proceed-button"
//                     style={{ backgroundColor: '#4CAF50', marginTop: '10px' }} // Thoda alag style
//                   >
//                     <Download size={18} /> Download Drawn Polygon
//                   </button>
//                 </div>

//               </div>
//             )}
//           </div>
//           <div className="layout-right">
//             {/* ... (map-wrapper, loading, error, mapRef div... sab waisa hi hai) ... */}
//             <div className="map-wrapper fade-in-item">
//               {loading && (
//                 <div className="map-loading">
//                   <div className="loading-content">
//                     <Loader className="loading-spinner" strokeWidth={1.5} />
//                     <p className="loading-text">Getting your location...</p>
//                   </div>
//                 </div>
//               )}
//               {error && (
//                 <div className="map-error">
//                   <div className="error-content">
//                     <div className="error-icon">
//                       <MapPin className="error-svg" strokeWidth={1.5} />
//                     </div>
//                     <h3 className="error-title">Location Access Required</h3>
//                     <p className="error-message">{error}</p>
//                     <button onClick={refreshLocation} className="error-button">
//                       Try Again
//                     </button>
//                   </div>
//                 </div>
//               )}
//               <div
//                 ref={mapRef}
//                 className={`map ${!(loading || error) ? 'map-visible' : ''}`}
//               ></div>
//               {location && (
//                 <button
//                   onClick={recenterMap}
//                   className="recenter-map-button"
//                   title="Recenter Map"
//                 >
//                   <Navigation className="recenter-icon" strokeWidth={1.5} />
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//       <HouseDetailsModal
//         isOpen={isModalOpen}
//         onClose={() => setModalOpen(false)}
//         onSave={handleSaveSurvey}
//         capturedLocation={capturedLocation}
//       />
//     </div>
//   );
// }

// MapComponent.js (ready to paste)
import { useState, useEffect, useRef, useCallback } from 'react';
// --- NAYA IMPORT (Download icon ke liye) ---
import { MapPin, Navigation, Loader, Crosshair, CheckSquare, Download, Sun, Moon, Satellite, LogOut } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// --- NAYE IMPORTS (Leaflet-Draw ke liye) ---
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import tokml from 'tokml'; // KML export ke liye
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../../config/endpoints';
import '../Style/map.css';
import FormSelectionModal from './FormSelectionModal';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Authentication/JavaScript/AuthContext";

import PropertyDetailsForm from './PropertyDetailsForm';
import Notice119Form from './Notice119Form';
import HearingNoticeForm from './HearingNoticeForm';
import AppealForm from './AppealForm';
import Namuna43Form from './Namuna43Form';

// Socket.io client setup
const socket = io(SOCKET_URL);
  socket.on('connect', () => console.log('connected', socket.id));
  socket.on('survey:created', (data) => {
    console.log('New survey created:', data);
    // e.g. re-fetch /api/get-surveys or update map
  });
  socket.on('survey:updated', (data) => {
    console.log('Survey updated:', data);
    // update styles on map
  });
/* =========================
   STATIC LOCATION: change these values to whatever fixed lat/lng you want.
   Provide completeness (accuracy/altitude etc.) so other logic doesn't get undefined.
   ========================= */
const STATIC_LOCATION = {
  lat: 21.096398,
  lng: 79.109468,
  accuracy: 5, // pretend good accuracy to avoid 'undefined' checks elsewhere
  altitude: 0,
  altitudeAccuracy: null,
  heading: null,
  speed: null,
};

export default function MapComponent() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formSelectorOpen, setFormSelectorOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [polygonLocation, setPolygonLocation] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const staticAppliedRef = useRef(false);

  const { isAuthenticated, authLoading, logout, user } = useAuth();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('geosurvey-theme') === 'dark');
  const toggleTheme = () => {
    setDarkMode(prev => {
      const next = !prev;
      const nextTheme = next ? 'dark' : 'light';
      localStorage.setItem('geosurvey-theme', nextTheme);
      document.body.classList.toggle('theme-dark', next);
      document.body.classList.toggle('theme-light', !next);
      window.dispatchEvent(new CustomEvent('geosurvey-theme-change', { detail: nextTheme }));
      return next;
    });
  };

  const displayName = user?.fullName || user?.email || "Survey User";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SU";

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  function collectPolygonsGeoJSON() {
    if (!drawnItemsRef.current) return null;
    const fc = drawnItemsRef.current.toGeoJSON();

    fc.features.forEach((feature) => {
      feature.properties = feature.properties || {};
      feature.properties.usageOfProperty = feature.properties.usageOfProperty || 'default';

      if (!feature.properties.surveyPoint) {
        if (location) {
          feature.properties.surveyPoint = [location.lng, location.lat];
        } else {
          feature.properties.surveyPoint = [STATIC_LOCATION.lng, STATIC_LOCATION.lat];
        }
      }
    });

    return fc;
  }

  function getPolygonCentroid(coords) {
  let sumLng = 0;
  let sumLat = 0;

  coords.forEach(([lng, lat]) => {
    sumLng += lng;
    sumLat += lat;
  });

  return {
    lat: sumLat / coords.length,
    lng: sumLng / coords.length
  };
}

  // ... (fetchAccurateLocation function waisa hi hai) ...
  const fetchAccurateLocation = useCallback((onSuccess, onError) => {
    if (!navigator.geolocation) {
      onError('Geolocation is not supported by your browser');
      return;
    }
    let bestAccuracy = Infinity;
    let attempts = 0;
    const maxAttempts = 5;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        attempts++;
        const currentAccuracy = position.coords.accuracy;
        if (currentAccuracy < bestAccuracy) {
          bestAccuracy = currentAccuracy;
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          };
          onSuccess(newLocation);
        }
        if (attempts >= maxAttempts || currentAccuracy < 10) {
          navigator.geolocation.clearWatch(watchId);
        }
      },
      (error) => {
        onError(error.message);
        navigator.geolocation.clearWatch(watchId);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  /* ===========================================
     ORIGINAL: useEffect that fetched GPS on mount
     CHANGED: apply STATIC_LOCATION only once to prevent map re-init loops
     If you want live GPS again, you can revert to the original fetchAccurateLocation call.
     =========================================== */
  useEffect(() => {
    // Apply static location only once on mount
    if (!staticAppliedRef.current) {
      staticAppliedRef.current = true;
      setLocation(STATIC_LOCATION);
      setLoading(false);
      setError(null);
    }
    // empty deps -> run once on mount
  }, []);

  // --- (IS useEffect MEIN BADLAV HAI) ---
  useEffect(() => {
    // Map init guarded by: location present AND mapInstanceRef not created
    if (location && mapRef.current && !mapInstanceRef.current) {
      const userPosition = [location.lat, location.lng];

      // custom pulsing icon
      const customIcon = L.divIcon({
        className: 'leaflet-pulsing-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      // create map once
      const map = L.map(mapRef.current, {
        zoomControl: true,
      }).setView(userPosition, 19);

      // Retina-aware Google Satellite (HD)
const isRetina = window.devicePixelRatio && window.devicePixelRatio > 1;
const googleScale = isRetina ? 2 : 1;

L.tileLayer(
  `https://mt1.google.com/vt/lyrs=s&scale=${googleScale}&x={x}&y={y}&z={z}`,
  {
    maxZoom: 23,
    maxNativeZoom: 20,   // prevents Leaflet from requesting too-high native tiles
    tileSize: isRetina ? 512 : 256, // use 512 when using scale=2
    zoomOffset: isRetina ? -1 : 0,  // align zoom when tileSize=512
    attribution: '© Google'
  }
).addTo(map);


      // marker + accuracy circle
      const marker = L.marker(userPosition, { icon: customIcon }).addTo(map);
      const circle = L.circle(userPosition, {
        radius: location.accuracy,
        color: '#4F46E5',
        fillColor: '#4F46E5',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(map);

      // store refs so we don't recreate map later
      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      // --- NAYA CODE (LEAFLET-DRAW) ---
      // 1. Ek FeatureGroup banayein jahan drawn items store honge
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnItemsRef.current = drawnItems; // Ref mein store karein

      // 2. Draw controls ko map par add karein
      const drawControl = new L.Control.Draw({
        edit: {
          featureGroup: drawnItems, // Allow editing/deleting drawn items
          remove: true,
        },
        draw: {
          polygon: true,   // Polygon drawing enable karein
          polyline: true,  // Line drawing enable karein
          rectangle: true, // Rectangle drawing enable karein
          circle: false,   // Disable circle
          marker: false,   // Disable marker (hum GPS marker use kar rahe hain)
          circlemarker: false, // Disable circle marker
        },
      });
      map.addControl(drawControl);

      // 3. Jab koi shape create ho, toh use 'drawnItems' group mein add karein
      map.on(L.Draw.Event.CREATED, function (event) {

  const layer = event.layer;

  // Add polygon to map
  drawnItems.addLayer(layer);

  // Get polygon coordinates
  const geo = layer.toGeoJSON();
  const coords = geo.geometry.coordinates[0];

  // Calculate centroid
  const centroid = getPolygonCentroid(coords);

  // Save centroid for forms
  setPolygonLocation({
    latitude: centroid.lat,
    longitude: centroid.lng,
    geometry: geo.geometry,
    coordinates: coords
  });

  console.log("Polygon centroid:", centroid);

});

      // --- NAYA CODE (LEAFLET-DRAW) KHATAM ---
    }
  }, [location]); // Dependency waisa hi hai — map only init once because mapInstanceRef blocks re-creation

  // Update marker/circle when location (rarely) changes
  useEffect(() => {
    if (location && mapInstanceRef.current && markerRef.current && circleRef.current) {
      const newPos = [location.lat, location.lng];
      markerRef.current.setLatLng(newPos);
      circleRef.current.setLatLng(newPos).setRadius(location.accuracy);
    }
  }, [location]);

  // recenterMap uses current location — safe even in static mode
  const recenterMap = useCallback(() => {
    if (mapInstanceRef.current && location) {
      mapInstanceRef.current.setView([location.lat, location.lng], 19);
    }
  }, [location]);

  // refreshLocation still uses GPS; keep as-is so you can turn on live mode later
  const refreshLocation = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAccurateLocation(
      (newLocation) => {
        setLocation(newLocation);
        setLoading(false);
        setError(null);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newLocation.lat, newLocation.lng], 19);
        }
      },
      (errorMessage) => {
        setError(errorMessage);
        setLoading(false);
      }
    );
  }, [fetchAccurateLocation]);

  const handleProceedClick = () => {
    if (location) {
      setCapturedLocation(location);
     setFormSelectorOpen(true); 
    } else {
      alert('Location not available. Please wait or refresh.');
    }
  };
  const handleFormSelect = (formType) => {
  setFormSelectorOpen(false);
  setSelectedForm(formType);
};

  // --- NAYI FUNCTION (Aapke KML.js se) ---
  // Yeh function drawn POLYGONS/LINES ko KML mein download karegi
  // modified function with styling
  const handleDownloadDrawnKML = () => {
    if (!drawnItemsRef.current) {
      alert("Draw layer abhi initialize nahin hua hai.");
      return;
    }

    // Convert drawn shapes to GeoJSON
    const allGeoJSON = drawnItemsRef.current.toGeoJSON();

    // Keep polygons / lines
    const filtered = {
      type: "FeatureCollection",
      features: allGeoJSON.features.filter((f) =>
        ["Polygon", "Rectangle", "LineString"].includes(f.geometry.type)
      ),
    };

    if (filtered.features.length === 0) {
      alert("Export karne ke liye koi Polygon ya Line draw nahin kiya gaya hai.");
      return;
    }

    // Generate base KML
    let kml = tokml(filtered);

    // ---------------------------
    // 🔵 BLUE STYLING FOR KML
    // Leaflet blue = #4F46E5
    // Fill opacity 0.1 => alpha hex = 19
    // KML format = AABBGGRR
    //
    // stroke = FF E5 46 4F  => FFE5464F
    // fill   = 19 E5 46 4F  => 19E5464F
    // ---------------------------

    const styleBlock = `
      <Style id="bluePolygon">
        <LineStyle>
          <color>FFE5464F</color>   <!-- Blue stroke -->
          <width>2</width>
        </LineStyle>
        <PolyStyle>
          <color>80E5464F</color>   <!-- Blue fill with opacity ~50% -->
          <fill>1</fill>
          <outline>1</outline>
        </PolyStyle>
      </Style>
    `;

    // Insert style inside <Document>
    kml = kml.replace(/<Document([^>]*)>/i, `<Document$1>${styleBlock}`);

    // Attach style to each Placemark
    kml = kml.replace(/<Placemark>/g, `<Placemark>\n<styleUrl>#bluePolygon</styleUrl>`);

    // Download final styled KML
    const blob = new Blob([kml], {
      type: "application/vnd.google-earth.kml+xml",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drawn_boundary.kml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

 const handleProceedPolygonSurvey = () => {
  if (!drawnItemsRef.current) {
    alert("Please draw a polygon first");
    return;
  }

  const polygonsGeoJSON = collectPolygonsGeoJSON();

  if (!polygonsGeoJSON || polygonsGeoJSON.features.length === 0) {
    alert("No polygon found");
    return;
  }

  const kmlString = tokml(polygonsGeoJSON);

  const payload = {
    layerType: "road",
    polygons: polygonsGeoJSON,
    kmlData: kmlString,
    hasVideo: true,
    // videoUrl: "/videos/road-survey.mp4",
    createdFrom: "digital-twin",
  };

  fetch(`${API_BASE_URL}/api/road-survey/save`, {
  // ✅ ONLY THIS CHANGE
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    })
    .then((data) => {
      alert("Polygon survey saved successfully");
      console.log("Saved polygon:", data);
    })
    .catch((err) => {
      console.error(err);
      alert("Failed to save polygon survey");
    });
};


   // ⛔ BLOCK UI AFTER ALL HOOKS
  if (authLoading || !isAuthenticated) {
    return null;
  }
  const signalText =
    location && location.accuracy < 10
      ? 'Excellent Signal'
      : location && location.accuracy < 30
      ? 'Good Signal'
      : 'Weak Signal';

  const signalClass =
    location && location.accuracy < 10
      ? 'accuracy-excellent'
      : location && location.accuracy < 30
      ? 'accuracy-good'
      : 'accuracy-poor';

  return (
    <div className={`map-container${darkMode ? ' dark' : ''}`}>
      <div className="map-content">
        <header className="survey-topbar fade-in-item">
          <div className="brand-block">
            <div className="brand-mark">G</div>
            <div>
              <h1 className="brand-title">GeoSurvey</h1>
              <p className="brand-subtitle">Field Data Collection</p>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="icon-btn theme-toggle" onClick={toggleTheme} title={darkMode ? 'Switch to Light' : 'Switch to Dark'}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="topbar-user">
              <span className="user-badge">{initials}</span>
              <span className="user-name" title={displayName}>{displayName}</span>
            </div>
            <button className="top-logout" onClick={handleLogout}>
              <LogOut size={15} /> Logout
            </button>
          </div>
        </header>

        <section className="page-head fade-in-item">
          <p className="crumb">Active Survey Session</p>
          <h2 className="page-title">Location Survey</h2>
          <p className="page-subtitle">Capture precise geospatial data with real-time GPS tracking.</p>
        </section>

        <div className="main-layout-container">
          <div className="layout-left">
            {location && (
              <div className="location-card fade-in-item">
                <div className="location-card-header">
                  <h2 className="location-card-title">GPS Signal Status</h2>
                  <button
                    onClick={refreshLocation}
                    className="refresh-button"
                    disabled={loading}
                  >
                    <Crosshair className="refresh-icon" strokeWidth={1.5} />
                    Refresh
                  </button>
                </div>
                <div className="location-grid">
                  <div className={`location-item signal-banner ${signalClass}`}>
                    <p className="location-value">{signalText}</p>
                    <p className="location-label signal-caption">All systems operational</p>
                  </div>
                  <div className="location-item">
                    <p className="location-label">Accuracy</p>
                    <p className="location-value">{location.accuracy.toFixed(1)} m</p>
                  </div>
                  <div className="location-item">
                    <p className="location-label">Satellites</p>
                    <p className="location-value">12</p>
                  </div>
                </div>

                <div className="coord-card">
                  <p className="coord-title">Current Coordinates</p>
                  <div className="coord-values">
                    <div>
                      <p className="location-label">Latitude</p>
                      <p className="location-value">{location.lat.toFixed(6)}°</p>
                    </div>
                    <div>
                      <p className="location-label">Longitude</p>
                      <p className="location-value">{location.lng.toFixed(6)}°</p>
                    </div>
                  </div>
                  <div className="meta-row">
                    <span>Altitude: {location.altitude ? `${location.altitude.toFixed(1)}m` : 'N/A'}</span>
                    <span>Timestamp: {new Date().toLocaleTimeString('en-GB')}</span>
                  </div>
                </div>

                <div className="proceed-button-container">
                  <button
                    onClick={handleProceedClick}
                    className="proceed-button"
                    disabled={loading}
                  >
                    <CheckSquare size={18} /> Start Point Survey
                  </button>
                  
                  <button
                    onClick={handleProceedPolygonSurvey}
                    className="proceed-button secondary-action"
                  >
                    <Satellite size={18} /> Road Survey
                  </button>

                  <button
                    onClick={handleDownloadDrawnKML}
                    className="proceed-button secondary-action"
                  >
                    <Download size={18} /> Export Polygon Data
                  </button>
                </div>

              </div>
            )}
          </div>
          <div className="layout-right">
            <div className="map-wrapper fade-in-item">
              <div className="map-chip-row">
                {/* <button className="map-chip active">Satellite View</button> */}
                {/* <button className="map-chip">Live Tracking</button> */}
              </div>

              {loading && (
                <div className="map-loading">
                  <div className="loading-content">
                    <Loader className="loading-spinner" strokeWidth={1.5} />
                    <p className="loading-text">Getting your location...</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="map-error">
                  <div className="error-content">
                    <div className="error-icon">
                      <MapPin className="error-svg" strokeWidth={1.5} />
                    </div>
                    <h3 className="error-title">Location Access Required</h3>
                    <p className="error-message">{error}</p>
                    <button onClick={refreshLocation} className="error-button">
                      Try Again
                    </button>
                  </div>
                </div>
              )}
              <div
                ref={mapRef}
                className={`map ${!(loading || error) ? 'map-visible' : ''}`}
              ></div>

              {location && (
                <button
                  onClick={recenterMap}
                  className="recenter-map-button"
                  title="Recenter Map"
                >
                  <Navigation className="recenter-icon" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
     {/* Form Selection Modal */}
<FormSelectionModal
  isOpen={formSelectorOpen}
  onClose={() => setFormSelectorOpen(false)}
  onSelect={handleFormSelect}
/>

{/* Property Details Form */}
{selectedForm === "property" && (
  <PropertyDetailsForm
  isOpen={true}
  onClose={() => setSelectedForm(null)}
  capturedLocation={capturedLocation}
  polygonLocation={polygonLocation}
/>
)}

{/* 119 Notice */}
{selectedForm === "notice119" && (
 <Notice119Form
  isOpen={true}
  onClose={() => setSelectedForm(null)}
  polygonLocation={polygonLocation}
/>
)}

{/* Hearing Notice */}
{selectedForm === "hearing" && (
  <HearingNoticeForm
  isOpen={true}
  onClose={() => setSelectedForm(null)}
  polygonLocation={polygonLocation}
/>
)}

{/* Appeal Form */}
{selectedForm === "appeal" && (
  <AppealForm
    isOpen={true}
    onClose={() => setSelectedForm(null)}
    polygonLocation={polygonLocation}
  />
)}

{/* Namuna 43 */}
{selectedForm === "namuna43" && (
<Namuna43Form
  isOpen={true}
  onClose={() => setSelectedForm(null)}
  polygonLocation={polygonLocation}
/>
)}

    </div>
  );
}
