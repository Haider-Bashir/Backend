const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Branch = require("../models/branch");
const { uploadSingle, uploadToCloudinary } = require("../middleware/uploadMiddleware");
const Payment = require("../models/Payment");
const Applicant = require("../models/Applicant");

// @desc    Add new branch
// @route   POST /api/branches
router.post("/", uploadSingle, uploadToCloudinary, async (req, res) => {
    try {
        const { name, city, phoneNumber } = req.body;
        if (!name || !city) {
            return res.status(400).json({ message: "Branch name and city are required" });
        }

        const newBranch = await Branch.create({
            name,
            city,
            phoneNumber,
            image: req.fileUrl, // Save file path
        });

        res.status(201).json(newBranch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all branches
// @route   GET /api/branches
router.get("/", async (req, res) => {
    try {
        const branches = await Branch.find();
        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get branch by ID
// @route   GET /api/branches/:id
router.get("/:id", async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }
        res.json(branch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put("/:id/removeManager", async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }

        branch.managerId = null; // Unlink the manager
        await branch.save();

        res.status(200).json({ message: "Manager removed from branch" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put("/:id/assignManager", async (req, res) => {
    try {
        const { managerId } = req.body;
        const branch = await Branch.findById(req.params.id);

        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }

        branch.managerId = managerId;
        await branch.save();

        res.status(200).json({ message: "Manager assigned successfully!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Edit branch details
// @route   PUT /api/branches/:id
router.put("/:id", upload.single("image"), async (req, res) => {
    try {
        const { name, city, phoneNumber } = req.body;
        const branch = await Branch.findById(req.params.id);

        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }

        branch.name = name || branch.name;
        branch.city = city || branch.city;
        branch.phoneNumber = phoneNumber || branch.phoneNumber;

        if (req.file) {
            branch.image = `/images/${req.file.filename}`; // Update image if provided
        }

        await branch.save();
        res.status(200).json(branch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete branch
// @route   DELETE /api/branches/:id
router.delete("/:id", async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);

        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }

        await branch.deleteOne();
        res.status(200).json({ message: "Branch deleted successfully" });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
});

router.get("/:id/stats", async (req, res) => {
    try {
        const branchId = new mongoose.Types.ObjectId(req.params.id); // ✅ FIXED

        // Get total revenue per currency for this branch
        const revenuePerCurrency = await Payment.aggregate([
            {
                $lookup: {
                    from: 'applicants',
                    localField: 'applicant',
                    foreignField: '_id',
                    as: 'applicant',
                },
            },
            { $unwind: '$applicant' },
            { $match: { 'applicant.branchId': branchId } },
            {
                $group: {
                    _id: '$currency', // Group by currency
                    total: { $sum: '$amount' },
                },
            },
        ]);

        // Get total number of applicants for this branch
        const totalApplicants = await Applicant.countDocuments({ branchId }); // ✅ Already an ObjectId

        // Get applicants by visa type for this branch
        const applicantsByVisaType = await Applicant.aggregate([
            { $match: { branchId } }, // ✅ Reuse ObjectId
            {
                $group: {
                    _id: '$visaType',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Return the stats
        res.json({
            revenuePerCurrency,
            totalApplicants,
            applicantsByVisaType,
        });
    } catch (error) {
        console.error("Error fetching branch stats:", error);
        res.status(500).json({ message: "Server error", error });
    }
});



module.exports = router;
