// Utilidades compartidas para cargar fotos de productos desde el dispositivo.
window.OllaProductForm = (function () {
    const MAX_PHOTOS = 5;
    const MAX_INPUT_BYTES = 8 * 1024 * 1024;
    const MAX_OUTPUT_BYTES = 1.6 * 1024 * 1024;

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error('Archivo de imagen no válido'));
                img.onload = () => {
                    const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(img.width * scale));
                    canvas.height = Math.max(1, Math.round(img.height * scale));
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async function filesToImages(files, existing) {
        const current = Array.isArray(existing) ? existing.slice() : [];
        const incoming = Array.from(files || []);
        if (current.length + incoming.length > MAX_PHOTOS) {
            throw new Error('Puedes subir máximo ' + MAX_PHOTOS + ' fotos por producto');
        }
        const result = current.slice();
        for (const file of incoming) {
            if (!file.type || !file.type.startsWith('image/')) {
                throw new Error('Solo se permiten archivos de imagen');
            }
            if (file.size > MAX_INPUT_BYTES) {
                throw new Error('Cada foto debe pesar menos de 8 MB');
            }
            const dataUrl = await fileToDataUrl(file);
            if (dataUrl.length > MAX_OUTPUT_BYTES) {
                throw new Error('La imagen es demasiado grande, prueba con otra');
            }
            result.push(dataUrl);
        }
        return result;
    }

    function imageSrc(product, index) {
        const images = (product && product.images) || [];
        if (images.length) return images[index || 0] || images[0];
        return 'images/' + ((product && product.image) || 'calculadora.jpg');
    }

    return { MAX_PHOTOS, filesToImages, imageSrc, fileToDataUrl };
})();
