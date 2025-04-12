const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Setup multer to store files in temp/
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
    else cb("Only images, PDF, and Word documents are allowed!");
};

const upload = multer({ storage, fileFilter });

// Middleware for file upload to Cloudinary
const uploadToCloudinary = (fieldName) => [
    upload.single(fieldName),
    async (req, res, next) => {
        if (!req.file) return next();

        try {
            const resourceType = req.file.mimetype.startsWith("image") ? "image" : "raw";
            const result = await cloudinary.uploader.upload(req.file.path, {
                resource_type: resourceType,
            });

            fs.unlinkSync(req.file.path); // Clean up temp file
            req.fileUrl = result.secure_url;
            next();
        } catch (err) {
            return res.status(500).json({ message: "Cloudinary upload failed", error: err });
        }
    },
];

module.exports = {
    uploadToCloudinary,
};
