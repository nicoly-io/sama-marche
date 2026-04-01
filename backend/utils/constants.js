// Statuts des utilisateurs
const USER_STATUS = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    BANNED: 'banned'
};

// Statuts des annonces
const LISTING_STATUS = {
    ACTIVE: 'active',
    SOLD: 'sold',
    EXPIRED: 'expired',
    SUSPENDED: 'suspended',
    DELETED: 'deleted'
};

// Statuts des transactions
const TRANSACTION_STATUS = {
    PENDING_PAYMENT: 'pending_payment',
    PAID_ESCROW: 'paid_escrow',
    DELIVERED: 'delivered',
    COMPLETED: 'completed',
    DISPUTED: 'disputed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
};

// Statuts des CNI
const CNI_STATUS = {
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
};

// Types de consentement
const CONSENT_TYPES = {
    CGU: 'cgu',
    PRIVACY: 'privacy',
    ESCROW: 'escrow'
};

// Types de comptes
const ACCOUNT_TYPES = {
    INDIVIDUAL: 'individual',
    PROFESSIONAL: 'professional'
};

// Types d'abonnement
const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    BASIC: 'basic',
    PREMIUM: 'premium'
};

// Frais de la plateforme
const PLATFORM_FEE_PERCENTAGE = 6; // 6% total
const SELLER_FEE_PERCENTAGE = 3; // 3% pour le vendeur
const PLATFORM_FEE_PERCENTAGE_OPERATING = 3; // 3% pour fonctionnement

// Limites par défaut
const DEFAULT_LIMITS = {
    FREE_LISTINGS_MAX: 5,
    FREE_PHOTOS_PER_LISTING: 5,
    MAX_LISTING_TITLE_LENGTH: 255,
    MAX_LISTING_DESCRIPTION_LENGTH: 5000
};

module.exports = {
    USER_STATUS,
    LISTING_STATUS,
    TRANSACTION_STATUS,
    CNI_STATUS,
    CONSENT_TYPES,
    ACCOUNT_TYPES,
    SUBSCRIPTION_TIERS,
    PLATFORM_FEE_PERCENTAGE,
    SELLER_FEE_PERCENTAGE,
    PLATFORM_FEE_PERCENTAGE_OPERATING,
    DEFAULT_LIMITS
};