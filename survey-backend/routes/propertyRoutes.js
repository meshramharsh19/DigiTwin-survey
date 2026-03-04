const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");

router.post("/property-details", async (req, res) => {

  try {

    const db = mongoose.connection.db;

    const result = await db
      .collection("propertyDetails")
      .insertOne(req.body);

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