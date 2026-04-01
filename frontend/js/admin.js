// Vérifier que l'utilisateur est admin
async function checkAdminAccess() {
    try {
        const data = await apiRequest('/users/profile');
        if (data.user.account_type !== 'admin') {
            window.location.href = 'index.html';
            return false;
        }
        document.getElementById('adminName').textContent = data.user.full_name || data.user.email;
        return true;
    } catch (error) {
        window.location.href = 'login.html';
        return false;
    }
}

// Charger les statistiques
async function loadStats() {
    try {
        const data = await apiRequest('/admin/stats');
        
        document.getElementById('totalUsers').textContent = data.stats.users.total;
        document.getElementById('verifiedUsers').textContent = data.stats.users.verified;
        document.getElementById('totalListings').textContent = data.stats.listings.total;
        document.getElementById('activeListings').textContent = data.stats.listings.active;
        document.getElementById('totalEscrow').textContent = formatPrice(data.stats.transactions.total_escrow);
        document.getElementById('totalFees').textContent = formatPrice(data.stats.transactions.total_fees);
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
}

// Charger les CNI en attente
async function loadPendingCNI() {
    const container = document.getElementById('pendingCNI');
    if (!container) return;
    
    try {
        const data = await apiRequest('/admin/cni-pending');
        
        if (data.cnis.length === 0) {
            container.innerHTML = '<div class="text-center" style="padding: 2rem;">Aucune demande en attente</div>';
            return;
        }
        
        container.innerHTML = data.cnis.map(cni => `
            <div class="card" style="margin-bottom: 1rem;">
                <div class="card-body">
                    <div class="flex justify-between items-center">
                        <div>
                            <strong>${cni.user?.full_name || 'Nom inconnu'}</strong>
                            <p class="text-sm text-gray-500">${cni.user?.email} | ${cni.user?.phone}</p>
                            <p class="text-xs text-gray-400">Soumis le: ${new Date(cni.created_at).toLocaleDateString()}</p>
                        </div>
                        <button onclick="viewCNI(${cni.id}, '${cni.recto_path}', '${cni.verso_path}')" class="btn btn-primary btn-sm">Voir CNI</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="text-center">Erreur de chargement</div>';
    }
}

// Voir la CNI dans le modal
let currentCNIId = null;

function viewCNI(id, rectoPath, versoPath) {
    currentCNIId = id;
    // TODO: Construire l'URL réelle de la CNI (nécessite endpoint admin pour récupérer l'image signée)
    document.getElementById('cniRectoImg').src = `${API_URL}/admin/cni/${id}/recto?token=${authToken}`;
    document.getElementById('cniVersoImg').src = `${API_URL}/admin/cni/${id}/verso?token=${authToken}`;
    document.getElementById('cniModal').classList.add('active');
}

// Approuver CNI
document.getElementById('approveCniBtn')?.addEventListener('click', async () => {
    if (!currentCNIId) return;
    
    try {
        await apiRequest(`/admin/cni/${currentCNIId}`, {
            method: 'PUT',
            body: JSON.stringify({ action: 'approve' })
        });
        document.getElementById('cniModal').classList.remove('active');
        loadPendingCNI();
        loadStats();
    } catch (error) {
        alert('Erreur lors de la validation');
    }
});

// Rejeter CNI
document.getElementById('rejectCniBtn')?.addEventListener('click', async () => {
    if (!currentCNIId) return;
    
    const rejectionReason = document.getElementById('rejectionReason').value;
    
    try {
        await apiRequest(`/admin/cni/${currentCNIId}`, {
            method: 'PUT',
            body: JSON.stringify({ action: 'reject', rejection_reason: rejectionReason })
        });
        document.getElementById('cniModal').classList.remove('active');
        document.getElementById('rejectionReason').value = '';
        loadPendingCNI();
        loadStats();
    } catch (error) {
        alert('Erreur lors du rejet');
    }
});

// Fermer modal
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('cniModal').classList.remove('active');
    });
});

// Charger les litiges
async function loadDisputes() {
    const container = document.getElementById('pendingDisputes');
    if (!container) return;
    
    try {
        const data = await apiRequest('/admin/disputes');
        
        if (data.disputes.length === 0) {
            container.innerHTML = '<div class="text-center" style="padding: 2rem;">Aucun litige en attente</div>';
            return;
        }
        
        container.innerHTML = data.disputes.map(dispute => `
            <div class="card" style="margin-bottom: 1rem;">
                <div class="card-body">
                    <div class="flex justify-between">
                        <strong>Transaction #${dispute.id}</strong>
                        <span class="badge badge-danger">Litige</span>
                    </div>
                    <p><strong>Article:</strong> ${dispute.listings?.title || 'Inconnu'}</p>
                    <p><strong>Acheteur:</strong> ${dispute.buyer?.full_name} (${dispute.buyer?.phone})</p>
                    <p><strong>Vendeur:</strong> ${dispute.seller?.full_name} (${dispute.seller?.phone})</p>
                    <p><strong>Raison:</strong> ${dispute.dispute_reason}</p>
                    <p><strong>Montant:</strong> ${formatPrice(dispute.amount_total)} FCFA</p>
                    <div class="flex gap-2" style="margin-top: 1rem;">
                        <button onclick="resolveDispute(${dispute.id}, 'refund')" class="btn btn-danger btn-sm">Rembourser acheteur</button>
                        <button onclick="resolveDispute(${dispute.id}, 'pay')" class="btn btn-primary btn-sm">Payer vendeur</button>
                        <button onclick="resolveDispute(${dispute.id}, 'cancel')" class="btn btn-outline btn-sm">Annuler</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="text-center">Erreur de chargement</div>';
    }
}

// Résoudre un litige
async function resolveDispute(transactionId, resolution) {
    let refundToBuyer = false;
    let paySeller = false;
    
    if (resolution === 'refund') refundToBuyer = true;
    if (resolution === 'pay') paySeller = true;
    
    if (!confirm('Confirmer cette décision ?')) return;
    
    try {
        await apiRequest(`/admin/dispute/${transactionId}`, {
            method: 'PUT',
            body: JSON.stringify({ resolution, refund_to_buyer: refundToBuyer, pay_seller: paySeller })
        });
        loadDisputes();
        loadStats();
    } catch (error) {
        alert('Erreur lors de la résolution');
    }
}

// Bloquer un utilisateur
async function blockUser(userId) {
    if (!confirm('Bloquer définitivement cet utilisateur ?')) return;
    
    try {
        await apiRequest(`/admin/block-user/${userId}`, { method: 'PUT' });
        loadUsers();
    } catch (error) {
        alert('Erreur lors du blocage');
    }
}

// Charger les utilisateurs
async function loadUsers() {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    try {
        const data = await apiRequest('/admin/users'); // Endpoint à créer
        container.innerHTML = data.users.map(user => `
            <div class="card" style="margin-bottom: 0.5rem;">
                <div class="card-body">
                    <div class="flex justify-between items-center">
                        <div>
                            <strong>${user.full_name || user.email}</strong>
                            <p class="text-sm">${user.phone} | ${user.email}</p>
                            <p class="text-xs">Inscrit: ${new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <span class="badge ${user.status === 'active' ? 'badge-success' : 'badge-danger'}">${user.status}</span>
                            <button onclick="blockUser(${user.id})" class="btn btn-danger btn-sm">Bloquer</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="text-center">Erreur de chargement</div>';
    }
}

// Gestion des tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
        
        btn.classList.add('active');
        document.getElementById(`${tab}Tab`).style.display = 'block';
        
        // Charger les données selon l'onglet
        if (tab === 'cni') loadPendingCNI();
        if (tab === 'disputes') loadDisputes();
        if (tab === 'users') loadUsers();
    });
});

// Initialisation
if (window.location.pathname.includes('admin.html')) {
    (async () => {
        const isAdmin = await checkAdminAccess();
        if (isAdmin) {
            loadStats();
            loadPendingCNI();
            loadDisputes();
        }
    })();
}