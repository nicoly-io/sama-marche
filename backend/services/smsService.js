const { sendValidationCodeEmail } = require('./emailService');

// Envoyer le code OTP (par email - gratuit)
const sendOTP = async (phone, code, email) => {
    try {
        // Si un email est fourni, envoyer par email (gratuit)
        if (email) {
            console.log(`📧 Envoi du code ${code} par email à ${email} (téléphone: ${phone})`);
            await sendValidationCodeEmail(email, code);
            return { success: true, method: 'email' };
        }
        
        // Fallback: simulation SMS
        console.log(`[SMS SIMULATION] Envoi du code ${code} au ${phone}`);
        return { success: true, method: 'simulation' };
        
    } catch (error) {
        console.error('Erreur envoi code:', error);
        return { success: false, error: error.message };
    }
};

// Envoyer une notification (peut être par email ou SMS selon le besoin)
const sendNotification = async (phone, message, email = null) => {
    try {
        // Si un email est fourni, envoyer par email (gratuit)
        if (email) {
            const { sendEmail } = require('./emailService');
            await sendEmail(email, 'Notification Sama-Marche', `<p>${message}</p>`);
            console.log(`📧 Notification envoyée par email à ${email}`);
            return { success: true, method: 'email' };
        }
        
        // Fallback: simulation SMS
        console.log(`[SMS SIMULATION] Notification à ${phone}: ${message}`);
        return { success: true, method: 'simulation' };
        
    } catch (error) {
        console.error('Erreur envoi notification:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { sendOTP, sendNotification };