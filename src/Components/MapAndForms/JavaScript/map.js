import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Loader, Crosshair, CheckSquare } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../Style/map.css';
import HouseDetailsModal from './HouseDetailsModal';

// --- (नया Helper Function) ---
/**
 * KML string ko file ke roop mein download karata hai.
 * @param {string} kmlString - Poora KML content.
 * @param {string} fileName - File ka naam (e.g., "house-123.kml").
 */
const downloadKML = (kmlString, fileName) => {
  // 1. Ek Blob banayein (file in memory)
  const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });

  // 2. Ek invisible download link banayein
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;

  // 3. Link ko body mein jodein, click karein, aur hata dein
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href); // Memory clean karein
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

  // ... (fetchAccurateLocation, useEffects, recenterMap, refreshLocation... inmein koi badlav nahin) ...
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
    }
  }, [location]);

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

  // --- (YAHAN BADLAV HAI) ---
  const handleSaveSurvey = (formData) => {
    // KML String (aapke pichle code se)
    // (Aap ismein aur bhi formData fields jod sakte hain)
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

    // Server par bhejme ke liye data taiyaar karein
    const surveyData = {
      ...formData,
      location: {
        type: 'Point',
        coordinates: [capturedLocation.lng, capturedLocation.lat],
      },
      accuracy: capturedLocation.accuracy,
      kmlData: kmlString, // KML string ko database mein save karein
    };
    
    // File upload ko alag se handle karna hoga, abhi JSON se 'photos' hata rahe hain
    delete surveyData.photos;

    console.log('Data to be sent to MongoDB:', surveyData);

    // --- (Naya Kadam: File Download Karein) ---
    // File ka naam houseNumber ya propertyName se banayein
    const fileName = `${formData.houseNumber || formData.propertyName || 'survey'}.kml`;
    downloadKML(kmlString, fileName);


    // --- (Kadam 2: Database mein Save Karein - ab UNCOMMENTED) ---
    // (Sunishchit karein ki aapka backend server 'http://localhost:5000' par chal raha hai)
    
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
      // Future Step: Yahaan aap naya marker map par daal sakte hain
    })
    .catch((error) => {
      console.error('Error:', error);
      alert('Failed to save data to DB. See console. (KML might have downloaded)');
    });
    
  };

  return (
    <div className="map-container">
      {/* ... (Baaki saara JSX waisa hi hai) ... */}
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
                <div className="proceed-button-container">
                  <button
                    onClick={handleProceedClick}
                    className="proceed-button"
                    disabled={loading}
                  >
                    <CheckSquare size={18} /> Proceed to Survey
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="layout-right">
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