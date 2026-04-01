const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration du stockage temporaire
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/temp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Filtre pour les images
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format non supporté. Utilisez JPG, PNG ou WEBP'), false);
    }
};

// Upload pour les photos d'annonces (max 5 photos, 5 Mo chacune)
const uploadListingPhotos = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
    fileFilter: imageFilter
}).array('photos', 5);

// Upload pour la CNI (recto et verso, 10 Mo chacun)
const uploadCNI = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo
    fileFilter: imageFilter
}).fields([
    { name: 'recto', maxCount: 1 },
    { name: 'verso', maxCount: 1 }
]);

// Upload pour les messages (1 photo, 5 Mo)
const uploadMessagePhoto = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFilter
}).single('photo');

module.exports = { uploadListingPhotos, uploadCNI, uploadMessagePhoto };