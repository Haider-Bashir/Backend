const express = require("express");
const router = express.Router();
const Branch = require("../models/branch");
const User = require("../models/user");
const Applicant = require("../models/Applicant");

// Import authentication middleware
const { protect } = require("../middleware/authMiddleware");

// 🔍 SEARCH ROUTE (With Role-Based Filtering)
router.get("/", protect, async (req, res) => {
    const { query } = req.query;
    const user = req.user; // Extract logged-in user from token

    if (!query) {
        return res.status(400).json({ message: "Query parameter is required" });
    }

    try {
        let results = [];

        if (user.role === "admin") {

            // 🔹 Fetch Branches
            const branches = await Branch.find({ name: { $regex: query, $options: "i" } });

            // 🔹 Fetch Managers
            const managers = await User.find({
                role: "manager",
                $or: [
                    { firstName: { $regex: query, $options: "i" } },
                    { lastName: { $regex: query, $options: "i" } },
                    { phoneNumber: { $regex: query, $options: "i" } },
                ],
            });

            // 🔹 Fetch Applicants (Admin can search all)
            const applicants = await Applicant.find({
                $or: [
                    { name: { $regex: query, $options: "i" } },
                    { phoneNumber: { $regex: query, $options: "i" } },
                    { qualification: { $regex: query, $options: "i" } },
                    { country: { $regex: query, $options: "i" } },
                ],
            });

            // 🔹 Format results for Admin
            results = [
                ...branches.map(branch => ({
                    type: "Branch",
                    name: branch.name,
                    city: branch.city,
                    phoneNumber: branch.phoneNumber || "N/A",
                    link: `/admin/branches/${branch._id}`
                })),
                ...managers.map(manager => ({
                    type: "Manager",
                    name: `${manager.firstName} ${manager.lastName}`,
                    phone: manager.phoneNumber || "N/A",
                    link: `/admin/managers/`,
                })),
                ...applicants.map(applicant => ({
                    type: `Applicant | ${applicant.name}`,
                    name: applicant.name,
                    phone: applicant.phoneNumber || "N/A",
                    qualification: applicant.qualification || "N/A",
                    country: applicant.country || "N/A",
                    link: `/admin/applicant/${applicant._id}`,
                })),
            ];
        }
        else if (user.role === "manager") {
            // 🔹 Find manager's assigned branch
            const branch = await Branch.findOne({ managerId: user._id });

            if (!branch) {
                return res.status(403).json({ message: "Manager is not assigned to any branch" });
            }

            console.log(`🔍 Manager ${user.firstName} is searching in branch ${branch.name} for:`, query);

            // 🔹 Fetch applicants only in manager's assigned branch
            const applicants = await Applicant.find({
                branchId: branch._id,  // ✅ Correct field for filtering
                $or: [
                    { name: { $regex: query, $options: "i" } },
                    { phoneNumber: { $regex: query, $options: "i" } },
                    { qualification: { $regex: query, $options: "i" } },
                    { country: { $regex: query, $options: "i" } },
                ],
            });

            results = applicants.map(applicant => ({
                type: `Applicant | ${applicant.name}`,
                name: applicant.name,
                phone: applicant.phoneNumber || "N/A",
                qualification: applicant.qualification || "N/A",
                country: applicant.country || "N/A",
                link: `/search/applicant/${applicant._id}`,
            }));
        }

        res.json(results);
    } catch (error) {
        console.error("❌ Error during search:", error);
        res.status(500).json({ message: "An error occurred while performing the search" });
    }
});

module.exports = router;
