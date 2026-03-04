const express = require("express");
const router = express.Router();

const Appeal = require("../model/Appeal");

// POST: Save appeal
router.post("/appeal", async (req, res) => {
  try {
    const appeal = new Appeal(req.body);

    const savedAppeal = await appeal.save();

    res.status(201).json({
      message: "Appeal saved successfully",
      data: savedAppeal
    });

  } catch (error) {
    console.error("Error saving appeal:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;