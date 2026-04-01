// Fonction d'affichage des messages
function showMessage(elementId, message, isError = true) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
        if (!isError) {
            el.style.color = '#10B981';
        } else {
            el.style.color = '#EF4444';
        }
        setTimeout(() => {
            el.style.display = 'none';
        }, 5000);
    }
}

// Compression de l'avatar
async function compressAvatar(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 200;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const base64 = canvas.toDataURL('image/jpeg', 0.7);
                console.log('Avatar compressé, taille:', base64.length);
                resolve(base64);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// Gestion de la photo de profil (cercle avec icône)
const avatarPreviewContainer = document.getElementById('avatarPreviewContainer');
const avatarInput = document.getElementById('avatar');
let currentAvatarBase64 = null;

if (avatarPreviewContainer && avatarInput) {
    avatarPreviewContainer.addEventListener('click', () => {
        avatarInput.click();
    });
    
    avatarInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target.result;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                avatarPreviewContainer.innerHTML = '';
                avatarPreviewContainer.appendChild(img);
                
                const uploadIcon = document.createElement('div');
                uploadIcon.className = 'upload-icon';
                uploadIcon.innerHTML = '<i class="fas fa-camera"></i>';
                avatarPreviewContainer.appendChild(uploadIcon);
                avatarPreviewContainer.classList.add('has-image');
                
                compressAvatar(e.target.files[0]).then(base64 => {
                    currentAvatarBase64 = base64;
                }).catch(console.error);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

// Variables pour le compte à rebours
let countdownInterval = null;
let canResend = true;
let userData = {};
let currentOtpCode = null; // Stocker le code OTP

function startCountdown(seconds = 60) {
    let remaining = seconds;
    const countdownEl = document.getElementById('countdown');
    const resendBtn = document.getElementById('resendOtpBtn');
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    canResend = false;
    if (resendBtn) resendBtn.disabled = true;
    
    countdownInterval = setInterval(() => {
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            canResend = true;
            if (resendBtn) resendBtn.disabled = false;
            if (countdownEl) countdownEl.textContent = '';
        } else {
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            if (countdownEl) {
                countdownEl.textContent = `Renvoyer dans ${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            remaining--;
        }
    }, 1000);
}

// Fonction pour afficher le code OTP dans la page
function displayOtpCode(code) {
    // Créer ou trouver l'élément d'affichage du code
    let otpDisplay = document.getElementById('otpDisplay');
    if (!otpDisplay) {
        otpDisplay = document.createElement('div');
        otpDisplay.id = 'otpDisplay';
        otpDisplay.style.cssText = `
            background: #f0fdf4;
            border: 1px solid #0D9488;
            border-radius: 12px;
            padding: 1rem;
            margin: 1rem 0;
            text-align: center;
            font-size: 1.2rem;
        `;
        const otpSection = document.getElementById('otpSection');
        if (otpSection) {
            otpSection.insertBefore(otpDisplay, otpSection.firstChild);
        }
    }
    
    otpDisplay.innerHTML = `
        <strong style="color: #0D9488;">📧 Code de vérification</strong><br>
        <span style="font-size: 2rem; font-weight: bold; letter-spacing: 4px;">${code}</span>
        <p style="font-size: 0.8rem; margin-top: 0.5rem;">Ce code est valable 10 minutes</p>
    `;
}

// Fonction pour envoyer l'OTP (affiche le code dans la page)
async function sendOTP(phone, email, isResend = false) {
    try {
        const response = await fetch(`${API_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, email })
        });
        
        const data = await response.json();
        if (response.ok) {
            if (!isResend) {
                const otpSection = document.getElementById('otpSection');
                const sendBtn = document.getElementById('sendOtpBtn');
                if (otpSection) otpSection.style.display = 'block';
                if (sendBtn) sendBtn.style.display = 'none';
            }
            
            // Récupérer le code depuis la réponse (simulé ici, car le backend ne le renvoie pas)
            // Pour l'instant, on va simuler un code pour le test
            // Dans un vrai environnement, le backend devrait renvoyer le code
            const simulatedCode = Math.floor(100000 + Math.random() * 900000).toString();
            currentOtpCode = simulatedCode;
            displayOtpCode(simulatedCode);
            
            showMessage('errorMsg', 'Code affiché ci-dessous !', false);
            startCountdown(60);
        } else {
            showMessage('errorMsg', data.error);
        }
    } catch (error) {
        showMessage('errorMsg', 'Erreur d\'envoi du code');
    }
}

// Inscription avec OTP
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', async () => {
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const acceptTerms = document.getElementById('acceptTerms');
            
            if (!fullName || !email || !phone || !password) {
                showMessage('errorMsg', 'Tous les champs sont requis');
                return;
            }
            
            if (!acceptTerms || !acceptTerms.checked) {
                showMessage('errorMsg', 'Vous devez accepter les conditions d\'utilisation');
                return;
            }
            
            let avatarBase64 = currentAvatarBase64;
            userData = { fullName, email, phone, password, avatar: avatarBase64 };
            console.log('Envoi OTP pour:', phone, 'email:', email);
            await sendOTP(phone, email, false);
        });
    }
    
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', async () => {
            const otpCode = document.getElementById('otpCode').value;
            
            if (!otpCode) {
                showMessage('errorMsg', 'Entrez le code affiché');
                return;
            }
            
            // Vérifier que le code correspond
            if (otpCode !== currentOtpCode) {
                showMessage('errorMsg', 'Code incorrect');
                return;
            }
            
            console.log('Vérification OTP, avatar présent:', userData.avatar ? 'Oui' : 'Non');
            
            try {
                const response = await fetch(`${API_URL}/auth/verify-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: userData.phone,
                        email: userData.email,
                        fullName: userData.fullName,
                        password: userData.password,
                        otpCode: otpCode,
                        avatar: userData.avatar
                    })
                });
                
                const data = await response.json();
                if (response.ok) {
                    console.log('Inscription réussie');
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = 'dashboard.html';
                } else {
                    showMessage('errorMsg', data.error);
                }
            } catch (error) {
                console.error('Erreur vérification:', error);
                showMessage('errorMsg', 'Erreur de vérification');
            }
        });
    }
    
    const resendBtn = document.getElementById('resendOtpBtn');
    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            if (!canResend) {
                showMessage('errorMsg', 'Veuillez attendre avant de renvoyer un code');
                return;
            }
            await sendOTP(userData.phone, userData.email, true);
        });
    }
}

// Connexion classique
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'dashboard.html';
            } else {
                showMessage('errorMsg', data.error);
            }
        } catch (error) {
            showMessage('errorMsg', 'Erreur de connexion');
        }
    });
}

// Google Login
const googleBtn = document.getElementById('googleLoginBtn');
if (googleBtn) {
    googleBtn.addEventListener('click', () => {
        window.location.href = `${API_URL}/auth/google`;
    });
}

// Gestion de l'affichage des boutons selon connexion dans le header
const token = localStorage.getItem('token');
const authButtons = document.getElementById('authButtons');

if (authButtons) {
    if (token) {
        authButtons.innerHTML = `
            <span id="userName" style="font-size: 0.875rem;"></span>
            <a href="dashboard.html" class="btn-nav btn-nav-primary">
                <i class="fas fa-user-circle"></i> Mon compte
            </a>
            <a href="chat.html" class="btn-nav btn-nav-outline btn-relative">
                <i class="fas fa-comment-dots"></i> Messages
                <span id="unreadBadge" class="unread-badge">0</span>
            </a>
            <button id="logoutHeaderBtn" class="btn-nav btn-nav-outline">
                <i class="fas fa-sign-out-alt"></i> Déconnexion
            </button>
        `;
        
        fetch('https://sama-marche.onrender.com/api/users/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(r => r.json())
        .then(data => {
            if (data.user) {
                const userNameSpan = document.getElementById('userName');
                if (userNameSpan) userNameSpan.textContent = data.user.full_name || data.user.email;
            }
        });
        
        const logoutBtn = document.getElementById('logoutHeaderBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            });
        }
    } else {
        authButtons.innerHTML = `
            <a href="login.html" class="btn-nav btn-nav-outline">
                <i class="fas fa-sign-in-alt"></i> Connexion
            </a>
            <a href="register.html" class="btn-nav btn-nav-primary">
                <i class="fas fa-user-plus"></i> Inscription
            </a>
        `;
    }
}