const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// Import des routes
const authRoutes = require('./backend/routes/authRoutes');
const userRoutes = require('./backend/routes/userRoutes');
const listingRoutes = require('./backend/routes/listingRoutes');
const transactionRoutes = require('./backend/routes/transactionRoutes');
const chatRoutes = require('./backend/routes/chatRoutes');
const boostRoutes = require('./backend/routes/boostRoutes');
const subscriptionRoutes = require('./backend/routes/subscriptionRoutes');
const adminRoutes = require('./backend/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/boosts', boostRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

// Route de test
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// ============================================
// ROUTES DE RETOUR PAYTECH
// ============================================

// Page de succès après paiement
app.get('/payment-success', (req, res) => {
    const { transaction } = req.query;
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Paiement réussi - Sama-Marche</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .container {
                    text-align: center;
                    background: white;
                    padding: 3rem;
                    border-radius: 24px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    max-width: 500px;
                    margin: 1rem;
                }
                .success-icon {
                    font-size: 5rem;
                    color: #10B981;
                    margin-bottom: 1rem;
                }
                h1 { color: #1F2937; margin-bottom: 1rem; }
                p { color: #6B7280; margin-bottom: 1.5rem; line-height: 1.6; }
                .btn {
                    display: inline-block;
                    background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%);
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border-radius: 50px;
                    text-decoration: none;
                    font-weight: 600;
                    transition: transform 0.2s;
                }
                .btn:hover {
                    transform: translateY(-2px);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✅</div>
                <h1>Paiement réussi !</h1>
                <p>Votre transaction a été effectuée avec succès.<br>
                L'argent est sécurisé en attendant la livraison.</p>
                ${transaction ? `<p style="font-size: 0.875rem;">Transaction: ${transaction}</p>` : ''}
                <a href="/dashboard.html" class="btn">📦 Voir mes transactions</a>
            </div>
        </body>
        </html>
    `);
});

// Page d'annulation de paiement
app.get('/payment-cancel', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Paiement annulé - Sama-Marche</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .container {
                    text-align: center;
                    background: white;
                    padding: 3rem;
                    border-radius: 24px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    max-width: 500px;
                    margin: 1rem;
                }
                .cancel-icon {
                    font-size: 5rem;
                    color: #F59E0B;
                    margin-bottom: 1rem;
                }
                h1 { color: #1F2937; margin-bottom: 1rem; }
                p { color: #6B7280; margin-bottom: 1.5rem; line-height: 1.6; }
                .btn {
                    display: inline-block;
                    background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%);
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border-radius: 50px;
                    text-decoration: none;
                    font-weight: 600;
                    transition: transform 0.2s;
                }
                .btn:hover {
                    transform: translateY(-2px);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="cancel-icon">⚠️</div>
                <h1>Paiement annulé</h1>
                <p>Vous avez annulé le paiement.<br>Aucun montant n'a été débité.</p>
                <a href="/" class="btn">🏠 Retour à l'accueil</a>
            </div>
        </body>
        </html>
    `);
});

// Pour les routes non-API, renvoyer index.html
app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/payment-success' || req.path === '/payment-cancel') {
        next();
    } else if (req.method === 'GET') {
        res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
    } else {
        next();
    }
});

// Route de simulation de paiement (utile pour les tests)
app.get('/simulate-payment', (req, res) => {
    const { transaction, amount } = req.query;
    console.log('🔧 Simulation: paiement réussi pour transaction', transaction);
    
    // Simuler un appel callback
    setTimeout(async () => {
        try {
            const axios = require('axios');
            await axios.post('http://localhost:5000/api/transactions/callback', {
                token: `SIM_${transaction}_${Date.now()}`,
                status: 'confirmed',
                ref_command: transaction
            });
            console.log('🔧 Callback simulé envoyé pour transaction', transaction);
        } catch (err) {
            console.error('Erreur envoi callback:', err.message);
        }
    }, 1000);
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Paiement simulé - Sama-Marche</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; }
                .success { color: green; font-size: 24px; }
                .btn { background: #0D9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
            </style>
        </head>
        <body>
            <h1 class="success">✅ Paiement simulé réussi !</h1>
            <p>Transaction: ${transaction}</p>
            <p>Montant: ${amount} FCFA</p>
            <p>Dans un environnement réel, vous seriez redirigé vers Orange Money ou Wave.</p>
            <a href="http://localhost:5000" class="btn">Retour à l'accueil</a>
        </body>
        </html>
    `);
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Sama-Marche API démarrée sur le port ${PORT}`);
    console.log(`📁 Frontend: http://localhost:${PORT}`);
});