const express = require("express");
const router = express.Router();

const {
    registerManager,
    registerBranchManager,
    loginUser,
    getUserProfile,
    getAllUsers,
    getUserById,
    editManager,
    deleteUser,
    updateManager,
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");

// Register Manager
router.post("/registerManager", registerManager);

// Register a Branch Manager
router.post("/addManager", registerBranchManager);

// Login User
router.post("/login", loginUser);

// Protected Route Example
router.get("/profile", protect, getUserProfile);

// Get All Users
router.get("/", getAllUsers);

router.get("/:id", getUserById);

router.post("/:id", protect, editManager);

router.delete("/:id", protect, deleteUser);

router.put("/:id", protect, updateManager);

module.exports = router;
