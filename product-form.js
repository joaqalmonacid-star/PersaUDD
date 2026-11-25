// Utilidades compartidas para cargar fotos de productos desde el dispositivo.
window.OllaProductForm = (function () {
    const MAX_PHOTOS = 5;
    const MAX_INPUT_BYTES = 30 * 1024 * 1024;
    const MAX_OUTPUT_BYTES = 1.6 * 1024 * 1024;

    function encodeImage(img, maxSide, quality) {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', quality);
    }

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            if (!file.type || !file.type.startsWith('image/')) {
                return reject(new Error('Solo se permiten archivos de imagen'));
            }
            if (file.size > MAX_INPUT_BYTES) {
                return reject(new Error('Cada foto debe pesar menos de 30 MB'));
            }

            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error('Archivo de imagen no válido'));
                img.onload = () => {
                    try {
                        const attempts = [
                            [1400, 0.82],
                            [1400, 0.70],
                            [1200, 0.68],
                            [1000, 0.62],
                            [800, 0.58]
                        ];
                        let dataUrl = '';
                        for (const [side, quality] of attempts) {
                            dataUrl = encodeImage(img, side, quality);
                            if (dataUrl.length <= MAX_OUTPUT_BYTES) break;
                        }
                        if (dataUrl.length > MAX_OUTPUT_BYTES) {
                            return reject(new Error('La imagen es demasiado grande, prueba con otra'));
                        }
                        resolve(dataUrl);
                    } catch (err) {
                        reject(new Error('No se pudo procesar la imagen'));
                    }
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
            result.push(await fileToDataUrl(file));
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
