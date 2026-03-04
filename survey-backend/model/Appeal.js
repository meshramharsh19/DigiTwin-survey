const mongoose = require("mongoose");

const appealSchema = new mongoose.Schema(
{
  ownerName: {
    type: String,
    required: true
  },
  ward: {
    type: String
  },
  propertyNo: {
    type: String
  },
  previousTax: {
    type: Number
  },
  revisedTax: {
    type: Number
  },
  appealReason: {
    type: String
  }
},
{ timestamps: true }
);

module.exports = mongoose.model("Appeal", appealSchema);