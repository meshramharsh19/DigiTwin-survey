const express = require("express");
const router = express.Router();
const Appeal = require("../model/Appeal");

const { uploadKmlToGridFS } = require("../utils/kmlHelper");

router.post("/appeal", async (req, res) => {
  try {

    const {
      ownerName,
      ward,
      propertyNo,
      previousTax,
      revisedTax,
      appealReason,
      latitude,
      longitude,
      polygonGeometry,
      polygonCoordinates
    } = req.body;

    const appealData = {
      ownerName,
      ward,
      propertyNo,
      previousTax: previousTax ? Number(previousTax) : null,
      revisedTax: revisedTax ? Number(revisedTax) : null,
      appealReason
    };

    if (latitude && longitude) {

      const lat = Number(latitude);
      const lng = Number(longitude);

      // Save coordinates
      appealData.latitude = lat;
      appealData.longitude = lng;

      // GeoJSON location
      appealData.location = {
        type: "Point",
        coordinates: [lng, lat]
      };

      // centroid
      appealData.centroid = [lng, lat];

      if (polygonGeometry) {
        appealData.polygonGeometry = polygonGeometry;
      }

      if (polygonCoordinates) {
        appealData.polygonCoordinates = polygonCoordinates;
      }

      // style for map
      appealData.style = {
        color: "#2975cc",
        opacity: 0.5,
        markerType: "square"
      };

      // KML generation
      const kmlString = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>${ownerName}</name>
      <Point>
        <coordinates>${lng},${lat},0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

      const fileName = `appeal-${Date.now()}.kml`;

      const fileId = await uploadKmlToGridFS(fileName, kmlString);

      appealData.kmlFileId = fileId;

      appealData.kmlUrl =
        `${req.protocol}://${req.headers.host}/api/kml/public/${fileId}`;
    }

    const appeal = new Appeal(appealData);

    const saved = await appeal.save();

    res.status(201).json(saved);

  } catch (error) {

    console.error("Appeal save error:", error);

    res.status(500).json({ error: error.message });

  }
});

module.exports = router;