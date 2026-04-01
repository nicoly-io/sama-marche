const supabase = require('../config/supabase');

// Obtenir ou créer une conversation
const getOrCreateConversation = async (req, res) => {
    try {
        const { listingId } = req.params;
        const userId = req.user.id;
        
        console.log('=== getOrCreateConversation ===');
        console.log('listingId:', listingId);
        console.log('userId:', userId);
        
        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .select('user_id, title')
            .eq('id', listingId)
            .single();
        
        if (listingError || !listing) {
            return res.status(404).json({ error: 'Annonce non trouvée' });
        }
        
        const sellerId = listing.user_id;
        
        if (parseInt(userId) === parseInt(sellerId)) {
            return res.status(400).json({ error: 'Vous ne pouvez pas discuter avec vous-même' });
        }
        
        let { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .eq('buyer_id', userId)
            .eq('seller_id', sellerId)
            .maybeSingle();
        
        if (convError) {
            console.error('Conversation search error:', convError);
        }
        
        if (!conversation) {
            console.log('Création d\'une nouvelle conversation...');
            
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert({
                    listing_id: parseInt(listingId),
                    buyer_id: userId,
                    seller_id: sellerId,
                    last_message_at: new Date()
                })
                .select()
                .single();
            
            if (createError) {
                console.error('Create conversation error:', createError);
                return res.status(500).json({ error: 'Erreur lors de la création de la conversation: ' + createError.message });
            }
            conversation = newConv;
            console.log('Conversation créée:', conversation);
        }
        
        res.json({ success: true, conversation });
        
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de la conversation' });
    }
};

// Récupérer les messages
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('buyer_id, seller_id')
            .eq('id', conversationId)
            .single();
        
        if (convError || !conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }
        
        if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
        
        if (error) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
        }
        
        res.json({ success: true, messages: messages || [] });
        
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
    }
};

// Envoyer un message
const sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { message } = req.body;
        const userId = req.user.id;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message vide' });
        }
        
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('buyer_id, seller_id')
            .eq('id', conversationId)
            .single();
        
        if (convError || !conversation) {
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }
        
        if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        const { data: newMessage, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: userId,
                message: message.trim()
            })
            .select()
            .single();
        
        if (error) {
            return res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
        }
        
        await supabase
            .from('conversations')
            .update({ last_message_at: new Date() })
            .eq('id', conversationId);
        
        res.json({ success: true, message: newMessage });
        
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
    }
};

// Récupérer toutes les conversations d'un utilisateur (AVEC LE VRAI NOM)
const getUserConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log('=== getUserConversations ===');
        console.log('userId:', userId);
        
        // Récupérer toutes les conversations de l'utilisateur
        const { data: conversations, error } = await supabase
            .from('conversations')
            .select('*')
            .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
            .order('last_message_at', { ascending: false });
        
        if (error) {
            console.error('Get conversations error:', error);
            return res.json({ success: true, conversations: [] });
        }
        
        if (!conversations || conversations.length === 0) {
            return res.json({ success: true, conversations: [] });
        }
        
        // Pour chaque conversation, récupérer les infos de l'autre utilisateur
        const conversationsWithDetails = await Promise.all(conversations.map(async (conv) => {
            // Déterminer l'ID de l'autre utilisateur
            const otherUserId = conv.buyer_id === userId ? conv.seller_id : conv.buyer_id;
            
            // Récupérer les infos complètes de l'autre utilisateur
            const { data: otherUser, error: userError } = await supabase
                .from('users')
                .select('id, full_name, email, avatar_url')
                .eq('id', otherUserId)
                .single();
            
            if (userError) {
                console.error('User fetch error:', userError);
            }
            
            // Récupérer le titre de l'annonce associée (avec vérification)
            let listingTitle = 'Annonce';
            if (conv.listing_id && conv.listing_id !== 'undefined') {
                const { data: listing, error: listingError } = await supabase
                    .from('listings')
                    .select('title')
                    .eq('id', conv.listing_id)
                    .maybeSingle(); // Utiliser maybeSingle au lieu de single
                
                if (!listingError && listing) {
                    listingTitle = listing.title;
                }
            }
            
            // Compter les messages non lus
            const { count, error: countError } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .eq('is_read', false)
                .neq('sender_id', userId);
            
            if (countError) {
                console.error('Count error:', countError);
            }
            
            // Retourner les infos formatées
            return {
                id: conv.id,
                listing_id: conv.listing_id,
                buyer_id: conv.buyer_id,
                seller_id: conv.seller_id,
                last_message_at: conv.last_message_at,
                created_at: conv.created_at,
                other_user: {
                    id: otherUser?.id,
                    full_name: otherUser?.full_name || 'Utilisateur',
                    email: otherUser?.email,
                    avatar_url: otherUser?.avatar_url
                },
                listing: {
                    title: listingTitle
                },
                unread_count: count || 0
            };
        }));
        
        res.json({ success: true, conversations: conversationsWithDetails });
        
    } catch (error) {
        console.error('Get conversations error:', error);
        res.json({ success: true, conversations: [] });
    }
};

// Marquer les messages comme lus
const markAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('conversation_id', conversationId)
            .neq('sender_id', userId);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
};

module.exports = {
    getOrCreateConversation,
    sendMessage,
    getMessages,
    getUserConversations,
    markAsRead
};