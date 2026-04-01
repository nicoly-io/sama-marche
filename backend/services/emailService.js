const sgMail = require('@sendgrid/mail');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@sama-marche.onrender.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Sama-Marche';

// Configuration SendGrid
if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
    console.log('✅ SendGrid configuré avec succès');
} else {
    console.warn('⚠️ SENDGRID_API_KEY non configuré - les emails ne seront pas envoyés');
}

// Envoyer un email
const sendEmail = async (to, subject, htmlContent) => {
    try {
        // Si SendGrid n'est pas configuré, passer en simulation
        if (!SENDGRID_API_KEY) {
            console.log(`[EMAIL SIMULATION] À: ${to}, Sujet: ${subject}`);
            console.log(`Contenu: ${htmlContent.substring(0, 100)}...`);
            return { success: true, simulation: true };
        }
        
        const msg = {
            to: to,
            from: { email: FROM_EMAIL, name: FROM_NAME },
            subject: subject,
            html: htmlContent
        };
        
        const response = await sgMail.send(msg);
        console.log(`📧 Email envoyé à ${to} - Status: ${response[0].statusCode}`);
        return { success: true };
        
    } catch (error) {
        console.error('❌ Erreur envoi email:', error.response?.body || error.message);
        return { success: false, error: error.message };
    }
};

// Envoyer le code OTP
const sendValidationCodeEmail = async (email, code) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; background: #f5f7fb; padding: 20px; }
                .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                .logo { color: #0D9488; font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; }
                .code { font-size: 32px; font-weight: bold; color: #0D9488; text-align: center; padding: 20px; background: #f0fdf4; border-radius: 12px; margin: 20px 0; letter-spacing: 5px; }
                .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">Sama-Marche</div>
                <p>Bonjour,</p>
                <p>Votre code de vérification est :</p>
                <div class="code">${code}</div>
                <p>Ce code est valable <strong>10 minutes</strong>.</p>
                <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
                <div class="footer">
                    &copy; 2026 Sama-Marche - La place de marché sécurisée du Sénégal
                </div>
            </div>
        </body>
        </html>
    `;
    return sendEmail(email, 'Code de vérification Sama-Marche', html);
};

// Confirmation de paiement
const sendPaymentConfirmation = async (email, listingTitle, amount) => {
    const html = `
        <h1>Paiement confirmé</h1>
        <p>Votre paiement de ${amount} FCFA pour "${listingTitle}" a été reçu.</p>
        <p>L'argent est sécurisé par Sama-Marche. Contactez le vendeur pour la livraison.</p>
    `;
    return sendEmail(email, 'Paiement confirmé - Sama-Marche', html);
};

// Code de livraison
const sendDeliveryCode = async (email, code) => {
    const html = `
        <h1>Code de livraison</h1>
        <p>Votre code de validation est : <strong>${code}</strong></p>
        <p>Donnez ce code au vendeur uniquement après avoir vérifié l'article.</p>
    `;
    return sendEmail(email, 'Code de livraison - Sama-Marche', html);
};

module.exports = { sendEmail, sendValidationCodeEmail, sendPaymentConfirmation, sendDeliveryCode };