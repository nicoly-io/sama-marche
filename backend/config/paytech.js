const PAYTECH_API_KEY = process.env.PAYTECH_API_KEY;
const PAYTECH_SECRET_KEY = process.env.PAYTECH_SECRET_KEY;
const PAYTECH_API_URL = 'https://paytech.sn/api';

// Vérification des clés au démarrage
if (!PAYTECH_API_KEY || !PAYTECH_SECRET_KEY) {
    console.warn('⚠️ ATTENTION: Les clés PayTech ne sont pas configurées dans le fichier .env');
    console.warn('   PAYTECH_API_KEY:', PAYTECH_API_KEY ? '✅ Présente' : '❌ Manquante');
    console.warn('   PAYTECH_SECRET_KEY:', PAYTECH_SECRET_KEY ? '✅ Présente' : '❌ Manquante');
} else {
    console.log('✅ PayTech configuré avec succès');
    console.log('   API URL:', PAYTECH_API_URL);
}

module.exports = {
    PAYTECH_API_KEY,
    PAYTECH_SECRET_KEY,
    PAYTECH_API_URL
};