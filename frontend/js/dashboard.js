// Fonction pour formater les prix
function formatPrice(price) {
    return new Intl.NumberFormat('fr-SN').format(price) + ' FCFA';
}

// Charger le profil utilisateur
async function loadProfile() {
    try {
        const data = await apiRequest('/users/profile');
        const user = data.user;
        
        console.log('Profil complet:', user);
        
        // Récupérer l'avatar
        const avatar = user.avatarUrl || user.avatar_url;
        console.log('Avatar URL:', avatar);
        
        // Afficher les infos texte
        const profileFullName = document.getElementById('profileFullName');
        const profileEmail = document.getElementById('profileEmail');
        const profilePhoneInput = document.getElementById('profilePhoneInput');
        const profileName = document.getElementById('profileName');
        const profilePhoneSpan = document.getElementById('profilePhoneSpan');
        
        if (profileFullName) profileFullName.value = user.full_name || '';
        if (profileEmail) profileEmail.value = user.email;
        if (profilePhoneInput) profilePhoneInput.value = user.phone;
        if (profileName) profileName.textContent = user.full_name || user.email;
        if (profilePhoneSpan) profilePhoneSpan.textContent = user.phone;
        
        // Afficher l'avatar
        const avatarDiv = document.getElementById('avatar');
        if (avatarDiv) {
            if (avatar && avatar !== 'null' && avatar.length > 100) {
                avatarDiv.style.backgroundImage = `url("${avatar}")`;
                avatarDiv.style.backgroundSize = 'cover';
                avatarDiv.style.backgroundPosition = 'center';
                avatarDiv.style.backgroundColor = 'transparent';
                console.log('Avatar affiché avec succès');
            } else {
                avatarDiv.style.backgroundImage = 'none';
                avatarDiv.style.backgroundColor = 'var(--gray-200)';
                console.log('Aucun avatar trouvé');
            }
        }
        
        // Badges
        const badgesDiv = document.getElementById('profileBadges');
        if (badgesDiv) {
            if (user.badge_visible) {
                badgesDiv.innerHTML = '<span class="listing-badge badge-verified"><i class="fas fa-check-circle"></i> Identité vérifiée</span>';
            } else {
                badgesDiv.innerHTML = '';
            }
        }
        
        // CNI status
        const cniStatus = document.getElementById('cniStatus');
        const cniFormElem = document.getElementById('cniForm');
        
        if (cniStatus) {
            if (user.is_cni_verified) {
                cniStatus.innerHTML = '<i class="fas fa-check-circle"></i> Identité vérifiée';
                cniStatus.style.background = '#D1FAE5';
                cniStatus.style.color = '#065F46';
                if (cniFormElem) cniFormElem.style.display = 'none';
            } else if (user.is_cni_submitted) {
                cniStatus.innerHTML = '<i class="fas fa-clock"></i> Vérification en cours...';
                cniStatus.style.background = '#FEF3C7';
                cniStatus.style.color = '#92400E';
                if (cniFormElem) cniFormElem.style.display = 'none';
            } else {
                cniStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Non vérifié. Soumettez votre CNI pour obtenir le badge "Vérifié"';
                cniStatus.style.background = '#FEE2E2';
                cniStatus.style.color = '#991B1B';
                if (cniFormElem) cniFormElem.style.display = 'block';
            }
        }
        
        // Mettre à jour les statistiques
        updateUserStats(user);
        
    } catch (error) {
        console.error('Erreur chargement profil:', error);
    }
}

// Mettre à jour les statistiques utilisateur
async function updateUserStats(user) {
    try {
        // Récupérer les stats des annonces
        const listingsData = await apiRequest('/users/listings');
        const transactionsData = await apiRequest('/users/transactions');
        
        const totalListings = listingsData.listings?.length || 0;
        const totalSales = transactionsData.transactions?.filter(tx => tx.status === 'completed').length || 0;
        
        const statListings = document.getElementById('statListings');
        const statSales = document.getElementById('statSales');
        
        if (statListings) statListings.textContent = totalListings;
        if (statSales) statSales.textContent = totalSales;
        
    } catch (error) {
        console.error('Erreur chargement stats:', error);
        const statListings = document.getElementById('statListings');
        const statSales = document.getElementById('statSales');
        if (statListings) statListings.textContent = '0';
        if (statSales) statSales.textContent = '0';
    }
}

// Charger les annonces de l'utilisateur
async function loadUserListings() {
    const container = document.getElementById('userListings');
    if (!container) return;
    
    try {
        const data = await apiRequest('/users/listings');
        
        if (data.listings.length === 0) {
            container.innerHTML = `
                <div class="empty-state-visual">
                    <div class="empty-state-content">
                        <div class="empty-state-image">
                            <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="40" y="60" width="120" height="100" rx="10" fill="#0D9488" fill-opacity="0.2"/>
                                <rect x="55" y="75" width="90" height="70" rx="8" fill="#0D9488" fill-opacity="0.4"/>
                                <rect x="70" y="90" width="60" height="40" rx="5" fill="#0D9488"/>
                                <circle cx="100" cy="170" r="15" fill="#F59E0B"/>
                                <circle cx="70" cy="170" r="12" fill="#F59E0B" fill-opacity="0.6"/>
                                <circle cx="130" cy="170" r="12" fill="#F59E0B" fill-opacity="0.6"/>
                                <path d="M85 110 L100 95 L115 110" stroke="white" stroke-width="2" fill="none"/>
                                <circle cx="80" cy="105" r="3" fill="white"/>
                                <circle cx="120" cy="105" r="3" fill="white"/>
                            </svg>
                        </div>
                        <div class="empty-state-text">
                            <h3>✨ Votre vitrine est prête à briller !</h3>
                            <p>Vous n'avez pas encore d'annonces. C'est le moment idéal pour commencer à vendre sur Sama-Marche et rejoindre notre communauté de confiance.</p>
                            <div class="empty-state-features">
                                <div class="feature">
                                    <i class="fas fa-shield-alt"></i>
                                    <span>Paiement sécurisé</span>
                                </div>
                                <div class="feature">
                                    <i class="fas fa-users"></i>
                                    <span>Communauté active</span>
                                </div>
                                <div class="feature">
                                    <i class="fas fa-rocket"></i>
                                    <span>Mise en ligne rapide</span>
                                </div>
                            </div>
                            <a href="new-listing.html" class="btn-gradient btn-large">
                                <i class="fas fa-plus-circle"></i> Créer ma première annonce
                            </a>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.listings.map(listing => `
            <div class="listing-card">
                ${listing.photos && listing.photos[0] ? `<img src="${listing.photos[0].url}" class="listing-image" alt="${escapeHtml(listing.title)}">` : '<div class="listing-image" style="background: linear-gradient(135deg, #0D9488 0%, #0F766E 100%); display: flex; align-items: center; justify-content: center;"><i class="fas fa-image" style="color: white; font-size: 2rem;"></i></div>'}
                <div class="listing-content">
                    <div class="flex justify-between items-start">
                        <a href="listing-detail.html?id=${listing.id}" class="listing-title">${escapeHtml(listing.title)}</a>
                        <span class="listing-price">${formatPrice(listing.buyer_price)}</span>
                    </div>
                    <div class="listing-location">
                        <i class="fas fa-map-marker-alt"></i> ${escapeHtml(listing.quartier || 'Non spécifié')}
                    </div>
                    <div class="listing-status" style="margin-top: 0.5rem;">
                        <span class="badge badge-${listing.status}">${listing.status === 'active' ? 'Active' : listing.status}</span>
                    </div>
                    <div class="flex gap-2" style="margin-top: 0.75rem;">
                        <button onclick="editListing(${listing.id})" class="btn btn-outline btn-sm"><i class="fas fa-edit"></i> Modifier</button>
                        <button onclick="deleteListing(${listing.id})" class="btn btn-danger btn-sm"><i class="fas fa-trash"></i> Supprimer</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erreur chargement annonces:', error);
        container.innerHTML = '<div class="empty-state-visual"><div class="empty-state-content"><i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger);"></i><h3>Erreur de chargement</h3><p>Veuillez réessayer plus tard.</p></div></div>';
    }
}

// Charger les transactions
async function loadUserTransactions() {
    const container = document.getElementById('userTransactions');
    if (!container) return;
    
    try {
        const data = await apiRequest('/users/transactions');
        
        if (data.transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state-visual">
                    <div class="empty-state-content">
                        <div class="empty-state-image">
                            <i class="fas fa-exchange-alt" style="font-size: 5rem; color: var(--primary); opacity: 0.5;"></i>
                        </div>
                        <div class="empty-state-text">
                            <h3>📦 Aucune transaction</h3>
                            <p>Vos achats et ventes apparaîtront ici dès que vous effectuerez une transaction.</p>
                            <a href="index.html" class="btn-gradient">
                                <i class="fas fa-shopping-bag"></i> Découvrir les annonces
                            </a>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.transactions.map(tx => {
            let statusClass = '';
            let statusIcon = '';
            switch(tx.status) {
                case 'completed': statusClass = 'badge-success'; statusIcon = '<i class="fas fa-check-circle"></i>'; break;
                case 'pending_payment': statusClass = 'badge-warning'; statusIcon = '<i class="fas fa-clock"></i>'; break;
                case 'disputed': statusClass = 'badge-danger'; statusIcon = '<i class="fas fa-gavel"></i>'; break;
                default: statusClass = 'badge-info'; statusIcon = '<i class="fas fa-info-circle"></i>';
            }
            return `
                <div class="card transaction-card" style="margin-bottom: 1rem;">
                    <div class="card-body">
                        <div class="flex justify-between items-center">
                            <strong><i class="fas fa-tag"></i> ${escapeHtml(tx.listings?.title || 'Article')}</strong>
                            <span class="${statusClass}">${statusIcon} ${tx.status}</span>
                        </div>
                        <div class="transaction-details" style="margin-top: 0.5rem;">
                            <div><i class="fas fa-money-bill-wave"></i> Montant: ${formatPrice(tx.amount_total)}</div>
                            <div><i class="fas fa-calendar-alt"></i> Date: ${new Date(tx.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erreur chargement transactions:', error);
        container.innerHTML = '<div class="empty-state-visual"><div class="empty-state-content"><i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger);"></i><h3>Erreur de chargement</h3><p>Veuillez réessayer plus tard.</p></div></div>';
    }
}

// Modifier une annonce
window.editListing = function(id) {
    window.location.href = `edit-listing.html?id=${id}`;
};

// Supprimer une annonce
window.deleteListing = async function(id) {
    if (!confirm('Supprimer cette annonce ?')) return;
    
    try {
        await apiRequest(`/listings/${id}`, { method: 'DELETE' });
        loadUserListings();
        updateUserStats();
    } catch (error) {
        alert('Erreur de suppression');
    }
};

// Mettre à jour le profil
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('profileFullName').value;
        
        try {
            await apiRequest('/users/profile', {
                method: 'PUT',
                body: JSON.stringify({ full_name: fullName })
            });
            alert('Profil mis à jour');
            loadProfile();
        } catch (error) {
            alert('Erreur mise à jour');
        }
    });
}

// Upload CNI
const cniFormElem = document.getElementById('cniForm');
if (cniFormElem) {
    cniFormElem.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const recto = document.getElementById('cniRecto').files[0];
        const verso = document.getElementById('cniVerso').files[0];
        
        if (!recto || !verso) {
            alert('Veuillez sélectionner recto et verso');
            return;
        }
        
        const formData = new FormData();
        formData.append('recto', recto);
        formData.append('verso', verso);
        
        try {
            const response = await fetch(`${API_URL}/users/cni`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${authToken}` },
                body: formData
            });
            const data = await response.json();
            if (response.ok) {
                alert('CNI soumise avec succès. En attente de validation.');
                loadProfile();
            } else {
                alert(data.error || 'Erreur lors de la soumission');
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la soumission');
        }
    });
}

// Gestion des onglets
document.querySelectorAll('[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        
        // Mettre à jour la classe active sur les liens
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Afficher le bon onglet
        document.querySelectorAll('.tab-pane').forEach(pane => pane.style.display = 'none');
        const activeTab = document.getElementById(`${tab}Tab`);
        if (activeTab) activeTab.style.display = 'block';
        
        // Charger les données
        if (tab === 'listings') loadUserListings();
        if (tab === 'transactions') loadUserTransactions();
        if (tab === 'profile') loadProfile();
        if (tab === 'cni') loadProfile();
    });
});

// Fonction utilitaire pour échapper le HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialisation
if (requireAuth()) {
    loadProfile();
    loadUserListings();
    loadUserTransactions();
}