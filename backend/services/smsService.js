// Service SMS pour le Sénégal
// À configurer avec un fournisseur comme Orange Sénégal, Africa's Talking, ou Termii

const sendOTP = async (phone, code) => {
    try {
        // TODO: Intégrer l'API SMS réelle
        // Pour l'instant, on simule l'envoi
        console.log(`[SMS SIMULATION] Envoi du code ${code} au ${phone}`);
        
        // Exemple avec un fournisseur SMS (à décommenter et configurer)
        /*
        const response = await fetch('https://api.smsprovider.com/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SMS_API_KEY}`
            },
            body: JSON.stringify({
                to: `+221${phone}`,
                message: `Votre code de vérification Sama-Marche est : ${code}. Valable 10 minutes.`
            })
        });
        
        if (!response.ok) throw new Error('SMS sending failed');
        */
        
        return { success: true };
    } catch (error) {
        console.error('SMS sending error:', error);
        return { success: false, error: error.message };
    }
};

const sendNotification = async (phone, message) => {
    try {
        // TODO: Intégrer l'API SMS réelle
        console.log(`[SMS SIMULATION] Notification à ${phone}: ${message}`);
        return { success: true };
    } catch (error) {
        console.error('SMS notification error:', error);
        return { success: false };
    }
};

module.exports = { sendOTP, sendNotification };