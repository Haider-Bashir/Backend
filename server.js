const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const branchRoutes = require("./routes/branchRoutes");
const searchRoutes = require("./routes/searchRoutes");
const managerRoutes = require("./routes/managerRoutes");
const applicantRoutes = require("./routes/applicantRoutes");
const statRoutes = require("./routes/statRoutes");
const subAdminRoutes = require('./routes/subAdminRoutes');
const path = require("path");

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
connectDB();

// Test route
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/branches", branchRoutes);
app.use('/api/sub-admins', subAdminRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/applicants", applicantRoutes)
app.use("/api/stats", statRoutes)
app.use("/public", express.static(path.join(__dirname, "public")));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
