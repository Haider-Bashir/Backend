const multer = require("multer");
const path = require("path");

// Configure storage location
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/images"); // Save images in public/images
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

// File validation
const fileFilter = (req, file, cb) => {
    const allowedFileTypes = /jpeg|jpg|png/;
    const extName = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedFileTypes.test(file.mimetype);

    if (extName && mimeType) {
        return cb(null, true);
    }
    cb("Error: Only JPEG, JPG, and PNG files are allowed!");
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
