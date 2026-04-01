const { S3Client } = require('@aws-sdk/client-s3');

// Configuration du client S3 pour Cloudflare R2
const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
    },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || 'sama-marche-storage';

module.exports = { s3Client, BUCKET_NAME };