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
const token = localStorage.getItem('token');
try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        const user = JSON.parse(storedUser);
        currentUserId = user.id;
    }
} catch(e) {}

// Attendre que le DOM soit prêt
document.addEventListener('DOMContentLoaded', function() {
    loadListing();
    setupAuthButtons();
});

// Charger l'annonce
async function loadListing() {
    try {
        const response = await fetch(`http://localhost:5000/api/listings/${listingId}`);
        const data = await response.json();
        currentListing = data.listing;
        
        displayListing();
        setupButtons();
    } catch (error) {
        console.error('Erreur:', error);
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
    const isOwner = (currentUserId && currentListing.user_id === currentUserId);
    
    const buyBtn = document.getElementById('buyNowBtn');
    if (buyBtn) {
        if (isOwner) {
            buyBtn.style.display = 'none';
        } else {
            buyBtn.style.display = 'block';
            buyBtn.onclick = function(e) {
                e.preventDefault();
                if (!token) {
                    window.location.href = `login.html?redirect=checkout.html?id=${listingId}`;
                } else {
                    window.location.href = `checkout.html?id=${listingId}`;
                }
                return false;
            };
        }
    }
    
    // Bouton Contacter (MODIFICATION ICI)
    const contactBtn = document.getElementById('contactSellerBtn');
    if (contactBtn) {
        if (isOwner) {
            contactBtn.style.display = 'none';
        } else {
            contactBtn.style.display = 'block';
            contactBtn.onclick = function(e) {
                e.preventDefault();
                if (!token) {
                    window.location.href = `login.html?redirect=listing-detail.html?id=${listingId}`;
                } else {
                    // Redirection vers le chat avec l'ID de l'annonce
                    window.location.href = `chat.html?listing=${listingId}`;
                }
                return false;
            };
        }
    }
    
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.onclick = function(e) {
            e.preventDefault();
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
    }
    
    const reportBtn = document.getElementById('reportBtn');
    const reportModal = document.getElementById('reportModal');
    if (reportBtn && reportModal) {
        reportBtn.onclick = function(e) {
            e.preventDefault();
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
    }
}

// Gérer l'affichage des boutons de connexion
function setupAuthButtons() {
    const token = localStorage.getItem('token');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');
    
    if (token) {
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (loginBtn) loginBtn.style.display = 'none';
        
        fetch('http://localhost:5000/api/users/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(r => r.json())
        .then(data => {
            if (data.user && document.getElementById('userName')) {
                document.getElementById('userName').textContent = data.user.full_name || data.user.email;
            }
        });
    } else {
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-block';
    }
}