const supabase = require('../config/supabase');
const { generatePaymentLink, verifyPayment } = require('../services/paytechService');
const { logSecurityEvent } = require('../middleware/security');
const { TRANSACTION_STATUS, SUBSCRIPTION_TIERS } = require('../utils/constants');

// Obtenir les plans d'abonnement
const getSubscriptionPlans = async (req, res) => {
    try {
        const { data: plans, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true);
        
        if (error) throw error;
        
        res.json({ success: true, plans });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des plans' });
    }
};

// S'abonner
const subscribe = async (req, res) => {
    try {
        const { planId, period } = req.body; // period: 'monthly' ou 'yearly'
        const userId = req.user.id;
        
        const { data: plan, error: planError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('id', planId)
            .single();
        
        if (planError || !plan) {
            return res.status(404).json({ error: 'Plan non trouvé' });
        }
        
        const amount = period === 'yearly' ? plan.price_yearly : plan.price_monthly;
        const expiresAt = new Date();
        if (period === 'yearly') {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        }
        
        // Créer l'abonnement
        const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .insert({
                user_id: userId,
                plan_id: planId,
                expires_at: expiresAt,
                auto_renew: true,
                status: 'active'
            })
            .select()
            .single();
        
        if (subError) throw subError;
        
        // Mettre à jour l'utilisateur
        await supabase
            .from('users')
            .update({
                account_type: 'professional',
                subscription_tier: plan.name.toLowerCase(),
                subscription_expires_at: expiresAt
            })
            .eq('id', userId);
        
        // Créer la transaction de paiement
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert({
                listing_id: null,
                buyer_id: userId,
                seller_id: userId,
                amount_total: amount,
                amount_seller: 0,
                amount_fees: amount,
                status: TRANSACTION_STATUS.COMPLETED
            })
            .select()
            .single();
        
        if (txError) throw txError;
        
        await logSecurityEvent('SUBSCRIPTION_PURCHASED', userId, req, false, {
            plan_id: planId,
            period: period
        });
        
        res.json({
            success: true,
            subscription,
            message: 'Abonnement activé avec succès'
        });
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'abonnement' });
    }
};

// Obtenir l'abonnement de l'utilisateur
const getUserSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data: subscription, error } = await supabase
            .from('user_subscriptions')
            .select('*, plan:plan_id (*)')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('expires_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        res.json({
            success: true,
            subscription: subscription || null,
            user_tier: req.user.subscription_tier
        });
    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
};

// Annuler l'abonnement
const cancelSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { error } = await supabase
            .from('user_subscriptions')
            .update({ status: 'cancelled', auto_renew: false })
            .eq('user_id', userId)
            .eq('status', 'active');
        
        if (error) throw error;
        
        // L'utilisateur reste pro jusqu'à expiration
        await logSecurityEvent('SUBSCRIPTION_CANCELLED', userId, req);
        
        res.json({ success: true, message: 'Abonnement annulé. Valable jusqu\'à expiration.' });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'annulation' });
    }
};

module.exports = {
    getSubscriptionPlans,
    subscribe,
    getUserSubscription,
    cancelSubscription
};