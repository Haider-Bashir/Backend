const cloudinary = require("cloudinary").v2;
const path = require("path");

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Add your Cloudinary cloud name
    api_key: process.env.CLOUDINARY_API_KEY, // Add your Cloudinary API key
    api_secret: process.env.CLOUDINARY_API_SECRET, // Add your Cloudinary API secret
});

// File validation for images, PDFs, and Word files
const fileFilter = (req, file, cb) => {
    const allowedFileTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extName = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedFileTypes.test(file.mimetype);

    if (extName && mimeType) {
        return cb(null, true);
    }
    cb("Error: Only JPEG, JPG, PNG, PDF, DOC, DOCX files are allowed!");
};

const upload = (req, res, next) => {
    // If files are present, upload them to Cloudinary
    if (req.files) {
        const promises = req.files.map(file => {
            return cloudinary.uploader.upload(file.path, {
                resource_type: file.mimetype.startsWith("image") ? "image" : "raw", // images vs files (PDF, DOC)
            });
        });

        // Wait for all uploads to complete
        Promise.all(promises)
            .then(results => {
                req.fileUrls = results.map(result => result.secure_url); // Store URLs of uploaded files
                next();
            })
            .catch(error => {
                res.status(500).json({ message: "Error uploading files to Cloudinary", error });
            });
    } else {
        next();
    }
};

module.exports = upload;
