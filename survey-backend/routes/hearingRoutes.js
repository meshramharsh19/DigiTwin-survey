const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

router.post("/hearing-notice", async (req, res) => {

  try {

    const db = mongoose.connection.db;

    const result = await db
      .collection("hearingNotices")
      .insertOne(req.body);

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