const supabase = require('../config/supabase');
const { uploadListingPhotos } = require('../middleware/upload');
const { uploadFile, getFileUrl, deleteFile } = require('../services/r2Service');
const { compressAndSave } = require('../services/compressionService');
const { calculateBuyerPrice, calculatePlatformFees } = require('../utils/helpers');
const { validateListingData } = require('../utils/validators');
const { LISTING_STATUS, DEFAULT_LIMITS } = require('../utils/constants');
const { logSecurityEvent } = require('../middleware/security');

// Créer une annonce
// Créer une annonce
const createListing = async (req, res) => {
    // Upload des photos (middleware qui traite le formulaire)
    uploadListingPhotos(req, res, async (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: err.message });
        }
        
        console.log('=== CREATE LISTING ===');
        console.log('User:', req.user);
        console.log('Body:', req.body);
        console.log('Files:', req.files);
        
        try {
            const userId = req.user.id;
            
            // Vérifier les limites pour les comptes gratuits
            if (req.user.account_type === 'individual') {
                const { count, error } = await supabase
                    .from('listings')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('status', LISTING_STATUS.ACTIVE);
                
                if (error) throw error;
                
                if (count >= DEFAULT_LIMITS.FREE_LISTINGS_MAX) {
                    return res.status(403).json({ 
                        error: `Vous avez atteint la limite de ${DEFAULT_LIMITS.FREE_LISTINGS_MAX} annonces actives.` 
                    });
                }
            }
            
            // Récupérer les données du formulaire
            const title = req.body.title;
            const description = req.body.description;
            const category = req.body.category;
            const condition = req.body.condition;
            const seller_price = req.body.seller_price;
            const latitude = req.body.latitude;
            const longitude = req.body.longitude;
            const quartier = req.body.quartier;
            const ville = req.body.ville;
            
            console.log('Parsed data:', { title, description, seller_price, quartier });
            
            // Validation
            const errors = validateListingData({ title, seller_price, quartier });
            if (errors.length > 0) {
                return res.status(400).json({ errors });
            }
            
            const buyer_price = calculateBuyerPrice(parseInt(seller_price));
            const platform_fee_total = calculatePlatformFees(parseInt(seller_price));
            
            // Créer l'annonce
            const { data: listing, error } = await supabase
                .from('listings')
                .insert({
                    user_id: userId,
                    title,
                    description,
                    category,
                    condition,
                    seller_price: parseInt(seller_price),
                    buyer_price,
                    platform_fee_total,
                    latitude: latitude || null,
                    longitude: longitude || null,
                    quartier,
                    ville: ville || 'Dakar',
                    status: LISTING_STATUS.ACTIVE
                })
                .select()
                .single();
            
            if (error) {
                console.error('Supabase insert error:', error);
                return res.status(500).json({ error: 'Erreur lors de la création de l\'annonce' });
            }
            
            // Upload des photos vers R2
            const files = req.files;
            if (files && files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    try {
                        await compressAndSave(file.path, 1024, 80);
                        
                        const uploadResult = await uploadFile(file.path, 'annonces', `${listing.id}_${i}_${Date.now()}.jpg`);
                        
                        if (uploadResult.success) {
                            await supabase
                                .from('listing_photos')
                                .insert({
                                    listing_id: listing.id,
                                    storage_path: uploadResult.key,
                                    order_index: i,
                                    is_primary: i === 0
                                });
                        }
                    } catch (uploadError) {
                        console.error('Photo upload error:', uploadError);
                    }
                }
            }
            
            // Récupérer les photos
            const { data: photos } = await supabase
                .from('listing_photos')
                .select('*')
                .eq('listing_id', listing.id)
                .order('order_index');
            
            await logSecurityEvent('LISTING_CREATED', userId, req, false, { listing_id: listing.id });
            
            // Générer les URLs signées
            const photosWithUrls = await Promise.all((photos || []).map(async (p) => ({
                ...p,
                url: p.storage_path ? await getFileUrl(p.storage_path) : null
            })));
            
            res.json({
                success: true,
                listing: {
                    ...listing,
                    photos: photosWithUrls
                }
            });
        } catch (error) {
            console.error('Create listing error:', error);
            res.status(500).json({ error: 'Erreur lors de la création de l\'annonce: ' + error.message });
        }
    });
};
// Obtenir toutes les annonces (avec filtres)
const getListings = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            category,
            quartier,
            minPrice,
            maxPrice,
            condition,
            search,
            lat,
            lng,
            sort = 'recent'
        } = req.query;
        
        let query = supabase
            .from('listings')
            .select(`
                *,
                user:user_id (id, full_name, badge_visible, is_cni_verified),
                photos:listing_photos (storage_path, is_primary, order_index)
            `)
            .eq('status', LISTING_STATUS.ACTIVE);
        
        // Filtres
        if (category) query = query.eq('category', category);
        if (quartier) query = query.eq('quartier', quartier);
        if (condition) query = query.eq('condition', condition);
        if (minPrice) query = query.gte('buyer_price', parseInt(minPrice));
        if (maxPrice) query = query.lte('buyer_price', parseInt(maxPrice));
        
        if (search) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }
        
        if (lat && lng) {
            query = query.not('latitude', 'is', null);
        }
        
        // Tri
        if (sort === 'recent') {
            query = query.order('created_at', { ascending: false });
            query = query.order('is_boosted', { ascending: false });
        } else if (sort === 'price_asc') {
            query = query.order('buyer_price', { ascending: true });
        } else if (sort === 'price_desc') {
            query = query.order('buyer_price', { ascending: false });
        }
        
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        
        const { data, error, count } = await query.range(from, to);
        
        if (error) throw error;
        
        // Générer les URLs signées pour chaque photo
        const listingsWithUrls = await Promise.all((data || []).map(async (listing) => {
            const photosWithUrls = await Promise.all((listing.photos || []).map(async (p) => ({
                ...p,
                url: p.storage_path ? await getFileUrl(p.storage_path) : null
            })));
            
            return {
                ...listing,
                photos: photosWithUrls,
                user: listing.user
            };
        }));
        
        res.json({
            success: true,
            listings: listingsWithUrls,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get listings error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des annonces' });
    }
};

// Obtenir une annonce par ID
const getListingById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: listing, error } = await supabase
            .from('listings')
            .select(`
                *,
                user:user_id (id, full_name, phone, badge_visible, is_cni_verified, created_at),
                photos:listing_photos (storage_path, order_index, is_primary)
            `)
            .eq('id', id)
            .single();
        
        if (error || !listing) {
            return res.status(404).json({ error: 'Annonce non trouvée' });
        }
        
        // Incrémenter les vues
        await supabase
            .from('listings')
            .update({ views_count: (listing.views_count || 0) + 1 })
            .eq('id', id);
        
        // Générer les URLs signées pour les photos
        const photosWithUrls = await Promise.all((listing.photos || []).map(async (p) => ({
            ...p,
            url: p.storage_path ? await getFileUrl(p.storage_path) : null
        })));
        
        res.json({
            success: true,
            listing: {
                ...listing,
                photos: photosWithUrls
            }
        });
    } catch (error) {
        console.error('Get listing error:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'annonce' });
    }
};

// Mettre à jour une annonce
const updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const { data: existing, error: checkError } = await supabase
            .from('listings')
            .select('user_id, status')
            .eq('id', id)
            .single();
        
        if (checkError || !existing) {
            return res.status(404).json({ error: 'Annonce non trouvée' });
        }
        
        if (existing.user_id !== userId) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        if (existing.status !== LISTING_STATUS.ACTIVE) {
            return res.status(400).json({ error: 'Cette annonce ne peut pas être modifiée' });
        }
        
        const updateData = { ...req.body, updated_at: new Date() };
        
        if (updateData.seller_price) {
            updateData.buyer_price = calculateBuyerPrice(updateData.seller_price);
            updateData.platform_fee_total = calculatePlatformFees(updateData.seller_price);
        }
        
        const { data, error } = await supabase
            .from('listings')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, listing: data });
    } catch (error) {
        console.error('Update listing error:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
};

// Supprimer une annonce
const deleteListing = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const { data: existing, error: checkError } = await supabase
            .from('listings')
            .select('user_id, status')
            .eq('id', id)
            .single();
        
        if (checkError || !existing) {
            return res.status(404).json({ error: 'Annonce non trouvée' });
        }
        
        if (existing.user_id !== userId && req.user.account_type !== 'professional') {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        
        const { data: photos } = await supabase
            .from('listing_photos')
            .select('storage_path')
            .eq('listing_id', id);
        
        for (const photo of photos || []) {
            await deleteFile(photo.storage_path);
        }
        
        await supabase.from('listing_photos').delete().eq('listing_id', id);
        await supabase.from('listings').delete().eq('id', id);
        
        await logSecurityEvent('LISTING_DELETED', userId, req, false, { listing_id: id });
        
        res.json({ success: true, message: 'Annonce supprimée' });
    } catch (error) {
        console.error('Delete listing error:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
};

module.exports = {
    createListing,
    getListings,
    getListingById,
    updateListing,
    deleteListing
};