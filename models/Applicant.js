const mongoose = require("mongoose");

const applicantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    photo: { type: String, default: null },
    cnic: { type: String, required: true },
    email: { type: String, default: null },
    phoneNumber: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String },
    country: { type: String },
    qualification: { type: String },
    idAllocation: { type: String },
    counselor: { type: String },
    visaType: { type: String, required: true, enum: ["Work Permit", "Student Visa", "Visit"] },
    status: { type: String, default: "active" },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true },
    agreement: {
        agreedAmount: { type: Number, default: null },
        agreedCurrency: { type: String, default: 'PKR' },
    },
    documents: [
        {
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
            title: { type: String, required: true },
            path: { type: String, required: true },
        }
    ],
    futureEducationDetails: {
        country: { type: String },
        city: { type: String },
        institute: { type: String },
        course: { type: String },
        intake: { type: String }
    },
    processing: [
        {
            applyForOfferLetterStatus: { type: String, enum: ["yes", "no"], default: "no" },
            offerLetterReceived: { type: String, enum: ["yes", "no"], default: "no" },

            offerLetterFileName: { type: String, default: "" },
            offerLetterFilePath: { type: String, default: "" },

            confirmationInvoiceFileName: { type: String, default: "" },
            confirmationInvoiceFilePath: { type: String, default: "" },

            attestation: {
                board: { type: String, enum: ["Pending", "Done", "NA"], default: "Pending" },
                ibcc: { type: String, enum: ["Pending", "Done", "NA"], default: "Pending" },
                hec: { type: String, enum: ["Pending", "Done", "NA"], default: "Pending" },
                mofa: { type: String, enum: ["Pending", "Done", "NA"], default: "Pending" },
                consulate: { type: String, enum: ["Pending", "Done", "NA"], default: "Pending" },
                apostille: { type: String, enum: ["Pending", "Done", "NA"], default: "Pending" },
                filePreparation: { type: String, enum: ["Pending", "Done", "NA"], default: "Pending" },
            },

            embassyAppointmentFileName: { type: String, default: "" },
            embassyAppointmentFilePath: { type: String, default: "" },

            fileToEmbassy: { type: String, default: null },
            visaStatus: { type: String, enum: ["Pending", "Applied", "Congrats", "Better luck next time!"], default: "Pending" },
            saveTime: { type: Date, default: Date.now }
        }
    ],
    processingNotes: [
        {
            note: { type: String },
            saveTime: { type: Date, default: Date.now },
        }
    ],
});

module.exports = mongoose.model("Applicant", applicantSchema);
