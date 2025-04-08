const User = require("../models/User");
const Branch = require("../models/Branch");
const generateToken = require("../utils/generateToken");
const MailService = require('./../utils/MailService')

// Helper function to generate a unique username
const generateUniqueUsername = async (firstName, lastName) => {
    let baseUsername = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
    let username = baseUsername;
    let counter = 1;

    // Check if the username exists, append a number if it does
    while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
    }

    return username;
};

// Register a Manager
const registerManager = async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword, address, phoneNumber, city } = req.body;

    try {
        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        // Check password match
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        // Generate unique username
        const username = await generateUniqueUsername(firstName, lastName);

        // Create the manager
        const newUser = await User.create({
            firstName,
            lastName,
            username, // Add the unique username
            email,
            password,
            address,
            phoneNumber,
            city,
            role: "manager",
        });

        await MailService.sendDetails(firstName, lastName, email, password, 'Manager');

        res.status(201).json({
            _id: newUser._id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            token: generateToken(newUser._id),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Register a Branch Manager
const registerBranchManager = async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword, address, phoneNumber, city, branchId } = req.body;

    try {
        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        // Check password match
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        // Check if the branch exists
        const branch = await Branch.findById(branchId);
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }

        // Generate unique username
        const username = await generateUniqueUsername(firstName, lastName);

        // Create the manager
        const newUser = await User.create({
            firstName,
            lastName,
            username, // Add the unique username
            email,
            password,
            address,
            phoneNumber,
            city,
            role: "manager",
        });

        // Link manager to the branch
        branch.managerId = newUser._id;
        await branch.save();

        res.status(201).json({
            _id: newUser._id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            token: generateToken(newUser._id),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Login User
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                username: user.username,
                address: user.address,
                phoneNumber: user.phoneNumber,
                city: user.city,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get User Profile
const getUserProfile = async (req, res) => {
    res.json(req.user);
};

// Get All Users
const getAllUsers = async (req, res) => {
    try {
        const role = req.query.role; // Get role from query params
        const query = role ? { role } : {}; // If role is specified, filter by it
        const users = await User.find(query).select("-password"); // Exclude the password field
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// Get a specific user by ID
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const editManager = async (req, res) => {
    try {
        const { firstName, lastName, email, phoneNumber, address, city } = req.body;

        // Find and update the manager
        const updatedManager = await User.findByIdAndUpdate(
            req.params.id,
            { firstName, lastName, email, phoneNumber, address, city },
            { new: true, runValidators: true }
        );

        if (!updatedManager) {
            return res.status(404).json({ message: "Manager not found" });
        }

        res.status(200).json(updatedManager);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const deleteUser = async (req, res) => {
    try {
        // Get the userId from the request parameters
        const userId = req.params.id;

        // Find the user by ID and delete
        const user = await User.findByIdAndDelete(userId);

        // If no user found, return an error message
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Return success response
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Server error" });
    }
}

const updateManager = async (req, res) => {
    try {
        const { firstName, lastName, phoneNumber, address, city } = req.body;

        // Find the manager by their ID (req.params.id comes from the URL)
        const manager = await User.findById(req.params.id);

        if (!manager) {
            return res.status(404).json({ message: "Manager not found" });
        }

        // Only update the fields that are provided in the request
        if (firstName) manager.firstName = firstName;
        if (lastName) manager.lastName = lastName;
        if (phoneNumber) manager.phoneNumber = phoneNumber;
        if (address) manager.address = address;
        if (city) manager.city = city;

        // Save the updated manager details to the database
        await manager.save();

        // Return the updated manager object
        res.status(200).json(manager);
    } catch (error) {
        console.error("Error updating manager:", error);
        res.status(500).json({ message: "Server error", error });
    }
};

module.exports = {
    registerManager,
    registerBranchManager,
    loginUser,
    getUserProfile,
    getAllUsers,
    getUserById,
    editManager,
    deleteUser,
    updateManager,
};
