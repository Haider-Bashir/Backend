const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const path = require("path");
require("dotenv").config();

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage
const storage = multer.memoryStorage();

// File validation
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const ext = allowedTypes.test(file.originalname.toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb("Only images, PDF, and Word documents are allowed!");
};

const upload = multer({ storage, fileFilter });

// Upload to Cloudinary Middleware
const uploadToCloudinary = (fieldName) => [
    upload.single(fieldName),
    async (req, res, next) => {
        if (!req.file) return next();

        try {
            const mime = req.file.mimetype;
            const originalExt = path.extname(req.file.originalname); // e.g., .pdf
            const baseName = path.basename(req.file.originalname, originalExt); // e.g., "resume"

            // Determine resource type
            const isImage = mime.startsWith("image/");
            const resourceType = isImage ? "image" : "raw";

            // Choose folder based on file type
            const folder = isImage ? "applicants/images" : "applicants/documents";

            const streamUpload = () => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            resource_type: resourceType,
                            folder: folder,
                            public_id: baseName,
                            use_filename: true,
                            unique_filename: true,
                        },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });
            };

            const result = await streamUpload();
            req.fileUrl = result.secure_url;
            next();
        } catch (err) {
            console.error("Cloudinary upload failed:", err);
            return res.status(500).json({
                message: "Cloudinary upload failed",
                error: err.message || err,
            });
        }
    },
];

module.exports = {
    uploadToCloudinary,
};
