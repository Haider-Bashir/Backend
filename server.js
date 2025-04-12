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

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://therisersconsultancy.com",
      "https://www.therisersconsultancy.com",
      "http://localhost:3000"
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));             
app.options("*", cors(corsOptions));    


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
