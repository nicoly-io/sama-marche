const supabase = require('../config/supabase');
const { deleteFile } = require('../services/r2Service');
const { logSecurityEvent } = require('../middleware/security');
const { LISTING_STATUS, TRANSACTION_STATUS, CNI_STATUS } = require('../utils/constants');

// Vérifier que l'utilisateur est admin
const isAdmin = (req, res, next) => {
    if (req.user.account_type !== 'admin') {
        return res.status(403).json({ error: 'Accès admin requis' });
    }
    next();
};

// Dashboard stats
const getStats = async (req, res) => {
    try {
        // Nombre d'utilisateurs
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        const { count: verifiedUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('is_cni_verified', true);
        
        // Annonces
        const { count: totalListings } = await supabase
            .from('listings')
            .select('*', { count: 'exact', head: true });
        
        const { count: activeListings } = await supabase
            .from('listings')
            .select('*', { count: 'exact', head: true })
            .eq('status', LISTING_STATUS.ACTIVE);
        
        // Transactions
        const { data: transactions } = await supabase
            .from('transactions')
            .select('amount_total, amount_fees, status')
            .in('status', [TRANSACTION_STATUS.COMPLETED, TRANSACTION_STATUS.PAID_ESCROW]);
        
        const totalEscrow = transactions?.reduce((sum, t) => 
            t.status === TRANSACTION_STATUS.PAID_ESCROW ? sum + t.amount_total : sum, 0) || 0;
        
        const totalFees = transactions?.reduce((sum, t) => 
            t.status === TRANSACTION_STATUS.COMPLETED ? sum + t.amount_fees : sum, 0) || 0;
        
        // CNI en attente
        const { count: pendingCNI } = await supabase
            .from('cni_documents')
            .select('*', { count: 'exact', head: true })
            .eq('status', CNI_STATUS.PENDING);
        
        res.json({
            success: true,
            stats: {
                users: { total: totalUsers, verified: verifiedUsers },
                listings: { total: totalListings, active: activeListings },
                transactions: { total_escrow: totalEscrow, total_fees: totalFees },
                pending_cni: pendingCNI
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des stats' });
    }
};

// Modérer les annonces
const moderateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reason } = req.body; // action: 'suspend', 'delete', 'activate'
        
        const { data: listing, error } = await supabase
            .from('listings')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error || !listing) {
            return res.status(404).json({ error: 'Annonce non trouvée' });
        }
        
        let newStatus;
        if (action === 'suspend') newStatus = LISTING_STATUS.SUSPENDED;
        else if (action === 'delete') newStatus = LISTING_STATUS.DELETED;
        else if (action === 'activate') newStatus = LISTING_STATUS.ACTIVE;
        
        await supabase
            .from('listings')
            .update({ status: newStatus })
            .eq('id', id);
        
        await logSecurityEvent('ADMIN_MODERATION', req.user.id, req, false, {
            listing_id: id,
            action,
            reason
        });
        
        res.json({ success: true, message: `Annonce ${action}ée` });
    } catch (error) {
        console.error('Moderate listing error:', error);
        res.status(500).json({ error: 'Erreur lors de la modération' });
    }
};

// Valider une CNI
const verifyCNI = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, rejection_reason } = req.body; // action: 'approve', 'reject'
        
        const { data: cni, error } = await supabase
            .from('cni_documents')
            .select('user_id')
            .eq('id', id)
            .single();
        
        if (error || !cni) {
            return res.status(404).json({ error: 'CNI non trouvée' });
        }
        
        if (action === 'approve') {
            await supabase
                .from('cni_documents')
                .update({
                    status: CNI_STATUS.VERIFIED,
                    verified_by: req.user.id,
                    verified_at: new Date()
                })
                .eq('id', id);
            
            await supabase
                .from('users')
                .update({
                    is_cni_verified: true,
                    badge_visible: true
                })
                .eq('id', cni.user_id);
        } else {
            await supabase
                .from('cni_documents')
                .update({
                    status: CNI_STATUS.REJECTED,
                    verified_by: req.user.id,
                    rejection_reason: rejection_reason
                })
                .eq('id', id);
        }
        
        await logSecurityEvent('ADMIN_CNI_REVIEW', req.user.id, req, false, {
            cni_id: id,
            action,
            user_id: cni.user_id
        });
        
        res.json({ success: true, message: `CNI ${action === 'approve' ? 'validée' : 'rejetée'}` });
    } catch (error) {
        console.error('Verify CNI error:', error);
        res.status(500).json({ error: 'Erreur lors de la validation' });
    }
};

// Gérer un litige
const resolveDispute = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution, refund_to_buyer, pay_seller } = req.body;
        
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', id)
            .eq('status', TRANSACTION_STATUS.DISPUTED)
            .single();
        
        if (error || !transaction) {
            return res.status(404).json({ error: 'Litige non trouvé' });
        }
        
        let newStatus;
        if (refund_to_buyer) {
            newStatus = TRANSACTION_STATUS.REFUNDED;
            // TODO: Appeler PayTech pour remboursement
        } else if (pay_seller) {
            newStatus = TRANSACTION_STATUS.COMPLETED;
            // TODO: Transférer au vendeur
        } else {
            newStatus = TRANSACTION_STATUS.CANCELLED;
        }
        
        await supabase
            .from('transactions')
            .update({
                status: newStatus,
                dispute_resolved_by: req.user.id,
                dispute_resolved_at: new Date(),
                dispute_reason: resolution
            })
            .eq('id', id);
        
        await logSecurityEvent('ADMIN_DISPUTE_RESOLVED', req.user.id, req, false, {
            transaction_id: id,
            resolution,
            refund_to_buyer,
            pay_seller
        });
        
        res.json({ success: true, message: 'Litige résolu' });
    } catch (error) {
        console.error('Resolve dispute error:', error);
        res.status(500).json({ error: 'Erreur lors de la résolution' });
    }
};

// Bloquer un utilisateur
const blockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        await supabase
            .from('users')
            .update({ status: 'banned' })
            .eq('id', id);
        
        // Bloquer toutes les annonces
        await supabase
            .from('listings')
            .update({ status: LISTING_STATUS.SUSPENDED })
            .eq('user_id', id)
            .eq('status', LISTING_STATUS.ACTIVE);
        
        await logSecurityEvent('ADMIN_BLOCK_USER', req.user.id, req, false, {
            blocked_user_id: id,
            reason
        });
        
        res.json({ success: true, message: 'Utilisateur bloqué' });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ error: 'Erreur lors du blocage' });
    }
};

// Obtenir les litiges en attente
const getPendingDisputes = async (req, res) => {
    try {
        const { data: disputes, error } = await supabase
            .from('transactions')
            .select(`
                *,
                listings:listing_id (title),
                buyer:buyer_id (full_name, phone, email),
                seller:seller_id (full_name, phone, email)
            `)
            .eq('status', TRANSACTION_STATUS.DISPUTED)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({ success: true, disputes });
    } catch (error) {
        console.error('Get disputes error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
};

// Obtenir les CNI en attente
const getPendingCNI = async (req, res) => {
    try {
        const { data: cnis, error } = await supabase
            .from('cni_documents')
            .select(`
                *,
                user:user_id (id, full_name, email, phone)
            `)
            .eq('status', CNI_STATUS.PENDING)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        res.json({ success: true, cnis });
    } catch (error) {
        console.error('Get pending CNI error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
};

module.exports = {
    isAdmin,
    getStats,
    moderateListing,
    verifyCNI,
    resolveDispute,
    blockUser,
    getPendingDisputes,
    getPendingCNI
};