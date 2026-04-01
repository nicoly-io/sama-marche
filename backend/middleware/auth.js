const { verifyToken } = require('../config/jwt');
const supabase = require('../config/supabase');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({ error: 'Token invalide ou expiré' });
        }
        
        // Vérifier que l'utilisateur existe toujours
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, phone, status, account_type')
            .eq('id', decoded.id)
            .single();
        
        if (error || !user) {
            return res.status(401).json({ error: 'Utilisateur introuvable' });
        }
        
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Compte désactivé' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Erreur d\'authentification' });
    }
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        
        if (!roles.includes(req.user.account_type)) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }
        
        next();
    };
};

module.exports = { authenticate, requireRole };