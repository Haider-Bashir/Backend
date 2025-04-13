const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Deletes a file from Cloudinary using its public_id
 * @param {string} publicId
 * @param {string} resourceType - image | raw | video
 */
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        return await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
    } catch (err) {
        console.error("Error deleting from Cloudinary:", err);
        throw err;
    }
};

/**
 * Extract public_id from a Cloudinary URL
 */
const extractPublicId = (url) => {
    if (!url) return null;

    const parts = url.split("/");
    const filenameWithExt = parts.pop(); // like "myfile.pdf"
    const folder = parts.slice(parts.indexOf("applicants")).join("/"); // e.g., "applicants/documents"
    return `${folder}/${filenameWithExt.split(".")[0]}`;
};

module.exports = {
    deleteFromCloudinary,
    extractPublicId,
};
