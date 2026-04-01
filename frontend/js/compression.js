// Compression d'image côté client (Data Saver)
async function compressImage(file, maxWidth = 1024, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// Preview des photos avant upload
document.getElementById('photos')?.addEventListener('change', async (e) => {
    const preview = document.getElementById('previewPhotos');
    if (!preview) return;
    
    preview.innerHTML = '';
    const files = Array.from(e.target.files);
    
    for (let i = 0; i < Math.min(files.length, 5); i++) {
        const compressed = await compressImage(files[i]);
        const url = URL.createObjectURL(compressed);
        preview.innerHTML += `
            <div style="position: relative;">
                <img src="${url}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                <button type="button" onclick="this.parentElement.remove()" style="position: absolute; top: -5px; right: -5px; background: red; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 12px;">×</button>
            </div>
        `;
    }
});