const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

router.post("/namuna43", async (req, res) => {

  try {

    const db = mongoose.connection.db;

    const result = await db
      .collection("namuna43Notices")
      .insertOne(req.body);

    res.status(201).json({
      message: "Namuna 43 notice saved",
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