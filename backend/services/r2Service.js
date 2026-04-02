const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');

// Configuration
const USE_PUBLIC_URL = true;
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';

const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
    },
    forcePathStyle: true
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || 'sama-marche-storage';

// Uploader un fichier
const uploadFile = async (filePath, destination, fileName) => {
    try {
        console.log('📤 [R2] Début upload:', { filePath, destination, fileName });
        
        const fileContent = fs.readFileSync(filePath);
        const key = `${destination}/${fileName}`;
        
        console.log('📤 [R2] Key:', key);
        console.log('📤 [R2] Taille:', fileContent.length, 'bytes');
        console.log('📤 [R2] Bucket:', BUCKET_NAME);
        console.log('📤 [R2] Endpoint:', process.env.CLOUDFLARE_R2_ENDPOINT);
        
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileContent,
            ContentType: 'image/jpeg'
        });
        
        const result = await s3Client.send(command);
        console.log('📤 [R2] Réponse:', result);
        
        // Nettoyer le fichier temporaire
        fs.unlinkSync(filePath);
        
        console.log('✅ [R2] Upload réussi:', key);
        return { success: true, key };
    } catch (error) {
        console.error('❌ [R2] Upload error:', error.message);
        console.error('❌ [R2] Error details:', error);
        return { success: false, error: error.message };
    }
};

// Supprimer un fichier
const deleteFile = async (key) => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });
        
        await s3Client.send(command);
        console.log('✅ Fichier supprimé:', key);
        return { success: true };
    } catch (error) {
        console.error('❌ R2 delete error:', error.message);
        return { success: false, error: error.message };
    }
};

// Générer une URL pour un fichier
const getFileUrl = async (key, expiresIn = 3600) => {
    try {
        if (USE_PUBLIC_URL && PUBLIC_URL) {
            const url = `${PUBLIC_URL}/${key}`;
            console.log('🔑 URL publique générée:', url);
            return url;
        }
        
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });
        
        const url = await getSignedUrl(s3Client, command, { expiresIn });
        console.log('🔑 URL signée générée:', url);
        return url;
    } catch (error) {
        console.error('❌ Get URL error:', error.message);
        return null;
    }
};

module.exports = { uploadFile, deleteFile, getFileUrl };