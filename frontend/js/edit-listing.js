// Récupérer l'ID depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const listingId = urlParams.get('id');

// Charger les données de l'annonce
async function loadListing() {
    if (!listingId) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    try {
        const data = await apiRequest(`/listings/${listingId}`);
        const listing = data.listing;
        
        document.getElementById('title').value = listing.title;
        document.getElementById('description').value = listing.description || '';
        document.getElementById('category').value = listing.category || 'other';
        document.getElementById('condition').value = listing.condition || 'good';
        document.getElementById('sellerPrice').value = listing.seller_price;
        document.getElementById('quartier').value = listing.quartier || '';
        document.getElementById('ville').value = listing.ville || 'Dakar';
        
    } catch (error) {
        console.error('Erreur:', error);
        window.location.href = 'dashboard.html';
    }
}

// Mettre à jour l'annonce
const editForm = document.getElementById('editListingForm');
if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            category: document.getElementById('category').value,
            condition: document.getElementById('condition').value,
            seller_price: parseInt(document.getElementById('sellerPrice').value),
            quartier: document.getElementById('quartier').value,
            ville: document.getElementById('ville').value
        };
        
        try {
            await apiRequest(`/listings/${listingId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            alert('Annonce modifiée avec succès');
            window.location.href = 'dashboard.html';
        } catch (error) {
            showMessage('errorMsg', error.message);
        }
    });
}

// Annuler
document.getElementById('cancelBtn')?.addEventListener('click', () => {
    window.location.href = 'dashboard.html';
});

// Initialisation
if (requireAuth()) {
    loadListing();
}