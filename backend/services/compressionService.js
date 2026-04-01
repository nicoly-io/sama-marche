const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const compressImage = async (inputPath, outputPath, maxWidth = 1024, quality = 80) => {
    try {
        await sharp(inputPath)
            .resize(maxWidth, null, { withoutEnlargement: true })
            .jpeg({ quality })
            .toFile(outputPath);
        
        return { success: true, outputPath };
    } catch (error) {
        console.error('Compression error:', error);
        return { success: false, error: error.message };
    }
};

const compressAndSave = async (filePath, maxWidth = 1024, quality = 80) => {
    const parsedPath = path.parse(filePath);
    const compressedPath = path.join(parsedPath.dir, `${parsedPath.name}_compressed${parsedPath.ext}`);
    
    const result = await compressImage(filePath, compressedPath, maxWidth, quality);
    
    if (result.success) {
        // Remplacer l'original par la version compressée
        fs.unlinkSync(filePath);
        fs.renameSync(compressedPath, filePath);
    }
    
    return result;
};

module.exports = { compressImage, compressAndSave };