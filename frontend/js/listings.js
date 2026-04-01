// Charger les annonces sur la page d'accueil (uniquement celles des autres utilisateurs)
async function loadListings() {
    const container = document.getElementById('listingsContainer');
    if (!container) return;
    
    const search = document.getElementById('searchInput')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const sort = document.getElementById('sortSelect')?.value || 'recent';
    
    try {
        const params = new URLSearchParams({ search, category, sort, page: 1, limit: 20 });
        const data = await apiRequest(`/listings?${params}`);
        
        // Filtrer les annonces pour ne pas afficher celles de l'utilisateur connecté
        let listings = data.listings;
        if (currentUser) {
            listings = listings.filter(listing => listing.user_id !== currentUser.id);
        }
        
        if (listings.length === 0) {
            container.innerHTML = '<div class="text-center" style="grid-column: 1/-1; padding: 3rem;">Aucune annonce trouvée</div>';
            return;
        }
        
        container.innerHTML = listings.map(listing => {
            // Gérer l'avatar du vendeur
            const sellerAvatar = listing.user?.avatar_url && listing.user.avatar_url !== 'null' 
                ? `<img src="${listing.user.avatar_url}" class="avatar-small" alt="${escapeHtml(listing.user.full_name || 'Vendeur')}">`
                : `<div class="avatar-small" style="background: #E5E7EB; display: flex; align-items: center; justify-content: center;"><i class="fas fa-user" style="font-size: 12px; color: #9CA3AF;"></i></div>`;
            
            return `
                <div class="listing-card">
                    <img src="${listing.photos[0]?.url || 'assets/images/no-image.jpg'}" class="listing-image" alt="${escapeHtml(listing.title)}" loading="lazy">
                    <div class="listing-content">
                        <div class="flex items-center gap-1" style="flex-wrap: wrap; margin-bottom: 0.5rem;">
                            ${listing.user?.badge_visible ? '<span class="listing-badge badge-verified"><i class="fas fa-check-circle"></i> Vérifié</span>' : ''}
                            ${listing.is_boosted ? '<span class="listing-badge badge-boost"><i class="fas fa-bolt"></i> Boosté</span>' : ''}
                        </div>
                        <a href="listing-detail.html?id=${listing.id}" class="listing-title">${escapeHtml(listing.title)}</a>
                        <div class="listing-price">${formatPrice(listing.buyer_price)}</div>
                        <div class="listing-location">
                            <i class="fas fa-map-marker-alt"></i> ${escapeHtml(listing.quartier || 'Non spécifié')}${listing.ville ? `, ${listing.ville}` : ''}
                        </div>
                        <div class="seller-info">
                            ${sellerAvatar}
                            <span class="seller-name">${escapeHtml(listing.user?.full_name || 'Anonyme')}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = '<div class="text-center" style="grid-column: 1/-1; padding: 3rem;">Erreur de chargement</div>';
    }
}

// ============================================
// GESTION DE LA GÉOLOCALISATION
// ============================================

// Obtenir la position actuelle de l'utilisateur
async function getCurrentLocation() {
    const locationStatus = document.getElementById('locationStatus');
    const quartierInput = document.getElementById('quartier');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const getLocationBtn = document.getElementById('getLocationBtn');
    
    if (!navigator.geolocation) {
        alert('Votre navigateur ne supporte pas la géolocalisation');
        return;
    }
    
    // Afficher le statut de chargement
    locationStatus.style.display = 'flex';
    locationStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Récupération de votre position...';
    locationStatus.className = 'location-status';
    getLocationBtn.disabled = true;
    
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });
        
        const { latitude, longitude } = position.coords;
        
        // Stocker les coordonnées dans les champs cachés
        latitudeInput.value = latitude;
        longitudeInput.value = longitude;
        
        // Convertir les coordonnées en adresse (reverse geocoding)
        const address = await reverseGeocode(latitude, longitude);
        
        if (address) {
            quartierInput.value = address.quartier || address.ville || 'Quartier non trouvé';
            const villeInput = document.getElementById('ville');
            if (address.ville && villeInput) {
                villeInput.value = address.ville;
            }
            locationStatus.innerHTML = `<i class="fas fa-check-circle"></i> Position trouvée : ${address.quartier || address.ville || 'Localisation réussie'}`;
            locationStatus.classList.add('success');
        } else {
            locationStatus.innerHTML = `<i class="fas fa-check-circle"></i> Position enregistrée (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
            locationStatus.classList.add('success');
        }
        
        setTimeout(() => {
            locationStatus.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('Erreur de géolocalisation:', error);
        let errorMessage = 'Impossible de récupérer votre position';
        
        switch(error.code) {
            case 1:
                errorMessage = 'Vous avez refusé la géolocalisation. Activez-la pour utiliser cette fonctionnalité.';
                break;
            case 2:
                errorMessage = 'Position indisponible. Vérifiez votre connexion GPS.';
                break;
            case 3:
                errorMessage = 'Délai dépassé. Vérifiez votre connexion.';
                break;
        }
        
        locationStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${errorMessage}`;
        locationStatus.classList.add('error');
        getLocationBtn.disabled = false;
        
        setTimeout(() => {
            locationStatus.style.display = 'none';
            locationStatus.classList.remove('error');
        }, 5000);
    } finally {
        getLocationBtn.disabled = false;
    }
}

// Reverse geocoding pour obtenir le quartier à partir des coordonnées
async function reverseGeocode(latitude, longitude) {
    try {
        // Utilisation de l'API Nominatim d'OpenStreetMap (gratuite)
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18&accept-language=fr`);
        const data = await response.json();
        
        if (data && data.address) {
            const address = data.address;
            return {
                quartier: address.suburb || address.neighbourhood || address.hamlet || address.village,
                ville: address.city || address.town || address.state_district || 'Dakar',
                pays: address.country,
                fullAddress: data.display_name
            };
        }
        return null;
    } catch (error) {
        console.error('Erreur reverse geocoding:', error);
        return null;
    }
}

// Initialiser le bouton de géolocalisation
function initGeolocation() {
    const getLocationBtn = document.getElementById('getLocationBtn');
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', getCurrentLocation);
    }
}

// ============================================
// GESTION DU FORMULAIRE DE DÉPÔT D'ANNONCE
// ============================================

let selectedFiles = [];
let filePreviews = [];

// Initialiser les chips pour l'état
function initConditionChips() {
    const chips = document.querySelectorAll('.chip');
    const conditionInput = document.getElementById('condition');
    
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Retirer la classe active de tous les chips
            chips.forEach(c => c.classList.remove('active'));
            // Ajouter la classe active au chip cliqué
            chip.classList.add('active');
            // Mettre à jour la valeur du champ hidden
            const conditionValue = chip.dataset.condition;
            if (conditionInput) conditionInput.value = conditionValue;
        });
    });
}

// Initialiser la zone de drop photos
function initPhotoDropzone() {
    const dropzone = document.getElementById('photoDropzone');
    const fileInput = document.getElementById('photos');
    const previewContainer = document.getElementById('previewPhotos');
    const photoHelp = document.getElementById('photoHelp');
    
    if (!dropzone || !fileInput) return;
    
    // Clic sur la zone → ouvrir le sélecteur de fichiers
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Sélection de fichiers
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    });
    
    // Drag & drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        handleFiles(files);
    });
}

// Gérer les fichiers sélectionnés
async function handleFiles(files) {
    const maxFiles = 5;
    const currentCount = selectedFiles.length;
    const remainingSlots = maxFiles - currentCount;
    
    if (files.length > remainingSlots) {
        alert(`Vous ne pouvez ajouter que ${remainingSlots} photo(s) supplémentaire(s). Maximum ${maxFiles} photos.`);
        files = files.slice(0, remainingSlots);
    }
    
    for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
            alert(`La photo ${file.name} dépasse 5 Mo et ne sera pas ajoutée.`);
            continue;
        }
        
        selectedFiles.push(file);
        
        // Créer un aperçu
        const reader = new FileReader();
        reader.onload = (e) => {
            filePreviews.push(e.target.result);
            updatePhotoPreview();
        };
        reader.readAsDataURL(file);
    }
    
    // Mettre à jour le file input
    updateFileInput();
}

// Mettre à jour l'aperçu des photos
function updatePhotoPreview() {
    const previewContainer = document.getElementById('previewPhotos');
    if (!previewContainer) return;
    
    if (filePreviews.length === 0) {
        previewContainer.innerHTML = '';
        return;
    }
    
    previewContainer.innerHTML = filePreviews.map((preview, index) => `
        <div class="photo-preview-item" data-index="${index}">
            <img src="${preview}" alt="Aperçu ${index + 1}">
            <button type="button" class="remove-photo" onclick="removePhoto(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    // Mettre à jour l'aide
    const photoHelp = document.getElementById('photoHelp');
    if (photoHelp) {
        const remaining = 5 - filePreviews.length;
        photoHelp.innerHTML = `<i class="fas fa-info-circle"></i> ${filePreviews.length}/5 photos. ${remaining > 0 ? `Encore ${remaining} photo(s) possible(s).` : 'Maximum atteint.'}`;
    }
}

// Supprimer une photo
window.removePhoto = function(index) {
    if (index >= 0 && index < selectedFiles.length) {
        selectedFiles.splice(index, 1);
        filePreviews.splice(index, 1);
        updatePhotoPreview();
        updateFileInput();
    }
};

// Mettre à jour le file input avec les fichiers restants
function updateFileInput() {
    const fileInput = document.getElementById('photos');
    if (!fileInput) return;
    
    // Créer un nouveau DataTransfer pour mettre à jour les fichiers
    const dataTransfer = new DataTransfer();
    selectedFiles.forEach(file => {
        dataTransfer.items.add(file);
    });
    fileInput.files = dataTransfer.files;
}

// Créer une annonce (version modifiée pour utiliser les fichiers et la géolocalisation)
const listingForm = document.getElementById('listingForm');
if (listingForm) {
    // Initialiser les chips
    initConditionChips();
    
    // Initialiser la zone de drop
    initPhotoDropzone();
    
    // Initialiser la géolocalisation
    initGeolocation();
    
    listingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Vous devez être connecté');
            window.location.href = 'login.html';
            return;
        }
        
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const category = document.getElementById('category').value;
        const condition = document.getElementById('condition').value;
        const sellerPrice = document.getElementById('sellerPrice').value;
        const quartier = document.getElementById('quartier').value;
        const ville = document.getElementById('ville').value;
        const latitude = document.getElementById('latitude')?.value;
        const longitude = document.getElementById('longitude')?.value;
        
        if (!title || !sellerPrice || !quartier) {
            showMessage('errorMsg', 'Veuillez remplir tous les champs obligatoires');
            return;
        }
        
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('condition', condition);
        formData.append('seller_price', sellerPrice);
        formData.append('quartier', quartier);
        formData.append('ville', ville);
        
        // Ajouter les coordonnées GPS si disponibles
        if (latitude && longitude) {
            formData.append('latitude', latitude);
            formData.append('longitude', longitude);
        }
        
        // Ajouter les photos avec compression
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            try {
                const compressed = await compressImage(file);
                formData.append('photos', compressed);
            } catch (error) {
                console.error('Erreur compression:', error);
                formData.append('photos', file);
            }
        }
        
        try {
            const response = await fetch(`${API_URL}/listings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const data = await response.json();
            if (response.ok) {
                alert('Annonce publiée avec succès !');
                window.location.href = 'dashboard.html';
            } else {
                showMessage('errorMsg', data.error || 'Erreur lors de la publication');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showMessage('errorMsg', 'Erreur de connexion');
        }
    });
}

// Fonction utilitaire pour échapper le HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialisation page accueil
if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    loadListings();
    
    document.getElementById('searchBtn')?.addEventListener('click', loadListings);
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadListings();
    });
    document.getElementById('categoryFilter')?.addEventListener('change', loadListings);
    document.getElementById('sortSelect')?.addEventListener('change', loadListings);
}