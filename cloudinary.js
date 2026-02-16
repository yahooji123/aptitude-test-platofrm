if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Check if Cloudinary credentials are provided
const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && 
                     process.env.CLOUDINARY_KEY && 
                     process.env.CLOUDINARY_SECRET;

let storage;

if (hasCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_KEY,
        api_secret: process.env.CLOUDINARY_SECRET
    });

    storage = new CloudinaryStorage({
        cloudinary,
        params: {
            folder: 'ExamPortal',
            allowedFormats: ['jpeg', 'png', 'jpg']
        }
    });
} else {
    // Fallback to local storage
    console.warn("⚠️  Cloudinary credentials missing. Using local storage for uploads.");
    
    // Ensure upload directory exists
    const uploadDir = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'public/uploads/');
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    });
}

module.exports = {
    cloudinary,
    storage,
    hasCloudinary // Export this to check in controller if needed
};