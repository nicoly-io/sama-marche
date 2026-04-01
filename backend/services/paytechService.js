const axios = require('axios');
const { PAYTECH_API_KEY, PAYTECH_SECRET_KEY, PAYTECH_API_URL } = require('../config/paytech');

// Configuration
const TIMEOUT = 30000; // 30 secondes
const SIMULATION_MODE = false; // Mode réel activé

// URLs de redirection vers ton site
const APP_URL = process.env.APP_URL || 'http://localhost:5000';
const IPN_URL = `${APP_URL}/api/transactions/callback`;
const SUCCESS_URL = `${APP_URL}/payment-success`;
const CANCEL_URL = `${APP_URL}/payment-cancel`;

// Vérification que les clés sont présentes
if (!PAYTECH_API_KEY || !PAYTECH_SECRET_KEY) {
    console.warn('⚠️ ATTENTION: PayTech non configuré correctement');
    console.warn('   Les paiements ne fonctionneront pas sans les clés API');
} else {
    console.log('✅ PayTech configuré en mode PRODUCTION');
    console.log('   API URL:', PAYTECH_API_URL);
    console.log('   IPN URL:', IPN_URL);
    console.log('   SUCCESS URL:', SUCCESS_URL);
}

const generatePaymentLink = async (transactionId, amount, buyerPhone, description) => {
    try {
        // Générer un ref_command unique avec timestamp pour éviter les doublons
        const uniqueRef = `${transactionId}_${Date.now()}`;
        
        const payload = {
            item_name: description,
            item_price: amount,
            currency: 'XOF',
            ref_command: uniqueRef,
            command_name: 'Sama-Marche',
            env: 'prod', // <--- MODE PRODUCTION
            phone: buyerPhone,
            ipn_url: IPN_URL,
            success_url: SUCCESS_URL,
            cancel_url: CANCEL_URL
        };
        
        console.log('📡 Envoi requête PayTech...');
        console.log('   URL:', `${PAYTECH_API_URL}/payment/request-payment`);
        console.log('   Transaction ID:', transactionId);
        console.log('   Ref command unique:', uniqueRef);
        console.log('   Montant:', amount);
        console.log('   Téléphone:', buyerPhone);
        console.log('   Mode: PRODUCTION');
        console.log('   IPN URL:', IPN_URL);
        
        const response = await axios.post(`${PAYTECH_API_URL}/payment/request-payment`, payload, {
            headers: {
                'API_KEY': PAYTECH_API_KEY,
                'API_SECRET': PAYTECH_SECRET_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: TIMEOUT
        });
        
        console.log('📡 Réponse PayTech:', response.status);
        console.log('   Data:', response.data);
        
        // Vérifier la réponse selon le format PayTech
        if (response.data) {
            // Format PayTech : { success: 1, redirect_url: "https://..." }
            if (response.data.success === 1 && response.data.redirect_url) {
                console.log('✅ Lien de paiement généré avec succès');
                return { 
                    success: true, 
                    payment_url: response.data.redirect_url,
                    paytech_id: response.data.token || uniqueRef
                };
            }
            
            // Si erreur
            if (response.data.errors) {
                console.error('❌ Erreur PayTech:', response.data.errors);
                return { success: false, error: response.data.errors.join(', ') };
            }
            
            if (response.data.message) {
                console.error('❌ Erreur PayTech:', response.data.message);
                return { success: false, error: response.data.message };
            }
        }
        
        console.error('❌ PayTech: réponse invalide', response.data);
        return { success: false, error: 'PayTech: réponse invalide' };
        
    } catch (error) {
        console.error('❌ PayTech payment error:');
        
        if (error.code === 'ECONNABORTED') {
            console.error('   Timeout: Le serveur PayTech ne répond pas');
            return { success: false, error: 'Timeout: Le serveur PayTech ne répond pas' };
        }
        
        if (error.code === 'ENOTFOUND') {
            console.error('   Serveur introuvable: paytech.sn n\'est pas accessible');
            console.error('   Vérifiez votre connexion internet');
            return { success: false, error: 'Serveur PayTech inaccessible' };
        }
        
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
            return { success: false, error: `PayTech: ${error.response.status} - ${JSON.stringify(error.response.data)}` };
        }
        
        console.error('   Message:', error.message);
        return { success: false, error: error.message };
    }
};

const transferToSeller = async (transactionId, sellerPhone, amount) => {
    try {
        const payload = {
            ref_transaction: transactionId.toString(),
            phone: sellerPhone,
            amount: amount,
            description: 'Paiement vendeur Sama-Marche'
        };
        
        console.log('📡 Envoi transfert PayTech...');
        console.log('   Vendeur:', sellerPhone);
        console.log('   Montant:', amount);
        
        const response = await axios.post(`${PAYTECH_API_URL}/payment/transfer`, payload, {
            headers: {
                'API_KEY': PAYTECH_API_KEY,
                'API_SECRET': PAYTECH_SECRET_KEY,
                'Content-Type': 'application/json'
            },
            timeout: TIMEOUT
        });
        
        if (response.data && response.data.status === 'success') {
            console.log('✅ Transfert réussi');
            return { success: true };
        }
        
        console.error('❌ Transfert échoué:', response.data);
        return { success: false, error: 'Transfer failed' };
        
    } catch (error) {
        console.error('❌ PayTech transfer error:', error.message);
        return { success: false, error: error.message };
    }
};

const verifyPayment = async (paytechId) => {
    try {
        const response = await axios.get(`${PAYTECH_API_URL}/payment/check-status/${paytechId}`, {
            headers: {
                'API_KEY': PAYTECH_API_KEY,
                'API_SECRET': PAYTECH_SECRET_KEY
            },
            timeout: TIMEOUT
        });
        
        return { success: true, status: response.data.status };
        
    } catch (error) {
        console.error('❌ PayTech verification error:', error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { generatePaymentLink, transferToSeller, verifyPayment };