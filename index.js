document.getElementById('produtoMidia').addEventListener('change', function(event) {
    const files = event.target.files;
    const imagesContainer = document.getElementById('images-preview');
    const videoContainer = document.getElementById('video-preview');
    
    // Limpar pré-visualizações anteriores
    imagesContainer.innerHTML = '';
    videoContainer.innerHTML = '';

    let imageCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileURL = URL.createObjectURL(file);

        if (file.type.startsWith('image/') && imageCount < 4) {
            imageCount++;
            // Criar miniatura para a imagem
            const img = document.createElement('img');
            img.src = fileURL;
            img.style.width = '70px';
            img.style.height = '70px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '6px';
            img.style.border = '1px solid #444';
            imagesContainer.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            // Criar pré-visualização para o vídeo (colocado logo abaixo das imagens)
            const video = document.createElement('video');
            video.src = fileURL;
            video.controls = true;
            video.style.maxWidth = '100%';
            video.style.maxHeight = '150px';
            video.style.borderRadius = '6px';
            videoContainer.appendChild(video);
        }
    }
});
