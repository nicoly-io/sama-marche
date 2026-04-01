const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, BUCKET_NAME } = require('../config/cloudflare');

// Configuration : utiliser l'URL publique si disponible, sinon URLs signées
const USE_PUBLIC_URL = true; // Mettre à true si le bucket est public

// URL publique du bucket (à définir dans .env)
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';

// Uploader un fichier
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

// Générer une URL pour un fichier (publique ou signée)
const getFileUrl = async (key, expiresIn = 3600) => {
    try {
        // Si une URL publique est configurée, l'utiliser (plus simple et plus rapide)
        if (USE_PUBLIC_URL && PUBLIC_URL) {
            return `${PUBLIC_URL}/${key}`;
        }
        
        // Sinon, générer une URL signée (valable 1 heure)
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });
        
        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return url;
    } catch (error) {
        console.error('Get URL error:', error);
        return null;
    }
};

module.exports = { uploadFile, deleteFile, getFileUrl };