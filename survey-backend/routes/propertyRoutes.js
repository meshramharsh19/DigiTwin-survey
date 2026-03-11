const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { uploadKmlToGridFS } = require("../utils/kmlHelper");

router.post("/property-details", async (req, res) => {

  try {

    const db = mongoose.connection.db;

    const {
      ownerName,
      occupierName,
      address,
      mobile,
      ward,
      zone,
      newPropertyNo,
      oldPropertyNo,
      usageType,
      constructionType,
      constructionYear,
      area,
      rate,
      taxableValue,
      deduction,
      finalTaxableValue,
      propertyTax,
      educationTax,
      treeTax,
      fireTax,
      totalTax,
      latitude,
      longitude
    } = req.body;

    const propertyData = {
      ownerName,
      occupierName,
      address,
      mobile,
      ward,
      zone,
      newPropertyNo,
      oldPropertyNo,
      usageType,
      constructionType,
      constructionYear,
      area,
      rate,
      taxableValue,
      deduction,
      finalTaxableValue,
      propertyTax,
      educationTax,
      treeTax,
      fireTax,
      totalTax
    };

    if (latitude && longitude) {

      const lat = Number(latitude);
      const lng = Number(longitude);

      propertyData.latitude = lat;
      propertyData.longitude = lng;

      propertyData.location = {
        type: "Point",
        coordinates: [lng, lat]
      };

      propertyData.centroid = [lng, lat];

      propertyData.style = {
        color: "#009688",
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

      const fileName = `property-${Date.now()}.kml`;

      const fileId = await uploadKmlToGridFS(fileName, kmlString);

      propertyData.kmlFileId = fileId;

      propertyData.kmlUrl =
        `${req.protocol}://${req.headers.host}/api/kml/public/${fileId}`;
    }

    const result = await db
      .collection("propertyDetails")
      .insertOne(propertyData);

    res.status(201).json({
      message: "Property saved successfully",
      data: result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to save property"
    });

  }

});

module.exports = router;