const express = require('express');
const Branch = require('../models/branch');
const Applicant = require('../models/Applicant');
const Payment = require('../models/Payment');
const User = require('../models/user');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Get stats for the manager's branch
router.get('/', protect, async (req, res) => {
    try {
        const managerId = req.user._id;

        // Find branch for the manager
        const branch = await Branch.findOne({ managerId });
        if (!branch) {
            return res.status(404).json({ message: 'Manager not associated with any branch.' });
        }

        // Total applicants for the manager's branch
        const totalApplicants = await Applicant.countDocuments({ branchId: branch._id });

        // Total payments for the manager's branch
        const totalPayments = await Payment.aggregate([
            { $lookup: {
                    from: 'applicants',
                    localField: 'applicant',
                    foreignField: '_id',
                    as: 'applicant'
                }},
            { $unwind: '$applicant' },
            { $match: { 'applicant.branchId': branch._id } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Applicants by visa type
        const applicantsByVisaType = await Applicant.aggregate([
            { $match: { branchId: branch._id } },
            { $group: { _id: '$visaType', count: { $sum: 1 } } }
        ]);

        // Applicants by qualification
        const applicantsByQualification = await Applicant.aggregate([
            { $match: { branchId: branch._id } },
            { $group: { _id: '$qualification', count: { $sum: 1 } } }
        ]);

        // Applicants by status
        const applicantsByStatus = await Applicant.aggregate([
            { $match: { branchId: branch._id } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Payments by currency
        const paymentsByCurrency = await Payment.aggregate([
            { $lookup: {
                    from: 'applicants',
                    localField: 'applicant',
                    foreignField: '_id',
                    as: 'applicant'
                }},
            { $unwind: '$applicant' },
            { $match: { 'applicant.branchId': branch._id } },
            { $group: { _id: '$currency', total: { $sum: '$amount' } } }
        ]);

        // Total applicants over time (e.g., monthly)
        const totalApplicantsOverTime = await Applicant.aggregate([
            { $match: { branchId: branch._id } },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }  // Sort by month
        ]);

        // Payments over time (e.g., monthly)
        const paymentsOverTime = await Payment.aggregate([
            { $lookup: {
                    from: 'applicants',
                    localField: 'applicant',
                    foreignField: '_id',
                    as: 'applicant'
                }},
            { $unwind: '$applicant' },
            { $match: { 'applicant.branchId': branch._id } },
            {
                $group: {
                    _id: { $month: '$date' },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { _id: 1 } }  // Sort by month
        ]);

        // Return all stats
        res.json({
            totalApplicants,
            totalPayments: totalPayments[0] ? totalPayments[0].total : 0,
            applicantsByVisaType,
            applicantsByQualification,
            applicantsByStatus,
            paymentsByCurrency,
            totalApplicantsOverTime,
            paymentsOverTime,
        });

    } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({ message: 'Server error', error });
    }
});

// Get stats for the admin
router.get('/admin', protect, async (req, res) => {
    try {
        // Total number of branches
        const totalBranches = await Branch.countDocuments();

        // Total number of employees (managers)
        const totalEmployees = await User.countDocuments({ role: 'manager' });

        // Total revenue (sum of all payments)
        const totalRevenue = await Payment.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Total applicants xm
        const totalApplicants = await Applicant.countDocuments();

        // Applicants by country
        const applicantsByCountry = await Applicant.aggregate([
            { $group: { _id: '$country', count: { $sum: 1 } } },
            { $sort: { count: -1 } }  // Sort by count descending
        ]);

        // Applicants by visa type
        const applicantsByVisaType = await Applicant.aggregate([
            { $group: { _id: '$visaType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }  // Sort by count descending
        ]);

        // Revenue by currency based on agreed amounts
        const paymentsByCurrency = await Applicant.aggregate([
            {
                $match: {
                    'agreement.agreedAmount': { $gt: 0 },
                    'agreement.agreedCurrency': { $ne: null },
                }
            },
            {
                $group: {
                    _id: '$agreement.agreedCurrency',
                    total: { $sum: '$agreement.agreedAmount' }
                }
            },
            { $sort: { total: -1 } }
        ]);

        res.json({
            totalBranches,
            totalEmployees,
            totalRevenue: totalRevenue[0] ? totalRevenue[0].total : 0,
            totalApplicants,
            applicantsByCountry,
            applicantsByVisaType,
            paymentsByCurrency,
        });
    } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({ message: 'Server error', error });
    }
});

// Get agreed revenue per branch per currency
router.get("/branch-per-currency", protect, async (req, res) => {
    try {
        const revenuePerBranchPerCurrency = await Applicant.aggregate([
            {
                $match: {
                    'agreement.agreedAmount': { $gt: 0 },
                    'agreement.agreedCurrency': { $ne: null },
                },
            },
            {
                $group: {
                    _id: {
                        branchId: '$branchId',
                        currency: '$agreement.agreedCurrency',
                    },
                    total: { $sum: '$agreement.agreedAmount' },
                },
            },
            {
                $lookup: {
                    from: 'branches',
                    localField: '_id.branchId',
                    foreignField: '_id',
                    as: 'branch',
                },
            },
            { $unwind: '$branch' },
            {
                $project: {
                    branch: { name: '$branch.name' },
                    currency: '$_id.currency',
                    revenue: '$total',
                    _id: 0,
                },
            },
        ]);

        res.json(revenuePerBranchPerCurrency);
    } catch (error) {
        console.error("Error fetching revenue per branch per currency:", error);
        res.status(500).json({ message: "Server error", error });
    }
});



module.exports = router;
