const express = require("express");
const mongoose = require("mongoose");
const Branch = require("../models/branch");

const router = express.Router();

// @desc    Get branch assigned to manager
// @route   GET /api/manager/my-branch
// @access  Private (Manager only)
router.get("/my-branch", async (req, res) => {
    try {
        const { managerId } = req.query; // Extract managerId from request

        if (!managerId) {
            return res.status(400).json({ message: "Manager ID is required." });
        }


        // Ensure managerId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(managerId)) {
            console.error("Invalid Manager ID:", managerId);
            return res.status(400).json({ message: "Invalid Manager ID format." });
        }

        // Convert managerId to ObjectId
        const objectId = new mongoose.Types.ObjectId(managerId);

        // Query with ObjectId
        const branch = await Branch.findOne({ managerId: objectId });

        if (!branch) {
            console.error("Branch Not Found for Manager:", objectId);
            return res.status(404).json({ message: "No branch assigned to this manager." });
        }

        res.json(branch);
    } catch (error) {
        console.error("Error fetching branch:", error);
        res.status(500).json({ message: "Server error", error });
    }
});

module.exports = router;
