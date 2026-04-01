const crypto = require('crypto');

const calculateBuyerPrice = (sellerPrice) => {
    const fee = Math.floor(sellerPrice * 6 / 100);
    return sellerPrice + fee;
};

const calculatePlatformFees = (sellerPrice) => {
    return Math.floor(sellerPrice * 6 / 100);
};

const generateValidationCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

const hashValidationCode = (code) => {
    return crypto.createHash('sha256').update(code).digest('hex');
};

const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-SN').format(price) + ' FCFA';
};

const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const generateRandomString = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

module.exports = {
    calculateBuyerPrice,
    calculatePlatformFees,
    generateValidationCode,
    hashValidationCode,
    formatPrice,
    getDistance,
    generateRandomString
};