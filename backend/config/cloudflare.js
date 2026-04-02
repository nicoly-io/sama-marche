const { S3Client } = require('@aws-sdk/client-s3');

console.log('🔧 Configuration Cloudflare R2:');
console.log('   Endpoint:', process.env.CLOUDFLARE_R2_ENDPOINT);
console.log('   Bucket:', process.env.CLOUDFLARE_R2_BUCKET);
console.log('   Access Key:', process.env.CLOUDFLARE_R2_ACCESS_KEY ? '✅ Présente' : '❌ Manquante');
console.log('   Secret Key:', process.env.CLOUDFLARE_R2_SECRET_KEY ? '✅ Présente' : '❌ Manquante');

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

module.exports = { s3Client, BUCKET_NAME };