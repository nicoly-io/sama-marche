const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, BUCKET_NAME } = require('../config/cloudflare');

// Uploader un fichier (inchangé)
const uploadFile = async (filePath, destination, fileName) => {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const fs = require('fs');
    
    try {
        const fileContent = fs.readFileSync(filePath);
        const key = `${destination}/${fileName}`;
        
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileContent,
            ContentType: 'image/jpeg'
        });
        
        await s3Client.send(command);
        
        // Nettoyer le fichier temporaire
        fs.unlinkSync(filePath);
        
        return { success: true, key };
    } catch (error) {
        console.error('R2 upload error:', error);
        return { success: false, error: error.message };
    }
};

// Supprimer un fichier
const deleteFile = async (key) => {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });
        
        await s3Client.send(command);
        return { success: true };
    } catch (error) {
        console.error('R2 delete error:', error);
        return { success: false, error: error.message };
    }
};

// Générer une URL signée (valable 1 heure)
const getFileUrl = async (key, expiresIn = 3600) => {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });
        
        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return url;
    } catch (error) {
        console.error('Get signed URL error:', error);
        return null;
    }
};

module.exports = { uploadFile, deleteFile, getFileUrl };