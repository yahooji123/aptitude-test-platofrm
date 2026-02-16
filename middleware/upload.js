const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: 'dwg78uelb',
  api_key: '714765828887977',
  api_secret: 'D3GrtjByGQ-n33Vrh3uKmYaEo5A'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Check if it's an image
    if (!file.mimetype.startsWith('image/')) {
        throw new Error('Only image files (JPG, PNG, JPEG) are allowed');
    }
    
    // Generate a unique filename: original_name-timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const cleanName = file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${cleanName}-${uniqueSuffix}`;

    return {
      folder: 'exam_submissions',
      resource_type: 'image', // Images for viewing
      public_id: filename,
      allowed_formats: ['jpg', 'png', 'jpeg'],
      transformation: [{ width: 1000, crop: "limit" }] // Optimize size slightly
    };
  },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per file
});

module.exports = upload;