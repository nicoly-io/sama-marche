// Configuration API
const API_URL = 'https://sama-marche.onrender.com/api';

// Stockage du token JWT
let authToken = localStorage.getItem('token');
let currentUser = null;

try {
    const storedUser = localStorage.getItem('user');
    if (storedUser && storedUser !== 'undefined') {
        currentUser = JSON.parse(storedUser);
    }
} catch(e) {
    currentUser = null;
}

async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Erreur serveur');
    }
    
    return data;
}

function formatPrice(price) {
    return new Intl.NumberFormat('fr-SN').format(price) + ' FCFA';
}

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

function requireAuth() {
    if (!authToken) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    window.location.href = 'index.html';
}

async function loadUserProfile() {
    try {
        const data = await apiRequest('/users/profile');
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = currentUser.full_name || currentUser.email;
        }
        
        return currentUser;
    } catch (error) {
        console.error('Erreur chargement profil:', error);
        return null;
    }
}

// Charger le nombre de messages non lus
async function loadUnreadCount() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_URL}/chat/conversations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            console.warn('Erreur chargement conversations:', response.status);
            return;
        }
        
        const data = await response.json();
        
        let totalUnread = 0;
        if (data.conversations && Array.isArray(data.conversations)) {
            totalUnread = data.conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
        }
        
        const badge = document.getElementById('unreadBadge');
        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Erreur chargement messages non lus:', error);
    }
}

// ============================================
// MODE SOMBRE (DARK MODE)
// ============================================

// Initialiser le mode sombre
function initDarkMode() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        if (themeToggle) themeToggle.textContent = '🌙';
    }
}

// Basculer le mode
function toggleDarkMode() {
    const themeToggle = document.getElementById('themeToggle');
    
    if (document.body.classList.contains('dark-mode')) {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if (themeToggle) themeToggle.textContent = '🌙';
    } else {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (themeToggle) themeToggle.textContent = '☀️';
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    // Initialiser le mode sombre
    initDarkMode();
    
    // Bouton de déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Bouton thème
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleDarkMode);
    }
    
    if (authToken && window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') {
        await loadUserProfile();
        await loadUnreadCount();
        setInterval(loadUnreadCount, 30000);
    }
});