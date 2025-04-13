const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const path = require("path");

const storage = multer.memoryStorage();
const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;

const fileFilter = (req, file, cb) => {
    const ext = allowedTypes.test(file.originalname.toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb("Only images, PDF, and Word documents are allowed!");
};

const upload = multer({ storage, fileFilter });

const uploadMultipleToCloudinary = (fieldsArray) => [
    upload.fields(fieldsArray),
    async (req, res, next) => {
        if (!req.files || Object.keys(req.files).length === 0) return next();

        req.cloudinaryFiles = {};

        const uploadToCloud = (file) => {
            const mime = file.mimetype;
            const ext = path.extname(file.originalname);
            const baseName = path.basename(file.originalname, ext);

            const isImage = mime.startsWith("image/");
            const resourceType = isImage ? "image" : "raw";
            const folder = isImage ? "applicants/images" : "applicants/documents";

            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: resourceType,
                        folder,
                        public_id: baseName,
                        format: ext.replace(".", ""),
                        use_filename: true,
                        unique_filename: true,
                    },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                streamifier.createReadStream(file.buffer).pipe(stream);
            });
        };

        try {
            for (const fieldName in req.files) {
                const uploads = await Promise.all(
                    req.files[fieldName].map((file) => uploadToCloud(file))
                );
                req.cloudinaryFiles[fieldName] = uploads.map((result) => ({
                    url: result.secure_url,
                    name: result.original_filename + path.extname(result.secure_url.split('?')[0]),
                }));
            }

            next();
        } catch (err) {
            console.error("Cloudinary multi-upload error:", err);
            res.status(500).json({
                message: "Cloudinary upload failed",
                error: err.message || err,
            });
        }
    },
];

const deleteFromCloudinary = async (fileUrl, type) => {
    try {
        if (!fileUrl) return;

        const publicId = fileUrl
            .split("/")
            .slice(-1)[0]
            .split(".")[0];

        const folder = fileUrl.includes("documents") ? "documents/applicants" : ""; // adjust based on your setup
        const fullPublicId = folder ? `${folder}/${publicId}` : publicId;

        await cloudinary.uploader.destroy(fullPublicId, { resource_type: type });
    } catch (err) {
        console.error("Failed to delete from Cloudinary:", err);
    }
};

module.exports = {
    deleteFromCloudinary,
    uploadMultipleToCloudinary
};
