const supabase = require('../config/supabase');
const { generatePaymentLink, verifyPayment } = require('../services/paytechService');
const { logSecurityEvent } = require('../middleware/security');
const { TRANSACTION_STATUS } = require('../utils/constants');

// Obtenir les packs de boost disponibles
const getBoostPackages = async (req, res) => {
    try {
        const { data: packages, error } = await supabase
            .from('boost_packages')
            .select('*')
            .eq('is_active', true);
        
        if (error) throw error;
        
        res.json({ success: true, packages });
    } catch (error) {
        console.error('Get boost packages error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des packs' });
    }
};

// Acheter un boost
const purchaseBoost = async (req, res) => {
    try {
        const { listingId, packageId } = req.body;
        const userId = req.user.id;
        
        // Vérifier l'annonce
        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .select('id, user_id, title')
            .eq('id', listingId)
            .single();
        
        if (listingError || !listing) {
            return res.status(404).json({ error: 'Annonce non trouvée' });
        }
        
        if (listing.user_id !== userId) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        // Vérifier le pack
        const { data: pack, error: packError } = await supabase
            .from('boost_packages')
            .select('*')
            .eq('id', packageId)
            .eq('is_active', true)
            .single();
        
        if (packError || !pack) {
            return res.status(404).json({ error: 'Pack non disponible' });
        }
        
        // Créer une transaction de boost
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert({
                listing_id: listingId,
                buyer_id: userId,
                seller_id: userId,
                amount_total: pack.price,
                amount_seller: 0,
                amount_fees: pack.price,
                status: TRANSACTION_STATUS.PENDING_PAYMENT
            })
            .select()
            .single();
        
        if (txError) throw txError;
        
        // Générer lien de paiement
        const paymentResult = await generatePaymentLink(
            transaction.id,
            pack.price,
            req.user.phone,
            `Boost "${listing.title}" - ${pack.name}`
        );
        
        if (!paymentResult.success) {
            await supabase.from('transactions').delete().eq('id', transaction.id);
            return res.status(500).json({ error: 'Erreur de paiement' });
        }
        
        await supabase
            .from('transactions')
            .update({
                paytech_transaction_id: paymentResult.paytech_id,
                paytech_payment_url: paymentResult.payment_url
            })
            .eq('id', transaction.id);
        
        res.json({
            success: true,
            transaction_id: transaction.id,
            payment_url: paymentResult.payment_url,
            amount: pack.price
        });
    } catch (error) {
        console.error('Purchase boost error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'achat du boost' });
    }
};

// Callback pour les boosts (après paiement)
const boostCallback = async (req, res) => {
    try {
        const { token, status, ref_command } = req.body;
        
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('paytech_transaction_id', token)
            .single();
        
        if (error || !transaction) {
            return res.status(404).json({ error: 'Transaction non trouvée' });
        }
        
        if (status === 'confirmed') {
            const verification = await verifyPayment(token);
            
            if (verification.success && verification.status === 'confirmed') {
                // Trouver le boost package lié
                const { data: userBoost } = await supabase
                    .from('user_boosts')
                    .select('*')
                    .eq('payment_transaction_id', transaction.id)
                    .single();
                
                if (userBoost) {
                    // Activer le boost
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + userBoost.package_duration);
                    
                    await supabase
                        .from('listings')
                        .update({
                            is_boosted: true,
                            boost_expires_at: expiresAt
                        })
                        .eq('id', transaction.listing_id);
                    
                    await supabase
                        .from('user_boosts')
                        .update({ status: 'active' })
                        .eq('id', userBoost.id);
                    
                    await logSecurityEvent('BOOST_ACTIVATED', transaction.buyer_id, req, false, {
                        listing_id: transaction.listing_id
                    });
                }
                
                await supabase
                    .from('transactions')
                    .update({ status: TRANSACTION_STATUS.COMPLETED })
                    .eq('id', transaction.id);
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Boost callback error:', error);
        res.status(500).json({ error: 'Erreur lors du traitement' });
    }
};

module.exports = {
    getBoostPackages,
    purchaseBoost,
    boostCallback
};