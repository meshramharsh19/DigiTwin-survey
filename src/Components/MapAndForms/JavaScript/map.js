import { useState, useEffect, useRef, useCallback } from 'react';
// --- NAYA IMPORT (Download icon ke liye) ---
import { MapPin, Navigation, Loader, Crosshair, CheckSquare, Download } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// --- NAYE IMPORTS (Leaflet-Draw ke liye) ---
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import tokml from 'tokml'; // KML export ke liye

import '../Style/map.css';
import HouseDetailsModal from './HouseDetailsModal';

/**
 * KML string ko file ke roop mein download karata hai.
 * @param {string} kmlString - Poora KML content.
 * @param {string} fileName - File ka naam (e.g., "house-123.kml").
 */
const downloadKML = (kmlString, fileName) => {
  const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export default function MapComponent() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [capturedLocation, setCapturedLocation] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  
  // --- NAYA REF (Drawn shapes ko store karne ke liye) ---
  const drawnItemsRef = useRef(null);

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


  // ... (Pehla useEffect waisa hi hai) ...
  useEffect(() => {
    setLoading(true);
    fetchAccurateLocation(
      (newLocation) => {
        setLocation(newLocation);
        setLoading(false);
        setError(null);
      },
      (errorMessage) => {
        setError(errorMessage);
        setLoading(false);
      }
    );
  }, [fetchAccurateLocation]);


  // --- (IS useEffect MEIN BADLAV HAI) ---
  useEffect(() => {
    if (location && mapRef.current && !mapInstanceRef.current) {
      const userPosition = [location.lat, location.lng];
      const customIcon = L.divIcon({
        className: 'leaflet-pulsing-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const map = L.map(mapRef.current, {
        zoomControl: true,
      }).setView(userPosition, 19);
      
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution:
            '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        }
      ).addTo(map);

      const marker = L.marker(userPosition, { icon: customIcon }).addTo(map);
      const circle = L.circle(userPosition, {
        radius: location.accuracy,
        color: '#4F46E5',
        fillColor: '#4F46E5',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(map);

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
        drawnItems.addLayer(layer);
      });
      // --- NAYA CODE (LEAFLET-DRAW) KHATAM ---

    }
  }, [location]); // Dependency waisi hi hai

  // ... (Baaki useEffects, recenterMap, refreshLocation, handleProceedClick... sab waisa hi hai) ...
  useEffect(() => {
    if (location && mapInstanceRef.current && markerRef.current && circleRef.current) {
      const newPos = [location.lat, location.lng];
      markerRef.current.setLatLng(newPos);
      circleRef.current.setLatLng(newPos).setRadius(location.accuracy);
    }
  }, [location]);

  const recenterMap = useCallback(() => {
    if (mapInstanceRef.current && location) {
      mapInstanceRef.current.setView([location.lat, location.lng], 19);
    }
  }, [location]);

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
      setModalOpen(true);
    } else {
      alert('Location not available. Please wait or refresh.');
    }
  };
  

  // --- (handleSaveSurvey function waisa hi hai, yeh POINT KML banata hai) ---
  const handleSaveSurvey = (formData) => {
    const kmlString = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
 <Placemark>
   <name>${formData.propertyName || formData.houseNumber || 'Survey Point'}</name>
   <description>
     Owner: ${formData.ownerName}
     Occupier: ${formData.occupierName}
     Address: ${formData.propertyAddress}
     Usage: ${formData.usageOfProperty}
     Total Area: ${formData.totalArea}
   </description>
   <Point>
     <coordinates>${capturedLocation.lng},${capturedLocation.lat},${capturedLocation.altitude || 0}</coordinates>
   </Point>
 </Placemark>
</kml>`;

    const surveyData = {
      ...formData,
      location: {
        type: 'Point',
        coordinates: [capturedLocation.lng, capturedLocation.lat],
      },
      accuracy: capturedLocation.accuracy,
      kmlData: kmlString,
    };
    
    delete surveyData.photos;
    console.log('Data to be sent to MongoDB:', surveyData);

    const fileName = `${formData.houseNumber || formData.propertyName || 'survey'}.kml`;
    downloadKML(kmlString, fileName); // Helper function ka istemal

    fetch('http://localhost:5000/api/save-survey', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(surveyData),
    })
    .then(response => response.json())
    .then(data => {
      console.log('Success:', data);
      alert('Survey data saved to DB and KML file downloaded!');
    })
    .catch((error) => {
      console.error('Error:', error);
      alert('Failed to save data to DB. See console. (KML might have downloaded)');
    });
  };

  // --- NAYI FUNCTION (Aapke KML.js se) ---
  // Yeh function drawn POLYGONS/LINES ko KML mein download karegi
  //modified function with styling
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
        <color>80E5464F</color>   <!-- Blue fill with opacity 0.1 -->
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



  return (
    <div className="map-container">
      <div className="map-content">
        <div className="main-layout-container">
          <div className="layout-left">
            {location && (
              <div className="location-card fade-in-item">
                <div className="location-card-header">
                  <h2 className="location-card-title">Location Details</h2>
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
                  {/* ... (saare location-item divs waise hi hain) ... */}
                  <div className="location-item">
                    <p className="location-label">Latitude</p>
                    <p className="location-value">{location.lat.toFixed(7)}°</p>
                  </div>
                  <div className="location-item">
                    <p className="location-label">Longitude</p>
                    <p className="location-value">{location.lng.toFixed(7)}°</p>
                  </div>
                  <div
                    className={`location-item ${
                      location.accuracy < 10
                        ? 'accuracy-excellent'
                        : location.accuracy < 30
                        ? 'accuracy-good'
                        : 'accuracy-poor'
                    }`}
                  >
                    <p className="location-label">Accuracy</p>
                    <p
                      className={`location-value ${
                        location.accuracy < 10
                          ? 'accuracy-excellent-text'
                          : location.accuracy < 30
                          ? 'accuracy-good-text'
                          : 'accuracy-poor-text'
                      }`}
                    >
                      {location.accuracy.toFixed(2)} m
                    </p>
                  </div>
                  <div className="location-item">
                    <p className="location-label">Altitude</p>
                    <p className="location-value">
                      {location.altitude
                        ? `${location.altitude.toFixed(1)} m`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="quality-indicator">
                  <div
                    className={`quality-dot ${
                      location.accuracy < 10
                        ? 'quality-excellent'
                        : location.accuracy < 30
                        ? 'quality-good'
                        : 'quality-poor'
                    }`}
                  ></div>
                  <p className="quality-text">
                    {location.accuracy < 10
                      ? 'Excellent GPS Signal'
                      : location.accuracy < 30
                      ? 'Good GPS Signal'
                      : 'Poor GPS Signal'}
                  </p>
                </div>
                
                {/* --- (YAHAN BADLAV HAI) --- */}
                <div className="proceed-button-container">
                  <button
                    onClick={handleProceedClick}
                    className="proceed-button"
                    disabled={loading}
                  >
                    <CheckSquare size={18} /> Proceed to Survey (Point)
                  </button>
                  
                  {/* --- NAYA BUTTON (Polygon download ke liye) --- */}
                  <button
                    onClick={handleDownloadDrawnKML}
                    className="proceed-button"
                    style={{ backgroundColor: '#4CAF50', marginTop: '10px' }} // Thoda alag style
                  >
                    <Download size={18} /> Download Drawn Polygon
                  </button>
                </div>

              </div>
            )}
          </div>
          <div className="layout-right">
            {/* ... (map-wrapper, loading, error, mapRef div... sab waisa hi hai) ... */}
            <div className="map-wrapper fade-in-item">
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
      <HouseDetailsModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveSurvey}
        capturedLocation={capturedLocation}
      />
    </div>
  );
}