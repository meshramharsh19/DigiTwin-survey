const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

router.post("/notice119", async (req, res) => {

  try {

    const db = mongoose.connection.db;

    const result = await db
      .collection("notice119")
      .insertOne(req.body);

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