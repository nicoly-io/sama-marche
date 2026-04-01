// Géolocalisation pour les annonces
let userLocation = null;
let map = null;
let markers = [];

// Demander la position de l'utilisateur
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    resolve(userLocation);
                },
                (error) => {
                    console.error('Erreur géolocalisation:', error);
                    reject(error);
                },
                { timeout: 10000 }
            );
        } else {
            reject(new Error('Géolocalisation non supportée'));
        }
    });
}

// Initialiser la carte (Leaflet)
function initMap(containerId, centerLat = 14.6937, centerLng = -17.4441, zoom = 12) {
    // Vérifier si Leaflet est chargé
    if (typeof L === 'undefined') {
        // Charger Leaflet dynamiquement
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
            createMap(containerId, centerLat, centerLng, zoom);
        };
        document.head.appendChild(script);
    } else {
        createMap(containerId, centerLat, centerLng, zoom);
    }
}

function createMap(containerId, centerLat, centerLng, zoom) {
    map = L.map(containerId).setView([centerLat, centerLng], zoom);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    return map;
}

// Ajouter un marqueur sur la carte
function addMarker(lat, lng, title, onClickCallback = null) {
    if (!map) return null;
    
    const marker = L.marker([lat, lng]).addTo(map);
    if (title) {
        marker.bindPopup(title);
    }
    if (onClickCallback) {
        marker.on('click', onClickCallback);
    }
    markers.push(marker);
    return marker;
}

// Effacer tous les marqueurs
function clearMarkers() {
    markers.forEach(marker => map?.removeLayer(marker));
    markers = [];
}

// Afficher les annonces sur la carte
async function showListingsOnMap(listings) {
    if (!map) return;
    
    clearMarkers();
    
    listings.forEach(listing => {
        if (listing.latitude && listing.longitude) {
            addMarker(
                listing.latitude,
                listing.longitude,
                `<b>${listing.title}</b><br>${formatPrice(listing.buyer_price)}<br><a href="listing-detail.html?id=${listing.id}">Voir l'annonce</a>`,
                () => {
                    // Optionnel: centrer sur le marqueur
                    map.setView([listing.latitude, listing.longitude], 15);
                }
            );
        }
    });
}

// Calculer la distance entre deux points (km)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Filtrer les annonces par rayon
function filterByRadius(listings, centerLat, centerLng, radiusKm) {
    return listings.filter(listing => {
        if (!listing.latitude || !listing.longitude) return false;
        const distance = getDistance(centerLat, centerLng, listing.latitude, listing.longitude);
        return distance <= radiusKm;
    });
}

// Autocomplétion de quartiers (données Sénégal)
const quartiersSenegal = [
    'Médina', 'Pikine', 'Guediawaye', 'Rufisque', 'Dakar Plateau',
    'Fann', 'Ouakam', 'Ngor', 'Yoff', 'Hann', 'Grand Yoff',
    'Parcelles Assainies', 'Keur Massar', 'Yeumbeul', 'Thiaroye',
    'Mbour', 'Saly', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Kaolack'
];

function initQuartierAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    let datalist = document.getElementById('quartiers-list');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'quartiers-list';
        document.body.appendChild(datalist);
        quartiersSenegal.forEach(q => {
            const option = document.createElement('option');
            option.value = q;
            datalist.appendChild(option);
        });
    }
    input.setAttribute('list', 'quartiers-list');
}