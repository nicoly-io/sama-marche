const rateLimit = require('express-rate-limit');

// Limiteur général (augmenté)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requêtes par fenêtre (au lieu de 100)
    message: { error: 'Trop de requêtes, veuillez réessayer plus tard' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Limiteur pour l'authentification (OTP, connexion) - AUGMENTÉ POUR LES TESTS
const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes (au lieu de 1 heure)
    max: 20, // 20 tentatives par 5 minutes (au lieu de 5 par heure)
    message: { error: 'Trop de tentatives, veuillez réessayer dans 5 minutes' },
});

// Limiteur pour les annonces
const listingLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 heures
    max: 20, // 20 annonces par jour (au lieu de 10)
    message: { error: 'Limite de 20 annonces par jour atteinte' },
});

// Limiteur désactivé pour le développement (optionnel)
const disabledLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // 1000 requêtes (pratiquement illimité)
    message: { error: 'Trop de requêtes' },
});

module.exports = { 
    generalLimiter, 
    authLimiter, 
    listingLimiter,
    disabledLimiter 
};