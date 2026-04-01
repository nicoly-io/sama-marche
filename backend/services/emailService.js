// Service email (à configurer avec SendGrid, Brevo, ou autre)
const sendEmail = async (to, subject, htmlContent) => {
    try {
        // TODO: Intégrer l'API email réelle
        console.log(`[EMAIL SIMULATION] À: ${to}, Sujet: ${subject}`);
        console.log(`Contenu: ${htmlContent.substring(0, 100)}...`);
        
        // Exemple avec Brevo (Sendinblue)
        /*
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY
            },
            body: JSON.stringify({
                sender: { email: 'noreply@sama-marche.sn', name: 'Sama-Marche' },
                to: [{ email: to }],
                subject: subject,
                htmlContent: htmlContent
            })
        });
        
        if (!response.ok) throw new Error('Email sending failed');
        */
        
        return { success: true };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
};

const sendValidationCodeEmail = async (email, code) => {
    const html = `
        <h1>Bienvenue sur Sama-Marche</h1>
        <p>Votre code de vérification est : <strong>${code}</strong></p>
        <p>Ce code est valable 10 minutes.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    `;
    return sendEmail(email, 'Code de vérification Sama-Marche', html);
};

const sendPaymentConfirmation = async (email, listingTitle, amount) => {
    const html = `
        <h1>Paiement confirmé</h1>
        <p>Votre paiement de ${amount} FCFA pour "${listingTitle}" a été reçu.</p>
        <p>L'argent est sécurisé par Sama-Marche. Contactez le vendeur pour la livraison.</p>
    `;
    return sendEmail(email, 'Paiement confirmé - Sama-Marche', html);
};

const sendDeliveryCode = async (email, code) => {
    const html = `
        <h1>Code de livraison</h1>
        <p>Votre code de validation est : <strong>${code}</strong></p>
        <p>Donnez ce code au vendeur uniquement après avoir vérifié l'article.</p>
    `;
    return sendEmail(email, 'Code de livraison - Sama-Marche', html);
};

module.exports = { sendEmail, sendValidationCodeEmail, sendPaymentConfirmation, sendDeliveryCode };