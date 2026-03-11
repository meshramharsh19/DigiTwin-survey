const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { uploadKmlToGridFS } = require("../utils/kmlHelper");

router.post("/hearing-notice", async (req, res) => {

  try {

    const db = mongoose.connection.db;

    const {
      ownerName,
      address,
      ward,
      zone,
      hearingDate,
      hearingTime,
      hearingLocation,
      latitude,
      longitude
    } = req.body;

    const hearingData = {
      ownerName,
      address,
      ward,
      zone,
      hearingDate,
      hearingTime,
      hearingLocation
    };

    if (latitude && longitude) {

      const lat = Number(latitude);
      const lng = Number(longitude);

      hearingData.latitude = lat;
      hearingData.longitude = lng;

      hearingData.location = {
        type: "Point",
        coordinates: [lng, lat]
      };

      hearingData.centroid = [lng, lat];

      hearingData.style = {
        color: "#ff9900",
        opacity: 0.5,
        markerType: "square"
      };

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

      const fileName = `hearing-${Date.now()}.kml`;

      const fileId = await uploadKmlToGridFS(fileName, kmlString);

      hearingData.kmlFileId = fileId;

      hearingData.kmlUrl =
        `${req.protocol}://${req.headers.host}/api/kml/public/${fileId}`;
    }

    const result = await db
      .collection("hearingNotices")
      .insertOne(hearingData);

    res.status(201).json({
      message: "Hearing notice saved",
      data: result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to save hearing notice"
    });

  }

});

module.exports = router;