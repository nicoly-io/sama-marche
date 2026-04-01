const rateLimit = require('express-rate-limit');

// Limiteur général
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requêtes par fenêtre
    message: { error: 'Trop de requêtes, veuillez réessayer plus tard' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Limiteur pour l'authentification (OTP, connexion)
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 5, // 5 tentatives par heure
    message: { error: 'Trop de tentatives, veuillez réessayer dans 1 heure' },
});

// Limiteur pour les annonces
const listingLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 heures
    max: 10, // 10 annonces par jour
    message: { error: 'Limite de 10 annonces par jour atteinte' },
});

module.exports = { generalLimiter, authLimiter, listingLimiter };