// models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    purpose: { type: String, required: true },
    currency: { type: String, required: true },
    refundable: { type: String, required: true, default: 'yes' },
    rate: { type: String, required: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: "Applicant", required: true }, // Reference to the Applicant
    batchId: { type: String, required: true }, // New field to link payments in a batch
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", paymentSchema);
