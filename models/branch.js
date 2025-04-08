const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        city: { type: String, required: true },
        image: { type: String, required: true }, // Path to the uploaded image
        phoneNumber: { type: String }, // Optional
        managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const Branch = mongoose.model("Branch", branchSchema);
module.exports = Branch;
