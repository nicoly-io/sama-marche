const supabase = require('../config/supabase');
const { generateToken } = require('../config/jwt');
const { validatePhone, validateEmail, validatePassword } = require('../utils/validators');
const { generateRandomString } = require('../utils/helpers');
const { sendOTP } = require('../services/smsService');
const { logSecurityEvent } = require('../middleware/security');
const axios = require('axios');

// Générer et envoyer OTP
const sendOTPCode = async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ error: 'Le numéro de téléphone est requis' });
        }
        
        const cleanPhone = phone.replace(/^\+221/, '');
        if (!validatePhone(cleanPhone)) {
            return res.status(400).json({ error: 'Numéro de téléphone sénégalais invalide' });
        }
        
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        
        await supabase.from('otp_codes').delete().eq('phone', cleanPhone);
        
        const { error: otpError } = await supabase
            .from('otp_codes')
            .insert({
                phone: cleanPhone,
                code: otpCode,
                expires_at: expiresAt.toISOString(),
                attempts: 0
            });
        
        if (otpError) {
            console.error('OTP storage error:', otpError);
            return res.status(500).json({ error: 'Erreur lors de l\'envoi du code' });
        }
        
        const smsResult = await sendOTP(cleanPhone, otpCode);
        
        if (!smsResult.success) {
            return res.status(500).json({ error: 'Erreur d\'envoi du SMS' });
        }
        
        res.json({ success: true, message: 'Code envoyé par SMS' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Vérifier OTP et compléter inscription
const verifyOTPAndRegister = async (req, res) => {
    try {
        const { phone, email, fullName, password, otpCode, googleId, avatar } = req.body;
        
        console.log('=== INSCRIPTION ===');
        console.log('Email:', email);
        console.log('Avatar reçu:', avatar ? 'Oui (longueur: ' + avatar.length + ')' : 'Non');
        
        if (!phone || !otpCode) {
            return res.status(400).json({ error: 'Téléphone et code OTP requis' });
        }
        
        const cleanPhone = phone.replace(/^\+221/, '');
        
        const { data: otpData, error: otpError } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('phone', cleanPhone)
            .single();
        
        if (otpError || !otpData) {
            return res.status(400).json({ error: 'Code invalide ou expiré' });
        }
        
        if (new Date(otpData.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Code expiré' });
        }
        
        if (otpData.code !== otpCode) {
            await supabase
                .from('otp_codes')
                .update({ attempts: otpData.attempts + 1 })
                .eq('phone', cleanPhone);
            return res.status(400).json({ error: 'Code incorrect' });
        }
        
        let user;
        
        if (googleId) {
            const { data: existingUser } = await supabase
                .from('users')
                .select('*')
                .eq('google_id', googleId)
                .single();
            
            if (existingUser) {
                if (!existingUser.is_phone_verified) {
                    await supabase
                        .from('users')
                        .update({ 
                            phone: cleanPhone, 
                            is_phone_verified: true,
                            avatar_url: avatar || existingUser.avatar_url
                        })
                        .eq('id', existingUser.id);
                }
                user = existingUser;
            } else {
                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert({
                        email: email,
                        phone: cleanPhone,
                        full_name: fullName,
                        google_id: googleId,
                        is_phone_verified: true,
                        avatar_url: avatar || null,
                        created_at: new Date(),
                        updated_at: new Date()
                    })
                    .select()
                    .single();
                
                if (createError) throw createError;
                user = newUser;
            }
        } else {
            if (!email || !password) {
                return res.status(400).json({ error: 'Email et mot de passe requis' });
            }
            
            if (!validateEmail(email)) {
                return res.status(400).json({ error: 'Email invalide' });
            }
            
            if (!validatePassword(password)) {
                return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
            }
            
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    email: email,
                    phone: cleanPhone,
                    full_name: fullName,
                    password_hash: password,
                    is_phone_verified: true,
                    avatar_url: avatar || null,
                    created_at: new Date(),
                    updated_at: new Date()
                })
                .select()
                .single();
            
            if (createError) {
                console.error('Erreur création:', createError);
                throw createError;
            }
            user = newUser;
            console.log('Utilisateur créé avec avatar_url:', user.avatar_url ? 'Oui' : 'Non');
        }
        
        await supabase.from('otp_codes').delete().eq('phone', cleanPhone);
        await logSecurityEvent('LOGIN_SUCCESS', user.id, req);
        
        const token = generateToken(user.id, user.phone, user.email);
        
        console.log('=== INSCRIPTION RÉUSSIE ===');
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                fullName: user.full_name,
                avatarUrl: user.avatar_url,
                isPhoneVerified: user.is_phone_verified,
                isCniVerified: user.is_cni_verified,
                accountType: user.account_type
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription: ' + error.message });
    }
};

// Connexion classique
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('=== CONNEXION ===');
        console.log('Email:', email);
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error || !user) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        console.log('Mot de passe stocké:', user.password_hash);
        console.log('Mot de passe fourni:', password);
        
        if (user.password_hash !== password) {
            await logSecurityEvent('LOGIN_FAILED', user.id, req, true);
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }
        
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Compte désactivé' });
        }
        
        await logSecurityEvent('LOGIN_SUCCESS', user.id, req);
        
        const token = generateToken(user.id, user.phone, user.email);
        
        console.log('=== CONNEXION RÉUSSIE ===');
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                fullName: user.full_name,
                avatarUrl: user.avatar_url,
                isPhoneVerified: user.is_phone_verified,
                isCniVerified: user.is_cni_verified,
                accountType: user.account_type
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Google Login - Redirection vers Google
const googleLogin = (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/google/callback`;
    const scope = 'email profile';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    
    console.log('Google Login - Redirection vers:', authUrl);
    res.redirect(authUrl);
};

// Google Callback - Traitement après authentification
const googleCallback = async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            return res.status(400).json({ error: 'Code d\'autorisation manquant' });
        }
        
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/google/callback`;
        
        // Échanger le code contre un token d'accès
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        });
        
        const { access_token } = tokenResponse.data;
        
        // Récupérer les infos utilisateur avec le token
        const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        
        const { id, email, name, picture } = userInfoResponse.data;
        
        console.log('Google User Info:', { id, email, name });
        
        // Vérifier si l'utilisateur existe déjà
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();
        
        if (!user) {
            // Créer un nouvel utilisateur
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    email: email,
                    full_name: name,
                    google_id: id,
                    avatar_url: picture,
                    is_phone_verified: false,
                    created_at: new Date(),
                    updated_at: new Date()
                })
                .select()
                .single();
            
            if (createError) throw createError;
            user = newUser;
            console.log('Nouvel utilisateur Google créé:', user.id);
        } else if (!user.google_id) {
            // Mettre à jour l'utilisateur avec google_id
            await supabase
                .from('users')
                .update({ google_id: id, avatar_url: picture })
                .eq('id', user.id);
            user.google_id = id;
        }
        
        // Générer le token JWT
        const token = generateToken(user.id, user.phone, user.email);
        
        // Rediriger vers le frontend avec le token
        res.redirect(`${process.env.APP_URL || 'http://localhost:5000'}/login?token=${token}&user=${encodeURIComponent(JSON.stringify({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            avatarUrl: user.avatar_url,
            isPhoneVerified: user.is_phone_verified,
            isCniVerified: user.is_cni_verified,
            accountType: user.account_type
        }))}`);
        
    } catch (error) {
        console.error('Google callback error:', error.response?.data || error.message);
        res.redirect(`${process.env.APP_URL || 'http://localhost:5000'}/login?error=google_auth_failed`);
    }
};

// Accepter les CGU
const acceptTerms = async (req, res) => {
    try {
        const { consentType, version } = req.body;
        const userId = req.user.id;
        
        const signatureHash = generateRandomString(64);
        
        const { error } = await supabase
            .from('user_consents')
            .insert({
                user_id: userId,
                consent_type: consentType,
                version: version,
                ip_address: req.ip,
                user_agent: req.headers['user-agent'],
                signature_hash: signatureHash
            });
        
        if (error) throw error;
        
        res.json({ success: true, message: 'Conditions acceptées' });
    } catch (error) {
        console.error('Accept terms error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'acceptation' });
    }
};

module.exports = {
    sendOTPCode,
    verifyOTPAndRegister,
    login,
    acceptTerms,
    googleLogin,
    googleCallback
};