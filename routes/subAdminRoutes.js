const express = require('express');
const User = require('../models/user');
const MailService = require('./../utils/MailService')
const router = express.Router();

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

// Create Sub Admin (POST)
router.post('/', async (req, res) => {
    const { firstName, lastName, email, password, phone, role } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const username = await generateUniqueUsername(firstName, lastName);

        const subAdmin = new User({
            firstName,
            lastName,
            username,
            email,
            password,
            phoneNumber: phone,
            role: role || 'sub-admin', // Default to sub-admin
        });

        await subAdmin.save();

        await MailService.sendDetails(firstName, lastName, email, password, 'Sub Admin');

        res.status(201).json({ message: 'Sub Admin created successfully', subAdmin });
    } catch (error) {
        console.error('Error creating sub admin:', error);
        res.status(500).json({ message: 'Error creating sub admin' });
    }
});

// Get All Sub Admins (GET)
router.get('/', async (req, res) => {
    try {
        const subAdmins = await User.find({ role: 'sub-admin' });
        res.json(subAdmins);
    } catch (error) {
        console.error('Error fetching sub admins:', error);
        res.status(500).json({ message: 'Error fetching sub admins' });
    }
});

// Update Sub Admin (PUT)
router.put('/:id', async (req, res) => {
    const { firstName, lastName, email, phone } = req.body;

    try {
        const subAdmin = await User.findByIdAndUpdate(
            req.params.id,
            { firstName, lastName, email, phoneNumber: phone },
            { new: true }
        );

        if (!subAdmin) {
            return res.status(404).json({ message: 'Sub Admin not found' });
        }

        res.json(subAdmin);
    } catch (error) {
        console.error('Error updating sub admin:', error);
        res.status(500).json({ message: 'Error updating sub admin' });
    }
});

// Delete Sub Admin (DELETE)
router.delete('/:id', async (req, res) => {
    try {
        const subAdmin = await User.findByIdAndDelete(req.params.id);

        if (!subAdmin) {
            return res.status(404).json({ message: 'Sub Admin not found' });
        }

        res.status(200).json({ message: 'Sub Admin deleted successfully' });
    } catch (error) {
        console.error('Error deleting sub admin:', error);
        res.status(500).json({ message: 'Error deleting sub admin' });
    }
});

module.exports = router;
