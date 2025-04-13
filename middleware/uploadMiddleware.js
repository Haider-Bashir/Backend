const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
require("dotenv").config();

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage instead of writing to temp/ folder
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const ext = allowedTypes.test(file.originalname.toLowerCase());
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
            const mime = req.file.mimetype;

            // Determine the resource type for Cloudinary
            let resourceType = "raw";

            if (mime.startsWith("image/")) {
                resourceType = "image";
            } else if (
                mime === "application/pdf" ||
                mime === "application/msword" ||
                mime.includes("officedocument")
            ) {
                resourceType = "raw";
            }

            // Upload stream to Cloudinary
            const streamUpload = () => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            resource_type: resourceType,
                            folder: "applicants/documents", // optional folder in Cloudinary
                        },
                        (error, result) => {
                            if (result) resolve(result);
                            else reject(error);
                        }
                    );
                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });
            };

            const result = await streamUpload(req);
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
