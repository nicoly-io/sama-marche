const supabase = require('../config/supabase');
const { generatePaymentLink, transferToSeller, verifyPayment } = require('../services/paytechService');
const { generateValidationCode, hashValidationCode } = require('../utils/helpers');
const { TRANSACTION_STATUS } = require('../utils/constants');
const { sendOTP, sendNotification } = require('../services/smsService');
const { sendPaymentConfirmation, sendDeliveryCode } = require('../services/emailService');
const { logSecurityEvent } = require('../middleware/security');

// Initier un achat (séquestre)
const initiatePurchase = async (req, res) => {
    try {
        const { listingId } = req.body;
        const buyerId = req.user.id;
        
        console.log('=== initiatePurchase ===');
        console.log('listingId:', listingId);
        console.log('buyerId:', buyerId);
        console.log('req.user:', req.user);
        
        // Vérifier l'annonce
        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .select('*, user:user_id (id, phone, email, full_name)')
            .eq('id', listingId)
            .eq('status', 'active')
            .single();
        
        if (listingError || !listing) {
            console.error('Listing not found:', listingError);
            return res.status(404).json({ error: 'Annonce non disponible' });
        }
        
        console.log('Listing trouvé:', listing.id, 'Prix:', listing.buyer_price);
        
        if (listing.user_id === buyerId) {
            return res.status(400).json({ error: 'Vous ne pouvez pas acheter votre propre annonce' });
        }
        
        // Vérifier si une transaction existe déjà
        const { data: existing, error: existingError } = await supabase
            .from('transactions')
            .select('id, status')
            .eq('listing_id', listingId)
            .eq('buyer_id', buyerId)
            .in('status', [TRANSACTION_STATUS.PENDING_PAYMENT, TRANSACTION_STATUS.PAID_ESCROW])
            .maybeSingle();
        
        if (existing) {
            console.log('Transaction déjà existante:', existing);
            return res.status(400).json({ error: 'Une transaction est déjà en cours' });
        }
        
        // Créer la transaction
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert({
                listing_id: listingId,
                buyer_id: buyerId,
                seller_id: listing.user_id,
                amount_total: listing.buyer_price,
                amount_seller: listing.seller_price,
                amount_fees: listing.platform_fee_total,
                status: TRANSACTION_STATUS.PENDING_PAYMENT
            })
            .select()
            .single();
        
        if (txError) {
            console.error('Create transaction error:', txError);
            return res.status(500).json({ error: 'Erreur lors de la création de la transaction: ' + txError.message });
        }
        
        console.log('Transaction créée:', transaction.id);
        
        // Générer le lien de paiement PayTech
        console.log('Génération du lien PayTech avec:', {
            transaction_id: transaction.id,
            amount: listing.buyer_price,
            phone: req.user.phone,
            title: listing.title
        });
        
        const paymentResult = await generatePaymentLink(
            transaction.id,
            listing.buyer_price,
            req.user.phone,
            listing.title
        );
        
        console.log('Résultat PayTech:', paymentResult);
        
        if (!paymentResult.success) {
            console.error('PayTech error:', paymentResult.error);
            // Supprimer la transaction
            await supabase.from('transactions').delete().eq('id', transaction.id);
            return res.status(500).json({ error: 'Erreur lors de la création du paiement: ' + (paymentResult.error || 'Erreur inconnue') });
        }
        
        // Mettre à jour la transaction avec le lien PayTech
        await supabase
            .from('transactions')
            .update({
                paytech_transaction_id: paymentResult.paytech_id,
                paytech_payment_url: paymentResult.payment_url
            })
            .eq('id', transaction.id);
        
        await logSecurityEvent('PURCHASE_INITIATED', buyerId, req, false, { transaction_id: transaction.id });
        
        res.json({
            success: true,
            transaction_id: transaction.id,
            payment_url: paymentResult.payment_url,
            amount: listing.buyer_price
        });
    } catch (error) {
        console.error('Initiate purchase error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'initialisation de l\'achat: ' + error.message });
    }
};

// Callback PayTech (webhook)
const paymentCallback = async (req, res) => {
    try {
        const { token, status, ref_command } = req.body;
        
        console.log('=== paymentCallback ===');
        console.log('token:', token);
        console.log('status:', status);
        
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('paytech_transaction_id', token)
            .single();
        
        if (error || !transaction) {
            console.error('Transaction not found:', error);
            return res.status(404).json({ error: 'Transaction non trouvée' });
        }
        
        if (status === 'confirmed') {
            // Vérifier à nouveau via API PayTech
            const verification = await verifyPayment(token);
            
            if (verification.success && verification.status === 'confirmed') {
                // Mettre à jour le statut
                await supabase
                    .from('transactions')
                    .update({ status: TRANSACTION_STATUS.PAID_ESCROW })
                    .eq('id', transaction.id);
                
                // Générer le code de validation
                const validationCode = generateValidationCode();
                const codeHash = hashValidationCode(validationCode);
                const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
                
                await supabase
                    .from('transactions')
                    .update({
                        validation_code_hash: codeHash,
                        validation_code_expires_at: expiresAt
                    })
                    .eq('id', transaction.id);
                
                // Notifier l'acheteur par SMS (code)
                const { data: buyer } = await supabase
                    .from('users')
                    .select('phone, email')
                    .eq('id', transaction.buyer_id)
                    .single();
                
                await sendOTP(buyer.phone, validationCode);
                await sendDeliveryCode(buyer.email, validationCode);
                
                // Notifier le vendeur
                const { data: seller } = await supabase
                    .from('users')
                    .select('phone, email')
                    .eq('id', transaction.seller_id)
                    .single();
                
                const { data: listing } = await supabase
                    .from('listings')
                    .select('title')
                    .eq('id', transaction.listing_id)
                    .single();
                
                await sendNotification(seller.phone, `Votre objet "${listing.title}" a été payé. L'argent est sécurisé. Livrez pour débloquer vos fonds.`);
                await sendPaymentConfirmation(buyer.email, listing.title, transaction.amount_total);
                
                await logSecurityEvent('PAYMENT_CONFIRMED', transaction.buyer_id, req, false, { transaction_id: transaction.id });
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Payment callback error:', error);
        res.status(500).json({ error: 'Erreur lors du traitement du paiement' });
    }
};

// Valider la livraison (vendeur saisit le code)
const validateDelivery = async (req, res) => {
    try {
        const { transactionId, code } = req.body;
        const sellerId = req.user.id;
        
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .eq('seller_id', sellerId)
            .single();
        
        if (error || !transaction) {
            return res.status(404).json({ error: 'Transaction non trouvée' });
        }
        
        if (transaction.status !== TRANSACTION_STATUS.PAID_ESCROW) {
            return res.status(400).json({ error: 'Transaction non éligible à la validation' });
        }
        
        if (new Date(transaction.validation_code_expires_at) < new Date()) {
            return res.status(400).json({ error: 'Code expiré' });
        }
        
        const codeHash = hashValidationCode(code);
        if (codeHash !== transaction.validation_code_hash) {
            await logSecurityEvent('INVALID_VALIDATION_CODE', sellerId, req, true, { transaction_id: transactionId });
            return res.status(400).json({ error: 'Code invalide' });
        }
        
        // Marquer comme livré
        await supabase
            .from('transactions')
            .update({
                status: TRANSACTION_STATUS.DELIVERED,
                delivered_at: new Date()
            })
            .eq('id', transactionId);
        
        // Transférer les fonds au vendeur
        const transferResult = await transferToSeller(
            transactionId,
            req.user.phone,
            transaction.amount_seller
        );
        
        if (!transferResult.success) {
            // En cas d'échec, garder en attente
            console.error('Transfer failed:', transferResult.error);
            return res.status(500).json({ error: 'Erreur lors du transfert, veuillez réessayer' });
        }
        
        // Marquer comme complété
        await supabase
            .from('transactions')
            .update({
                status: TRANSACTION_STATUS.COMPLETED,
                completed_at: new Date()
            })
            .eq('id', transactionId);
        
        // Mettre à jour le statut de l'annonce
        await supabase
            .from('listings')
            .update({ status: 'sold' })
            .eq('id', transaction.listing_id);
        
        await logSecurityEvent('DELIVERY_VALIDATED', sellerId, req, false, { transaction_id: transactionId });
        
        res.json({ success: true, message: 'Livraison validée, fonds transférés' });
    } catch (error) {
        console.error('Validate delivery error:', error);
        res.status(500).json({ error: 'Erreur lors de la validation' });
    }
};

// Obtenir le statut d'une transaction
const getTransactionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select(`
                *,
                listings:listing_id (title, photos),
                buyer:buyer_id (id, full_name, phone),
                seller:seller_id (id, full_name, phone)
            `)
            .eq('id', id)
            .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
            .single();
        
        if (error || !transaction) {
            return res.status(404).json({ error: 'Transaction non trouvée' });
        }
        
        res.json({ success: true, transaction });
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
};

// Ouvrir un litige
const openDispute = async (req, res) => {
    try {
        const { transactionId, reason } = req.body;
        const userId = req.user.id;
        
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
            .single();
        
        if (error || !transaction) {
            return res.status(404).json({ error: 'Transaction non trouvée' });
        }
        
        if (transaction.status !== TRANSACTION_STATUS.PAID_ESCROW) {
            return res.status(400).json({ error: 'Litige non autorisé à ce stade' });
        }
        
        await supabase
            .from('transactions')
            .update({
                status: TRANSACTION_STATUS.DISPUTED,
                disputed_by: userId,
                dispute_reason: reason,
                dispute_resolved_at: null
            })
            .eq('id', transactionId);
        
        await logSecurityEvent('DISPUTE_OPENED', userId, req, false, { transaction_id: transactionId, reason });
        
        res.json({ success: true, message: 'Litige ouvert, un administrateur va traiter votre demande' });
    } catch (error) {
        console.error('Open dispute error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ouverture du litige' });
    }
};

module.exports = {
    initiatePurchase,
    paymentCallback,
    validateDelivery,
    getTransactionStatus,
    openDispute
};