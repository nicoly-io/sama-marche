const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sama-marche-secret-2026';
const JWT_EXPIRES_IN = '7d';

const generateToken = (userId, phone, email) => {
    return jwt.sign(
        { id: userId, phone, email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

module.exports = { generateToken, verifyToken, JWT_SECRET };