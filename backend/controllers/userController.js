const supabase = require('../config/supabase');
const { uploadCNI } = require('../middleware/upload');
const { uploadFile, deleteFile } = require('../services/r2Service');
const { encrypt, generateEncryptionKey } = require('../services/encryptionService');
const { compressAndSave } = require('../services/compressionService');
const { CNI_STATUS } = require('../utils/constants');
const { logSecurityEvent } = require('../middleware/security');

// Obtenir le profil utilisateur
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, phone, full_name, avatar_url, account_type, is_phone_verified, is_cni_verified, badge_visible, created_at')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
    }
};

// Mettre à jour le profil
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, avatar_url } = req.body;
        
        const updateData = {};
        if (full_name) updateData.full_name = full_name;
        if (avatar_url) updateData.avatar_url = avatar_url;
        updateData.updated_at = new Date();
        
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, user: data });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
};

// Soumettre CNI pour vérification
const submitCNI = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Vérifier si une CNI est déjà soumise
        const { data: existing, error: checkError } = await supabase
            .from('cni_documents')
            .select('id, status')
            .eq('user_id', userId)
            .single();
        
        if (existing && existing.status === 'pending') {
            return res.status(400).json({ error: 'Une demande est déjà en attente' });
        }
        
        if (existing && existing.status === 'verified') {
            return res.status(400).json({ error: 'Votre identité est déjà vérifiée' });
        }
        
        // Upload des fichiers
        uploadCNI(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            
            const files = req.files;
            if (!files || !files.recto || !files.verso) {
                return res.status(400).json({ error: 'Recto et verso requis' });
            }
            
            try {
                // Compresser les images
                const rectoPath = files.recto[0].path;
                const versoPath = files.verso[0].path;
                
                await compressAndSave(rectoPath, 1200, 85);
                await compressAndSave(versoPath, 1200, 85);
                
                // Générer clé de chiffrement
                const encryptionKey = generateEncryptionKey();
                
                // Upload vers R2
                const timestamp = Date.now();
                const rectoKey = `cni/${userId}/recto_${timestamp}.jpg`;
                const versoKey = `cni/${userId}/verso_${timestamp}.jpg`;
                
                const rectoUpload = await uploadFile(rectoPath, 'cni', `recto_${timestamp}.jpg`);
                const versoUpload = await uploadFile(versoPath, 'cni', `verso_${timestamp}.jpg`);
                
                if (!rectoUpload.success || !versoUpload.success) {
                    throw new Error('Upload échoué');
                }
                
                // Stocker en base
                const { data, error } = await supabase
                    .from('cni_documents')
                    .insert({
                        user_id: userId,
                        recto_path: rectoKey,
                        verso_path: versoKey,
                        encryption_key: encrypt(encryptionKey, process.env.MASTER_ENCRYPTION_KEY),
                        status: CNI_STATUS.PENDING
                    })
                    .select()
                    .single();
                
                if (error) throw error;
                
                // Mettre à jour le statut utilisateur
                await supabase
                    .from('users')
                    .update({ is_cni_submitted: true })
                    .eq('id', userId);
                
                await logSecurityEvent('CNI_SUBMITTED', userId, req);
                
                res.json({ success: true, message: 'CNI soumise avec succès, en attente de validation' });
            } catch (error) {
                console.error('CNI submit error:', error);
                res.status(500).json({ error: 'Erreur lors de la soumission' });
            }
        });
    } catch (error) {
        console.error('Submit CNI error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Obtenir les annonces d'un utilisateur
const getUserListings = async (req, res) => {
    try {
        const userId = req.params.userId || req.user.id;
        const { status, page = 1, limit = 20 } = req.query;
        
        let query = supabase
            .from('listings')
            .select('*', { count: 'exact' })
            .eq('user_id', userId);
        
        if (status) query = query.eq('status', status);
        
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);
        
        if (error) throw error;
        
        res.json({
            success: true,
            listings: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get user listings error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des annonces' });
    }
};

// Obtenir les transactions d'un utilisateur
// Obtenir les transactions d'un utilisateur
const getUserTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { role, status, page = 1, limit = 20 } = req.query;
        
        let query = supabase
            .from('transactions')
            .select(`
                *,
                listings:listing_id (id, title),
                buyer:buyer_id (id, full_name, phone),
                seller:seller_id (id, full_name, phone)
            `);
        
        if (role === 'buyer') {
            query = query.eq('buyer_id', userId);
        } else if (role === 'seller') {
            query = query.eq('seller_id', userId);
        } else {
            query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
        }
        
        if (status) query = query.eq('status', status);
        
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(from, to);
        
        if (error) throw error;
        
        res.json({
            success: true,
            transactions: data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get user transactions error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des transactions' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    submitCNI,
    getUserListings,
    getUserTransactions
};