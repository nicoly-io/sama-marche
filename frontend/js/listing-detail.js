// Fallback pour API_URL (si non défini dans app.js)
if (typeof API_URL === 'undefined') {
    var API_URL = 'https://sama-marche.onrender.com/api';
}

// Récupérer l'ID depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const listingId = urlParams.get('id');

if (!listingId) {
    window.location.href = 'index.html';
}

// Variables globales
let currentListing = null;
let currentUserId = null;

// Récupérer le token et l'utilisateur
const authToken = localStorage.getItem('token');
try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        const user = JSON.parse(storedUser);
        currentUserId = user.id;
    }
} catch(e) {}

console.log('authToken présent:', !!authToken);
console.log('currentUserId:', currentUserId);

// Attendre que le DOM soit prêt
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM chargé');
    loadListing();
});

// Charger l'annonce
async function loadListing() {
    try {
        console.log('Chargement annonce ID:', listingId);
        const response = await fetch(`${API_URL}/listings/${listingId}`);
        const data = await response.json();
        currentListing = data.listing;
        
        console.log('Annonce chargée:', currentListing.title);
        console.log('user_id de l\'annonce:', currentListing.user_id);
        console.log('currentUserId:', currentUserId);
        
        displayListing();
        setupButtons();
        setupAuthButtons();
    } catch (error) {
        console.error('Erreur chargement:', error);
        document.querySelector('main').innerHTML = '<div class="text-center" style="padding: 3rem;">Erreur de chargement</div>';
    }
}

// Afficher l'annonce
function displayListing() {
    const price = currentListing.buyer_price;
    const formattedPrice = new Intl.NumberFormat('fr-SN').format(price) + ' FCFA';
    
    document.getElementById('listingTitle').textContent = currentListing.title;
    document.getElementById('listingDescription').textContent = currentListing.description || 'Aucune description';
    document.getElementById('listingPrice').textContent = formattedPrice;
    document.getElementById('buyerPrice').textContent = formattedPrice;
    document.getElementById('listingLocation').textContent = currentListing.quartier || 'Non spécifié';
    document.getElementById('listingDate').textContent = new Date(currentListing.created_at).toLocaleDateString();
    document.getElementById('listingViews').textContent = currentListing.views_count || 0;
    document.getElementById('sellerName').textContent = currentListing.user?.full_name || 'Anonyme';
    
    if (currentListing.user?.avatar_url && currentListing.user.avatar_url !== 'null') {
        const sellerAvatar = document.getElementById('sellerAvatar');
        sellerAvatar.src = currentListing.user.avatar_url;
        sellerAvatar.style.display = 'block';
    }
    
    if (currentListing.user?.badge_visible) {
        document.getElementById('sellerBadges').innerHTML = '<span class="listing-badge badge-verified">✓ Identité vérifiée</span>';
    }
    if (currentListing.is_boosted) {
        document.getElementById('badges').innerHTML = '<span class="listing-badge badge-boost">⚡ Boosté</span>';
    }
    
    if (currentListing.photos && currentListing.photos.length > 0) {
        document.getElementById('mainPhoto').src = currentListing.photos[0].url;
        const thumbnails = document.getElementById('thumbnails');
        thumbnails.innerHTML = '';
        currentListing.photos.forEach((photo, i) => {
            const img = document.createElement('img');
            img.src = photo.url;
            img.style.width = '60px';
            img.style.height = '60px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '8px';
            img.style.cursor = 'pointer';
            img.style.marginRight = '5px';
            img.style.border = i === 0 ? '2px solid #0D9488' : '1px solid #ccc';
            img.onclick = () => {
                document.getElementById('mainPhoto').src = photo.url;
                document.querySelectorAll('#thumbnails img').forEach(x => x.style.border = '1px solid #ccc');
                img.style.border = '2px solid #0D9488';
            };
            thumbnails.appendChild(img);
        });
    }
}

// Configurer les boutons
function setupButtons() {
    console.log('=== setupButtons ===');
    
    // Vérifier si les boutons existent dans le DOM
    const buyBtn = document.getElementById('buyNowBtn');
    const contactBtn = document.getElementById('contactSellerBtn');
    const shareBtn = document.getElementById('shareBtn');
    const reportBtn = document.getElementById('reportBtn');
    
    console.log('buyNowBtn trouvé:', !!buyBtn);
    console.log('contactSellerBtn trouvé:', !!contactBtn);
    console.log('shareBtn trouvé:', !!shareBtn);
    console.log('reportBtn trouvé:', !!reportBtn);
    
    const isOwner = (currentUserId && currentListing.user_id === currentUserId);
    console.log('Est propriétaire:', isOwner);
    console.log('currentUserId:', currentUserId);
    console.log('listing.user_id:', currentListing.user_id);
    
    // Bouton Acheter
    if (buyBtn) {
        if (isOwner) {
            buyBtn.style.display = 'none';
            console.log('Bouton acheter caché (propriétaire)');
        } else {
            buyBtn.style.display = 'block';
            buyBtn.onclick = function(e) {
                e.preventDefault();
                console.log('Clic sur Acheter - authToken:', !!authToken);
                if (!authToken) {
                    window.location.href = `login.html?redirect=checkout.html?id=${listingId}`;
                } else {
                    window.location.href = `checkout.html?id=${listingId}`;
                }
                return false;
            };
            console.log('Bouton acheter configuré');
        }
    } else {
        console.error('❌ buyNowBtn introuvable dans le DOM');
    }
    
    // Bouton Contacter
    if (contactBtn) {
        if (isOwner) {
            contactBtn.style.display = 'none';
            console.log('Bouton contacter caché (propriétaire)');
        } else {
            contactBtn.style.display = 'block';
            contactBtn.onclick = function(e) {
                e.preventDefault();
                console.log('Clic sur Contacter - authToken:', !!authToken);
                if (!authToken) {
                    window.location.href = `login.html?redirect=listing-detail.html?id=${listingId}`;
                } else {
                    window.location.href = `chat.html?listing=${listingId}`;
                }
                return false;
            };
            console.log('Bouton contacter configuré');
        }
    } else {
        console.error('❌ contactSellerBtn introuvable dans le DOM');
    }
    
    // Bouton Partager
    if (shareBtn) {
        shareBtn.onclick = function(e) {
            e.preventDefault();
            console.log('Clic sur Partager');
            if (navigator.share) {
                navigator.share({
                    title: currentListing.title,
                    url: window.location.href
                });
            } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Lien copié !');
            }
            return false;
        };
        console.log('Bouton partager configuré');
    } else {
        console.error('❌ shareBtn introuvable dans le DOM');
    }
    
    // Bouton Signaler
    if (reportBtn) {
        const reportModal = document.getElementById('reportModal');
        if (reportModal) {
            reportBtn.onclick = function(e) {
                e.preventDefault();
                console.log('Clic sur Signaler');
                reportModal.style.display = 'flex';
                return false;
            };
            
            const closeBtns = document.querySelectorAll('.close-modal, #cancelReportBtn');
            closeBtns.forEach(btn => {
                btn.onclick = function() {
                    reportModal.style.display = 'none';
                };
            });
            
            const submitBtn = document.getElementById('submitReportBtn');
            if (submitBtn) {
                submitBtn.onclick = function() {
                    alert('Signalement envoyé. Merci !');
                    reportModal.style.display = 'none';
                };
            }
            
            window.onclick = function(event) {
                if (event.target === reportModal) {
                    reportModal.style.display = 'none';
                }
            };
            console.log('Bouton signaler configuré');
        } else {
            console.error('❌ reportModal introuvable');
        }
    } else {
        console.error('❌ reportBtn introuvable dans le DOM');
    }
}

// Gérer l'affichage des boutons de connexion
function setupAuthButtons() {
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');
    
    if (authToken) {
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (loginBtn) loginBtn.style.display = 'none';
        
        fetch(`${API_URL}/users/profile`, {
            headers: { 'Authorization': 'Bearer ' + authToken }
        })
        .then(r => r.json())
        .then(data => {
            if (data.user && document.getElementById('userName')) {
                document.getElementById('userName').textContent = data.user.full_name || data.user.email;
            }
        })
        .catch(console.error);
    } else {
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-block';
    }
}