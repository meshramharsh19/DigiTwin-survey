const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { uploadKmlToGridFS } = require("../utils/kmlHelper");

router.post("/notice119", async (req, res) => {

  try {

    const db = mongoose.connection.db;

    const {
      ownerName,
      ward,
      zone,
      newPropertyNo,
      oldPropertyNo,
      taxableValue,
      proposedTax,
      noticeDate,
      latitude,
      longitude
    } = req.body;

    const noticeData = {
      ownerName,
      ward,
      zone,
      newPropertyNo,
      oldPropertyNo,
      taxableValue,
      proposedTax,
      noticeDate
    };

    if (latitude && longitude) {

      const lat = Number(latitude);
      const lng = Number(longitude);

      noticeData.latitude = lat;
      noticeData.longitude = lng;

      noticeData.location = {
        type: "Point",
        coordinates: [lng, lat]
      };

      noticeData.centroid = [lng, lat];

      noticeData.style = {
        color: "#ff9800",
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

      const fileName = `notice119-${Date.now()}.kml`;

      const fileId = await uploadKmlToGridFS(fileName, kmlString);

      noticeData.kmlFileId = fileId;

      noticeData.kmlUrl =
        `${req.protocol}://${req.headers.host}/api/kml/public/${fileId}`;
    }

    const result = await db
      .collection("notice119")
      .insertOne(noticeData);

    res.status(201).json({
      message: "119 Notice saved",
      data: result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to save notice"
    });

  }

});

module.exports = router;