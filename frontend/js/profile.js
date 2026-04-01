// Charger le profil
async function loadProfile() {
    try {
        const data = await apiRequest('/users/profile');
        const user = data.user;
        
        document.getElementById('fullName').value = user.full_name || '';
        document.getElementById('email').value = user.email;
        document.getElementById('phone').value = user.phone;
        
        // Avatar
        if (user.avatar_url) {
            document.getElementById('avatar').style.backgroundImage = `url(${user.avatar_url})`;
        }
        
        // Badges
        const badgesDiv = document.getElementById('profileBadges');
        if (user.badge_visible) {
            badgesDiv.innerHTML = '<span class="listing-badge badge-verified">✓ Identité vérifiée</span>';
        }
        
        // CNI status
        const cniStatus = document.getElementById('cniStatus');
        if (user.is_cni_verified) {
            cniStatus.innerHTML = '✅ Identité vérifiée';
            cniStatus.style.background = '#D1FAE5';
            cniStatus.style.color = '#065F46';
        } else if (user.is_cni_submitted) {
            cniStatus.innerHTML = '⏳ Vérification en cours...';
            cniStatus.style.background = '#FEF3C7';
            cniStatus.style.color = '#92400E';
        } else {
            cniStatus.innerHTML = '❌ Non vérifié. Soumettez votre CNI pour obtenir le badge "Vérifié"';
            cniStatus.style.background = '#FEE2E2';
            cniStatus.style.color = '#991B1B';
            document.getElementById('cniFormContainer').style.display = 'block';
        }
        
        // Abonnement
        const subscriptionInfo = document.getElementById('subscriptionInfo');
        if (user.account_type === 'professional') {
            subscriptionInfo.innerHTML = `<span class="badge badge-pro">⭐ Compte Professionnel</span><br>Valable jusqu'au ${new Date(user.subscription_expires_at).toLocaleDateString()}`;
            document.getElementById('upgradeBtn').style.display = 'none';
        } else {
            subscriptionInfo.innerHTML = 'Compte gratuit. Débloquez des fonctionnalités premium.';
        }
        
        // Statistiques
        const stats = await apiRequest('/users/stats');
        document.getElementById('statsListings').textContent = stats.listings_count || 0;
        document.getElementById('statsSales').textContent = stats.sales_count || 0;
        document.getElementById('statsViews').textContent = stats.total_views || 0;
        
    } catch (error) {
        console.error('Erreur chargement profil:', error);
    }
}

// Mettre à jour le profil
document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('fullName').value;
    
    try {
        await apiRequest('/users/profile', {
            method: 'PUT',
            body: JSON.stringify({ full_name: fullName })
        });
        alert('Profil mis à jour');
    } catch (error) {
        alert('Erreur mise à jour');
    }
});

// Upload CNI
document.getElementById('cniUploadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const recto = document.getElementById('cniRecto').files[0];
    const verso = document.getElementById('cniVerso').files[0];
    
    if (!recto || !verso) {
        alert('Veuillez sélectionner recto et verso');
        return;
    }
    
    const formData = new FormData();
    const compressedRecto = await compressImage(recto);
    const compressedVerso = await compressImage(verso);
    formData.append('recto', compressedRecto);
    formData.append('verso', compressedVerso);
    
    try {
        await fetch(`${API_URL}/users/cni`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        alert('CNI soumise avec succès. En attente de validation.');
        location.reload();
    } catch (error) {
        alert('Erreur lors de la soumission');
    }
});

// Devenir professionnel
document.getElementById('upgradeBtn')?.addEventListener('click', async () => {
    window.location.href = 'subscription.html';
});

// Initialisation
if (requireAuth()) {
    loadProfile();
}