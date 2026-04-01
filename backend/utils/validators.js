const phoneRegex = /^(77|78|70|76)[0-9]{7}$/; // Numéros Sénégal
const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;

const validatePhone = (phone) => {
    // Vérifier format +221 ou sans indicatif
    let cleanPhone = phone.replace(/^\+221/, '');
    return phoneRegex.test(cleanPhone);
};

const validateEmail = (email) => {
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    // Au moins 6 caractères
    return password && password.length >= 6;
};

const validateListingData = (data) => {
    const errors = [];
    
    if (!data.title || data.title.length < 3 || data.title.length > 255) {
        errors.push('Le titre doit contenir entre 3 et 255 caractères');
    }
    
    if (!data.seller_price || data.seller_price < 100) {
        errors.push('Le prix minimum est de 100 FCFA');
    }
    
    if (data.seller_price > 10000000) {
        errors.push('Le prix maximum est de 10 000 000 FCFA');
    }
    
    if (!data.quartier) {
        errors.push('Le quartier est obligatoire');
    }
    
    return errors;
};

const validateTransactionCode = (code) => {
    return /^\d{4}$/.test(code);
};

module.exports = {
    validatePhone,
    validateEmail,
    validatePassword,
    validateListingData,
    validateTransactionCode,
    phoneRegex
};