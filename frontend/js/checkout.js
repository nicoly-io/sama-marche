// Variables
let currentListing = null;
let transactionId = null;

// Récupérer l'ID de l'annonce depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const listingId = urlParams.get('id');

// Fonction pour formater les prix
function formatPrice(price) {
    return new Intl.NumberFormat('fr-SN').format(price) + ' FCFA';
}

// Charger les infos de l'annonce
async function loadListing() {
    if (!listingId) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const data = await apiRequest(`/listings/${listingId}`);
        currentListing = data.listing;
        
        console.log('Annonce chargée:', currentListing);
        
        // Afficher les infos
        document.getElementById('itemTitle').textContent = currentListing.title;
        document.getElementById('sellerPrice').textContent = formatPrice(currentListing.seller_price);
        document.getElementById('fees').textContent = formatPrice(currentListing.platform_fee_total);
        document.getElementById('totalPrice').textContent = formatPrice(currentListing.buyer_price);
        
        document.getElementById('payBtn').disabled = false;
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('errorMsg', 'Erreur chargement de l\'annonce');
    }
}

// Paiement
document.getElementById('payBtn').addEventListener('click', async () => {
    try {
        // Afficher un message de chargement
        const payBtn = document.getElementById('payBtn');
        const originalText = payBtn.innerHTML;
        payBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Préparation du paiement...';
        payBtn.disabled = true;
        
        const data = await apiRequest('/transactions/initiate', {
            method: 'POST',
            body: JSON.stringify({ listingId: listingId })
        });
        
        transactionId = data.transaction_id;
        
        console.log('Transaction créée:', transactionId);
        console.log('Redirection vers:', data.payment_url);
        
        // Rediriger vers PayTech
        window.location.href = data.payment_url;
    } catch (error) {
        console.error('Erreur paiement:', error);
        showMessage('errorMsg', error.message || 'Erreur lors de l\'initialisation du paiement');
        
        // Réactiver le bouton
        const payBtn = document.getElementById('payBtn');
        payBtn.innerHTML = '<i class="fas fa-credit-card"></i> Payer maintenant';
        payBtn.disabled = false;
    }
});

// Vérifier que l'utilisateur est connecté
if (!authToken) {
    window.location.href = `login.html?redirect=checkout.html?id=${listingId}`;
} else {
    loadListing();
}