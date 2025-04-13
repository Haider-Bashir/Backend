const express = require("express");
const Applicant = require("../models/Applicant");
const Payment = require("../models/Payment");
const mongoose = require("mongoose");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/authMiddleware");
const Branch = require("../models/branch");
const { uploadToCloudinary } = require("../middleware/uploadMiddleware");
const { extractPublicId } = require("../utils/cloudinary");
const {uploadMultipleToCloudinary, deleteFromCloudinary} = require("../middleware/uploadMultipleToCloudinary");


// @desc    Create a new applicant
// @route   POST /api/applicants
// @access  Manager/Admin (Managers can only create applicants for their branch)
router.post("/", protect, uploadToCloudinary("photo"), async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized - User not found" });
        }

        const { name, cnic, phoneNumber, email, address, city, country, counselor, visaType } = req.body;

        if (!name || !cnic || !phoneNumber) {
            return res.status(400).json({ message: "Name, CNIC, and Phone Number are required." });
        }

        let branchId = null;

        if (req.user.role === "manager") {
            // 🔹 Find the manager's assigned branch
            const branch = await Branch.findOne({ managerId: req.user._id });

            if (!branch) {
                return res.status(403).json({ message: "Manager is not assigned to any branch" });
            }
            branchId = branch._id;
        } else if (req.user.role === "admin") {
            // 🔹 Allow admin to set branchId manually
            branchId = req.body.branchId;
        }

        if (!branchId) {
            return res.status(400).json({ message: "Branch ID is required." });
        }

        const newApplicant = new Applicant({
            name,
            cnic,
            phoneNumber,
            email,
            address,
            city,
            country,
            counselor,
            visaType,
            branchId, // 🔹 Assign branchId
            photo: req.fileUrl || null,
        });

        await newApplicant.save();

        res.status(201).json(newApplicant);
    } catch (error) {
        console.error("❌ Error creating applicant:", error);
        res.status(500).json({ message: "Server error", error });
    }
});


// @desc Upload a new document for an applicant
// @route POST /api/applicants/:id/documents
router.post("/:id/documents", uploadToCloudinary("document"), async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ message: "Document title is required." });
        }

        const applicant = await Applicant.findById(req.params.id);
        if (!applicant) {
            return res.status(404).json({ message: "Applicant not found." });
        }

        const newDocument = {
            _id: new mongoose.Types.ObjectId(),
            title,
            path: req.fileUrl || null,
        };

        applicant.documents.push(newDocument);
        await applicant.save();

        res.status(201).json(newDocument);
    } catch (error) {
        console.error("Error uploading document:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// @desc    Get all applicants
// @route   GET /api/applicants
router.get("/", async (req, res) => {
    try {
        const query = {};

        // 🔍 If branchId is passed as query, filter
        if (req.query.branchId) {
            query.branchId = req.query.branchId;
        }

        const applicants = await Applicant.find(query);
        res.json(applicants);
    } catch (error) {
        console.error("Error fetching applicants:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// @desc    Get an applicant by ID
// @route   GET /api/applicants/:id
router.get("/:id", async (req, res) => {
    try {
        const applicant = await Applicant.findById(req.params.id);
        if (!applicant) {
            return res.status(404).json({ message: "Applicant not found." });
        }
        res.json(applicant);
    } catch (error) {
        console.error("Error fetching applicant:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// @desc    Update an applicant
// @route   PUT /api/applicants/:id
router.put("/:id", uploadToCloudinary("photo"), async (req, res) => {
    try {
        const applicant = await Applicant.findById(req.params.id);
        const { name, cnic, phoneNumber, city, address, country, qualification, counselor, visaType } = req.body;

        // Delete old photo if a new one was uploaded
        if (req.fileUrl && applicant.photo) {
            const oldPublicId = extractPublicId(applicant.photo);
            await deleteFromCloudinary(oldPublicId, "image");
        }

        let photo = req.fileUrl || req.body.photo || null;

        // Remove 'public' from the path and replace backslashes with forward slashes
        if (photo && photo.includes('public')) {
            photo = photo.replace('public', '').replace(/\\/g, '/');
        }

        const updatedApplicant = await Applicant.findByIdAndUpdate(
            req.params.id,
            { name, cnic, phoneNumber, city, address, country, qualification, counselor, visaType, photo },
            { new: true }
        );

        if (!updatedApplicant) {
            return res.status(404).json({ message: "Applicant not found." });
        }

        res.json(updatedApplicant);
    } catch (error) {
        console.error("Error updating applicant:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// @desc    Delete an applicant
// @route   DELETE /api/applicants/:id
router.delete("/:id", async (req, res) => {
    try {
        const applicant = await Applicant.findById(req.params.id);

        if (!applicant) {
            return res.status(404).json({ message: "Applicant not found." });
        }

        await applicant.deleteOne();
        res.status(200).json({ message: "Applicant deleted successfully." });
    } catch (error) {
        console.error("Error deleting applicant:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// @desc Delete a document
// @route DELETE /api/applicants/:id/documents/:docId
router.delete("/:id/documents/:docId", async (req, res) => {
    try {
        const { id, docId } = req.params;
        const applicant = await Applicant.findById(id);
        if (!applicant) {
            return res.status(404).json({ message: "Applicant not found." });
        }

        const documentIndex = applicant.documents.findIndex(doc => doc._id.toString() === docId);
        if (documentIndex === -1) {
            return res.status(404).json({ message: "Document not found." });
        }

        const documentPath = path.join(__dirname, `../public${applicant.documents[documentIndex].path}`);

        // Delete the file from the system
        fs.unlink(documentPath, (err) => {
            if (err) console.error("Error deleting file:", err);
        });

        // Remove from database
        applicant.documents.splice(documentIndex, 1);
        await applicant.save();

        res.status(200).json({ message: "Document deleted successfully." });
    } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// @desc    Update applicant education details
// @route   PUT /api/applicants/:id/education
router.put("/:id/education", async (req, res) => {
    try {
        const { futureEducationDetails } = req.body;

        const updatedApplicant = await Applicant.findByIdAndUpdate(
            req.params.id,
            { $set: { futureEducationDetails } },
            { new: true }
        );

        if (!updatedApplicant) {
            return res.status(404).json({ message: "Applicant not found." });
        }

        res.status(200).json(updatedApplicant);
    } catch (error) {
        console.error("Error updating education details:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

router.post("/:id/processing",
    uploadMultipleToCloudinary([
    { name: 'offerLetterFile', maxCount: 1 },
    { name: 'confirmationInvoiceFile', maxCount: 1 },
    { name: 'embassyAppointmentFile', maxCount: 1 },
]),
    async (req, res) => {
    try {
        const {
            status,
            processingNotes,
            applyForOfferLetterStatus,
            offerLetterReceived,
            attestation,
            fileToEmbassy,
            visaStatus,

            offerLetterFileName,
            offerLetterFilePath,

            confirmationInvoiceFileName,
            confirmationInvoiceFilePath,

            embassyAppointmentFileName,
            embassyAppointmentFilePath,
        } = req.body;

        const applicantId = req.params.id;

        const applicant = await Applicant.findById(applicantId);
        if (!applicant) {
            return res.status(404).json({ message: "Applicant not found." });
        }

        // Check if processing data exists
        const existingProcessing = applicant.processing[0]; // Assuming only one processing object exists

        // Build new file info from uploaded files or fallback to request body
        const offerLetterFilePathz = req.files['offerLetterFile']
            ? req.files['offerLetterFile'][0].path
            : offerLetterFilePath || null;

        const offerLetterFileNamez = req.files['offerLetterFile']
            ? req.files['offerLetterFile'][0].originalname
            : offerLetterFileName || null;

        const confirmationInvoiceFilePathz = req.files['confirmationInvoiceFile']
            ? req.files['confirmationInvoiceFile'][0].path
            : confirmationInvoiceFilePath || null;

        const confirmationInvoiceFileNamez = req.files['confirmationInvoiceFile']
            ? req.files['confirmationInvoiceFile'][0].originalname
            : confirmationInvoiceFileName || null;

        const embassyAppointmentFilePathz = req.files['embassyAppointmentFile']
            ? req.files['embassyAppointmentFile'][0].path
            : embassyAppointmentFilePath || null;

        const embassyAppointmentFileNamez = req.files['embassyAppointmentFile']
            ? req.files['embassyAppointmentFile'][0].originalname
            : embassyAppointmentFileName || null;

        if (existingProcessing) {
            // Delete old file before saving new file (if file paths are different)
            if (
                req.files['offerLetterFile'] &&
                existingProcessing.offerLetterFilePath &&
                existingProcessing.offerLetterFilePath !== offerLetterFilePathz
            ) {
                await deleteFromCloudinary(existingProcessing.offerLetterFilePath);
            }

            // Delete the old confirmationInvoiceFile if it exists and is different
            if (
                req.files['confirmationInvoiceFile'] &&
                existingProcessing.confirmationInvoiceFilePath &&
                existingProcessing.confirmationInvoiceFilePath !== confirmationInvoiceFilePathz
            ) {
                await deleteFromCloudinary(existingProcessing.confirmationInvoiceFilePath);
            }

            // Delete the old embassyAppointmentFile if it exists and is different
            if (
                req.files['embassyAppointmentFile'] &&
                existingProcessing.embassyAppointmentFilePath &&
                existingProcessing.embassyAppointmentFilePath !== embassyAppointmentFilePathz
            ) {
                await deleteFromCloudinary(existingProcessing.embassyAppointmentFilePath);
            }

            // Update the processing data without adding new objects
            existingProcessing.applyForOfferLetterStatus = applyForOfferLetterStatus;
            existingProcessing.offerLetterReceived = offerLetterReceived;

            existingProcessing.offerLetterFileName = offerLetterFileNamez;
            existingProcessing.offerLetterFilePath = offerLetterFilePathz;

            existingProcessing.confirmationInvoiceFileName = confirmationInvoiceFileNamez;
            existingProcessing.confirmationInvoiceFilePath = confirmationInvoiceFilePathz;

            existingProcessing.attestation = attestation;

            existingProcessing.embassyAppointmentFileName = embassyAppointmentFileNamez;
            existingProcessing.embassyAppointmentFilePath = embassyAppointmentFilePathz;

            existingProcessing.fileToEmbassy = fileToEmbassy || existingProcessing.fileToEmbassy;
            existingProcessing.visaStatus = visaStatus;
        } else {
            // If no processing data exists, create the first entry
            const newProcessing = {
                applyForOfferLetterStatus,
                offerLetterReceived,

                offerLetterFileName,
                offerLetterFilePath,

                confirmationInvoiceFileName,
                confirmationInvoiceFilePath,

                attestation,

                embassyAppointmentFileName,
                embassyAppointmentFilePath,

                fileToEmbassy,
                visaStatus,
            };
            applicant.processing.push(newProcessing);
        }

        // Handle processing notes
        const newProcessingNotes = Array.isArray(processingNotes) ? processingNotes.map((note) => ({
            note: note.note,
            saveTime: note.saveTime || new Date(),
        })) : [];

        const uniqueNotes = [
            ...new Set([
                ...applicant.processingNotes.map((existingNote) => existingNote.note),
                ...newProcessingNotes.map((newNote) => newNote.note),
            ]),
        ];

        // Update status and notes
        applicant.status = status;
        applicant.processingNotes = uniqueNotes.map((note) => ({
            note,
            saveTime: new Date(),
        }));

        await applicant.save();

        res.status(200).json({
            message: "Processing status and notes updated successfully",
            applicant: applicant,
        });
    } catch (error) {
        console.error("Error updating processing status and notes:", error);
        res.status(500).json({ message: "Server error", error });
    }
});


// @desc    Delete a processing note for an applicant
// @route   POST /api/applicants/:id/processing/deleteNote
router.post("/:id/processing/deleteNote", async (req, res) => {
    try {
        const { noteId } = req.body; // The noteId to be deleted
        const applicantId = req.params.id;

        // Ensure that applicant exists
        const applicant = await Applicant.findById(applicantId);
        if (!applicant) {
            return res.status(404).json({ message: "Applicant not found." });
        }

        // Find and remove the note by its _id
        // Update the applicant's processingNotes array
        applicant.processingNotes = applicant.processingNotes.filter(note => note._id.toString() !== noteId);

        await applicant.save();

        res.status(200).json({
            message: "Note deleted successfully",
            applicant: applicant,
        });
    } catch (error) {
        console.error("Error deleting processing note:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// @desc    Get all payments for a specific applicant
// @route   GET /api/applicants/:id/payments
router.get("/:id/payments", async (req, res) => {
    try {
        const applicantId = req.params.id;

        // Find payments for the applicant using the correct field, which is `applicant` (not `applicantId`)
        const payments = await Payment.find({ applicant: applicantId });  // Ensure `applicant` is the correct field

        if (!payments || payments.length === 0) {
            return res.status(404).json({ message: "No payments found for this applicant." });
        }

        res.json(payments);
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({ message: "Server error", error });
    }
});


// @desc    Add a new payment to the applicant's record
// @route   POST /api/applicants/:id/payments
// @access  Private
router.post("/:id/payments", async (req, res) => {
    try {
        const { amount, purpose, currency, refundable, rate, batchId } = req.body;
        const applicantId = req.params.id;

        // Check if all required fields are provided
        if (!amount || !purpose || !currency || !rate || !refundable) {
            return res.status(400).json({ message: "All fields (amount, purpose, currency, refundable, rate) are required." });
        }

        // Find the applicant by ID
        const applicant = await Applicant.findById(applicantId);
        if (!applicant) {
            return res.status(404).json({ message: "Applicant not found." });
        }

        // Create the payment
        const newPayment = new Payment({
            amount,
            purpose,
            currency,
            refundable,
            rate,
            applicant: applicantId, // Reference to the applicant in the payments table
            batchId,
        });

        // Save the payment
        await newPayment.save();

        res.status(201).json(newPayment); // Return the saved payment
    } catch (error) {
        console.error("Error adding payment:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// @desc    Delete a single payment by ID
// @route   DELETE /api/applicants/:applicantId/payments/:paymentId
// @access  Private
router.delete("/:applicantId/payments/:paymentId", async (req, res) => {
    try {
        const { paymentId } = req.params;

        // Find the payment by its ID
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment not found." });
        }

        // Ensure that the payment belongs to the correct applicant (optional validation)
        if (!payment.applicant.equals(req.params.applicantId)) {
            return res.status(400).json({ message: "Payment does not belong to this applicant." });
        }

        // Delete the payment from the Payment collection
        await Payment.findByIdAndDelete(paymentId);

        res.status(200).json({ message: "Payment deleted successfully." });
    } catch (error) {
        console.error("Error deleting payment:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// @desc    Delete all payments by batchId for a specific applicant
// @route   DELETE /api/applicants/:applicantId/payments/:batchId/deleteAll
// @access  Private
router.delete("/:applicantId/payments/:batchId/deleteAll", async (req, res) => {
    try {
        const { applicantId, batchId } = req.params;

        // Find and delete all payments for this applicant and batchId
        const result = await Payment.deleteMany({ applicant: applicantId, batchId: batchId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "No payments found for this batch and applicant." });
        }

        res.status(200).json({ message: "All payments for this batch have been deleted." });
    } catch (error) {
        console.error("Error deleting payments for batch:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// Fetch the agreed amount and currency for an applicant
router.get('/:id/agreedAmount', async (req, res) => {
    try {
        const applicant = await Applicant.findById(req.params.id);
        if (!applicant) {
            return res.status(404).json({ message: "Applicant not found." });
        }

        const agreedAmount = applicant.agreement.agreedAmount || null;
        const agreedCurrency = applicant.agreement.agreedCurrency || "PKR";
        res.json({ amount: agreedAmount, currency: agreedCurrency });
    } catch (error) {
        console.error("Error fetching agreed amount:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

// Update the agreed amount and currency for an applicant
router.put('/:id/agreedAmount', async (req, res) => {
    try {
        const { amount, currency } = req.body;
        const applicant = await Applicant.findById(req.params.id);
        if (!applicant) {
            return res.status(404).json({ message: "Applicant not found." });
        }

        applicant.agreement.agreedAmount = amount;
        applicant.agreement.agreedCurrency = currency;

        await applicant.save();
        res.json({ amount: applicant.agreement.agreedAmount, currency: applicant.agreement.agreedCurrency });
    } catch (error) {
        console.error("Error updating agreed amount:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

module.exports = router;
