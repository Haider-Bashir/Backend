const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

// Setup Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer config (temp local save)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "temp/"),
    filename: (req, file, cb) =>
        cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb("Only image, PDF, and Word files are allowed!");
};

const upload = multer({ storage, fileFilter });

// Middleware to handle single file upload + Cloudinary upload
const uploadToCloudinary = async (req, res, next) => {
    if (!req.file) return next();

    try {
        const filePath = req.file.path;
        const resourceType = req.file.mimetype.startsWith("image") ? "image" : "raw";

        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: resourceType,
        });

        // Clean up local temp file
        fs.unlinkSync(filePath);

        req.fileUrl = result.secure_url;
        next();
    } catch (err) {
        return res.status(500).json({ message: "Cloudinary upload failed", error: err });
    }
};

module.exports = {
    uploadSingle: upload.single("image"), // used in route
    uploadToCloudinary, // used in route
};
