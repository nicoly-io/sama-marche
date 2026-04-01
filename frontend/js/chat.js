const urlParams = new URLSearchParams(window.location.search);
const listingId = urlParams.get('listing');
const conversationIdParam = urlParams.get('conversation');

let currentConversationId = null;
let currentUserId = null;

const token = localStorage.getItem('token');
try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        const user = JSON.parse(storedUser);
        currentUserId = user.id;
    }
} catch(e) {}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM chargé');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    setupSendButton();
    setupActionButtons();
    
    if (listingId) {
        await createOrGetConversationByListing(listingId);
    } else if (conversationIdParam) {
        currentConversationId = parseInt(conversationIdParam);
        await loadMessages(currentConversationId);
        await loadConversations();
    } else {
        await loadConversations();
    }
});

async function createOrGetConversationByListing(listingId) {
    try {
        const response = await fetch(`http://localhost:5000/api/chat/conversation/${listingId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.conversation) {
            currentConversationId = data.conversation.id;
            await loadMessages(currentConversationId);
            await loadConversations();
            highlightConversation(currentConversationId);
            await markAsRead(currentConversationId);
        } else {
            document.getElementById('chatMessages').innerHTML = `
                <div class="empty-state-chat">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Erreur</h4>
                    <p>${data.error || 'Impossible de créer la conversation'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

async function loadConversations() {
    try {
        const response = await fetch('http://localhost:5000/api/chat/conversations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('conversationsList');
        if (!container) return;
        
        if (!data.conversations || data.conversations.length === 0) {
            container.innerHTML = '<div class="text-center" style="padding: 2rem;">Aucune conversation</div>';
            return;
        }
        
        container.innerHTML = data.conversations.map(conv => {
            const otherName = conv.other_user?.full_name || 'Utilisateur';
            const initial = otherName.charAt(0).toUpperCase();
            const avatarUrl = conv.other_user?.avatar_url;
            const activeClass = currentConversationId === conv.id ? 'active' : '';
            const unreadCount = conv.unread_count || 0;
            
            return `
                <div class="conversation-item ${activeClass}" data-conv-id="${conv.id}">
                    <div class="conversation-avatar">
                        ${avatarUrl ? `<img src="${avatarUrl}" alt="${escapeHtml(otherName)}">` : `<span>${initial}</span>`}
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-name">${escapeHtml(otherName)}</div>
                        <div class="conversation-listing">${escapeHtml(conv.listing?.title || 'Annonce')}</div>
                    </div>
                    ${unreadCount > 0 ? `<div class="conversation-badge">${unreadCount}</div>` : ''}
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('.conversation-item').forEach(el => {
            el.addEventListener('click', async () => {
                currentConversationId = parseInt(el.dataset.convId);
                await loadMessages(currentConversationId);
                highlightConversation(currentConversationId);
                await markAsRead(currentConversationId);
            });
        });
        
    } catch (error) {
        console.error('Erreur chargement conversations:', error);
    }
}

function highlightConversation(convId) {
    document.querySelectorAll('.conversation-item').forEach(el => {
        if (parseInt(el.dataset.convId) === convId) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
}

async function loadMessages(conversationId) {
    try {
        const response = await fetch(`http://localhost:5000/api/chat/messages/${conversationId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('chatMessages');
        
        if (!data.messages || data.messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state-chat">
                    <i class="fas fa-comment-dots"></i>
                    <h4>💬 Commencez la discussion !</h4>
                    <p>Envoyez un message pour démarrer la conversation</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = data.messages.map(msg => {
            const isSent = msg.sender_id === currentUserId;
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="message ${isSent ? 'message-sent' : 'message-received'}">
                    ${escapeHtml(msg.message)}
                    <div class="message-time">${time}</div>
                </div>
            `;
        }).join('');
        container.scrollTop = container.scrollHeight;
        
    } catch (error) {
        console.error('Erreur chargement messages:', error);
        document.getElementById('chatMessages').innerHTML = `
            <div class="empty-state-chat">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Erreur de chargement</h4>
                <p>Veuillez réessayer plus tard</p>
            </div>
        `;
    }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) {
        return;
    }
    
    if (!currentConversationId) {
        alert('Veuillez sélectionner une conversation');
        return;
    }
    
    // Désactiver temporairement le bouton pour éviter les doublons
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.6';
    
    try {
        const response = await fetch(`http://localhost:5000/api/chat/message/${currentConversationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            input.value = '';
            await loadMessages(currentConversationId);
            await loadUnreadCount();
            // Recharger les conversations pour mettre à jour le dernier message
            await loadConversations();
        } else {
            alert(data.error || 'Erreur lors de l\'envoi');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur de connexion');
    } finally {
        sendBtn.disabled = false;
        sendBtn.style.opacity = '1';
        input.focus();
    }
}

async function markAsRead(conversationId) {
    try {
        await fetch(`http://localhost:5000/api/chat/mark-read/${conversationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        await loadUnreadCount();
        // Recharger les conversations pour mettre à jour le badge
        await loadConversations();
    } catch (error) {
        console.error('Erreur mark as read:', error);
    }
}

function setupSendButton() {
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

function setupActionButtons() {
    const attachBtn = document.getElementById('attachBtn');
    const emojiBtn = document.getElementById('emojiBtn');
    
    if (attachBtn) {
        attachBtn.addEventListener('click', () => {
            // Fonctionnalité à venir: ajout de pièces jointes
            alert('Fonctionnalité à venir : Ajout de pièces jointes');
        });
    }
    
    if (emojiBtn) {
        emojiBtn.addEventListener('click', () => {
            // Fonctionnalité à venir: sélecteur d'emojis
            alert('Fonctionnalité à venir : Sélecteur d\'emojis');
        });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
}

if (token) {
    fetch('http://localhost:5000/api/users/profile', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(r => r.json())
    .then(data => {
        if (data.user && document.getElementById('userName')) {
            document.getElementById('userName').textContent = data.user.full_name || data.user.email;
        }
    });
}