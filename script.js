const feedPost = document.getElementById('feedPost');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const fullscreenImage = document.getElementById('fullscreenImage');
const groupList = document.getElementById('groupList');
let allItems = JSON.parse(localStorage.getItem('allItems')) || [];
let tempGroups = JSON.parse(localStorage.getItem('tempGroups')) || [];
let currentFeedIndex = 0;
let currentComunicadoIndex = 0;
let currentGroupIndex = 0;
let currentPostIndex = 0;

// Função para alternar entre link e upload de imagem
function toggleImageInput() {
    const imageType = document.getElementById('imageType').value;
    document.getElementById('imageUrlRow').style.display = imageType === 'link' ? 'table-row' : 'none';
    document.getElementById('imageFileRow').style.display = imageType === 'upload' ? 'table-row' : 'none';
}

// Função para mostrar a seleção de grupo somente para comunicados
function toggleGroupSelection() {
    const itemType = document.getElementById('itemType').value;
    document.getElementById('groupRow').style.display = itemType === 'comunicado' ? 'table-row' : 'none';
}

// Adicionar novo item ao feed/comunicado
function addNewItem(event) {
    event.preventDefault();

    const type = document.getElementById('itemType').value;
    const description = document.getElementById('itemDescription').value;
    const cacheDurationDays = parseInt(document.getElementById('cacheDuration').value);
    const cacheDuration = cacheDurationDays * 24 * 60 * 60 * 1000;

    let group = document.getElementById('itemGroup').value || 'gerais';
    const tempGroupName = document.getElementById('tempGroupName').value;
    const tempGroupDurationDays = parseInt(document.getElementById('tempGroupDuration').value) || 0;

    if (tempGroupName) {
        group = tempGroupName;
        addTempGroup(tempGroupName, tempGroupDurationDays);
    }

    let imageUrl = '';
    const imageType = document.getElementById('imageType').value;
    if (imageType === 'link') {
        imageUrl = document.getElementById('imageUrl').value;
        saveNewItem(type, description, imageUrl, cacheDuration, group);
    } else {
        const file = document.getElementById('imageFile').files[0];
        const reader = new FileReader();
        reader.onload = () => {
            imageUrl = reader.result;
            saveNewItem(type, description, imageUrl, cacheDuration, group);
        };
        reader.readAsDataURL(file);
    }
}


// Adicionar grupo temporário ao armazenamento local e ao seletor de grupos
function addTempGroup(groupName, durationDays) {
    const durationMs = durationDays * 24 * 60 * 60 * 1000;
    tempGroups.push({ name: groupName, expiration: Date.now() + durationMs });
    localStorage.setItem('tempGroups', JSON.stringify(tempGroups));
    updateGroupList();
    updateGroupSelection();
    setTimeout(() => removeTempGroup(groupName), durationMs);
}

// Atualizar lista de grupos exibida na barra lateral e no seletor de grupos para comunicados
function updateGroupList() {
    groupList.innerHTML = `

    `;

    tempGroups.forEach(group => {
        const listItem = document.createElement('li');
        listItem.textContent = group.name;
        listItem.id = group.name;

        const removeButton = document.createElement('button');
        removeButton.textContent = '➖';
        removeButton.className = 'remove-button';
        removeButton.onclick = (event) => {
            event.stopPropagation();
            removeTempGroup(group.name);
        };

        listItem.appendChild(removeButton);
        listItem.onclick = () => showGroup(group.name);
        groupList.appendChild(listItem);
    });
}

function updateGroupSelection() {
    const itemGroupSelect = document.getElementById('itemGroup');
    itemGroupSelect.innerHTML = `
        <option value="gerais">Gerais</option>
        <option value="docentes">Docentes</option>
        <option value="setores">Setores</option>
        <option value="Senai>Senai</option>
        
    `;
    tempGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.name;
        option.textContent = group.name;
        itemGroupSelect.appendChild(option);
    });
}

// Remover grupo temporário
function removeTempGroup(groupName) {
    tempGroups = tempGroups.filter(group => group.name !== groupName);
    localStorage.setItem('tempGroups', JSON.stringify(tempGroups));
    updateGroupList();
    updateGroupSelection();
}

// Carregar grupos temporários salvos no armazenamento local
function loadTempGroups() {
    tempGroups = tempGroups.filter(group => Date.now() < group.expiration);
    localStorage.setItem('tempGroups', JSON.stringify(tempGroups));
    updateGroupList();
    updateGroupSelection();
}

// Salvar novo item no feed e armazená-lo
function saveNewItem(type, description, imageUrl, cacheDuration, group) {
    const newItem = {
        id: Date.now(), // Gera um ID único
        type,
        group,
        description,
        imageUrl,
        cacheDuration,
        likes: 0
    };

    allItems.push(newItem);
    syncLocalStorage();
    displayItemInFeed(newItem);
    alert('Item salvo com sucesso!');
    closeAdminPanel();
}


// Função para gerenciar os comunicados, garantindo que cada grupo tenha até 5 comunicados
function manageComunicadoGroup(item) {
    const groupComunicados = allItems.filter(it => it.type === 'comunicado' && it.group === item.group);
    if (groupComunicados.length > 5) {
        allItems = allItems.filter(it => !(it.type === 'comunicado' && it.group === item.group && it === groupComunicados[0]));
    }
    localStorage.setItem('allItems', JSON.stringify(allItems));
}

// Exibe itens no feed com botão de lixeira (novo post aparece primeiro)
// Função para exibir o item no feed
function displayItemInFeed(item) {
    const newPost = document.createElement('div');
    newPost.classList.add('post');

    // Recupera as curtidas armazenadas ou gera um número aleatório se não houver
    let randomLikes = localStorage.getItem(`likes_${item.id}`);
    if (randomLikes === null) {
        // Se não existir, gera um número aleatório entre 0 e 42
        randomLikes = Math.floor(Math.random() * 43);
        // Armazena esse número no localStorage
        localStorage.setItem(`likes_${item.id}`, randomLikes);
    } else {
        randomLikes = parseInt(randomLikes, 10); // Converte de volta para número
    }

    newPost.innerHTML = `
        <div class="delete-container">
            <button class="delete-button" onclick="confirmDeletePost(${item.id}, this)">🗑️</button>
        </div>
        <img src="${item.imageUrl}" alt="${item.description}">
        <p><strong>${item.group}</strong>: ${item.description}</p>
        <button class="like-button" onclick="likePost(this, ${item.id})">
            ❤️ <span class="like-count">${randomLikes}</span>
        </button>
    `;
    
    // Insere o novo post no feed
    feedPost.insertBefore(newPost, feedPost.firstChild);

    // Criar e exibir a mensagem "Adicionado recentemente" fora da div do post
    const recentlyAddedMessage = document.createElement('p');
    recentlyAddedMessage.textContent = 'Adicionado recentemente';
    recentlyAddedMessage.style.color = '#28a745';
    recentlyAddedMessage.style.fontWeight = 'bold';
    recentlyAddedMessage.style.marginBottom = '10px';
    
    // Insere a mensagem fora do post (no feed)
    feedPost.insertBefore(recentlyAddedMessage, newPost);

    // Remove a mensagem "Adicionado recentemente" após 3 segundos
    setTimeout(() => {
        if (recentlyAddedMessage) recentlyAddedMessage.remove();
    }, 3000);
}

// Função para rolar automaticamente pelo feed
function autoScrollFeed() {
    const posts = document.querySelectorAll('.post');
    const unidadePost = document.querySelector('.unidade-post');

    if (currentPostIndex < posts.length) {
        posts[currentPostIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        currentPostIndex++;
    } else {
        // Verifica se a página atual é 'admin.html'
        const currentPage = window.location.pathname.split('/').pop(); // Obtém o último segmento da URL
        if (currentPage !== 'admin.html') {
            location.reload(); // Recarrega a página apenas se não for 'admin.html'
        } else {
            currentPostIndex = 0; // Reinicia o índice para continuar o loop
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const imageToggle = document.getElementById("imageToggle");
    const images = [
        "img/ARTE - PROJETO JOVEM, ADULTO E QUALIFICADO.png",
        "img/topo_gif.gif" // Substitua pelo caminho da segunda imagem
    ];
    let currentIndex = 0;

    setInterval(() => {
        // Adiciona a classe fade-out para o efeito de transição
        imageToggle.classList.add("fade-out");

        setTimeout(() => {
            // Alterna para a próxima imagem
            currentIndex = (currentIndex + 1) % images.length;
            imageToggle.src = images[currentIndex];

            // Remove a classe fade-out após a troca
            imageToggle.classList.remove("fade-out");
        }, 500); // Tempo deve corresponder à duração da transição no CSS
    }, 4000); // Troca a cada 8 segundos
});


// Configura a rolagem automática a cada 10 segundos
setInterval(autoScrollFeed, 10000);


// Função para atualizar as curtidas
function likePost(button, postId) {
    // Recupera o número de curtidas armazenadas no localStorage
    let likes = parseInt(localStorage.getItem(`likes_${postId}`), 10);

    // Se o número de curtidas não estiver no localStorage, gera um valor inicial aleatório
    if (isNaN(likes)) {
        likes = Math.floor(Math.random() * 43);
    }

    // Incrementa a quantidade de curtidas
    likes++;

    // Atualiza a contagem de curtidas no localStorage
    localStorage.setItem(`likes_${postId}`, likes);

    // Atualiza a exibição das curtidas no botão de curtir
    button.querySelector('.like-count').textContent = likes;
}


// Função para solicitar exclusão de postagem com senha
function confirmDeletePost(description, button) {
    const password = prompt("Digite a senha para excluir:");
    if (password === 'senha123') {
        deletePost(description, button); // Passa a descrição e o botão que chamou a ação
    } else {
        alert("Senha incorreta!");
    }
}

function confirmDeletePost(id, button) {
    const password = prompt("Digite a senha para excluir:");
    if (password === 'senha123') {
        deletePost(id, button); // Passa o ID do item e o botão que chamou a ação
    } else {
        alert("Senha incorreta!");
    }
}

function deletePost(id, button) {
    // Remove o item do array `allItems` pelo ID
    allItems = allItems.filter(item => item.id !== id);
    syncLocalStorage();

    // Remove o elemento visual correspondente no DOM
    const postElement = button.closest('.post');
    if (postElement) {
        postElement.remove();
    }

    alert('Item excluído com sucesso!');
}


// Função para exibir comunicados de 60 em 60 segundos, com slider para até 5 imagens por grupo
function showComunicado() {
    const groupedComunicados = {};
    allItems.forEach(item => {
        if (item.type === 'comunicado') {
            if (!groupedComunicados[item.group]) {
                groupedComunicados[item.group] = [];
            }
            if (groupedComunicados[item.group].length < 5) {
                groupedComunicados[item.group].push(item);
            }
        }
    });

    const groups = Object.keys(groupedComunicados);
    if (groups.length > 0) {
        const group = groups[currentGroupIndex % groups.length];
        const comunicado = groupedComunicados[group][currentComunicadoIndex % groupedComunicados[group].length];
        
        fullscreenImage.src = comunicado.imageUrl;
        fullscreenOverlay.style.display = 'flex';

        document.querySelectorAll('#groupList li').forEach(li => li.classList.remove('active'));
        document.getElementById(comunicado.group)?.classList.add('active');

        setTimeout(() => {
            fullscreenOverlay.style.display = 'none';
            document.getElementById(comunicado.group)?.classList.remove('active');
            currentComunicadoIndex++;
            if (currentComunicadoIndex >= groupedComunicados[group].length) {
                currentComunicadoIndex = 0;
                currentGroupIndex++;
            }
        }, 15000);
    }
}

function loadItemsFromStorage() {
    const feedPost = document.getElementById('feedPost');
    feedPost.innerHTML = ''; // Limpa o feed antes de renderizar

    // Carregar itens salvos no localStorage
    const storedItems = JSON.parse(localStorage.getItem('allItems')) || [];
    allItems = storedItems;

    // Renderizar os itens no feed
    storedItems.forEach(item => {
        displayItemInFeed(item);
    });

    console.log('Itens carregados do localStorage:', allItems); // Para debug
}


// Funções para abrir e fechar o modal de administração
function openAdminPanel() {
    document.getElementById('adminModal').style.display = 'flex';
}

function closeAdminPanel() {
    document.getElementById('adminModal').style.display = 'none';
}

// Executa o comunicado a cada 60 segundos
setInterval(showComunicado, 60000);

function syncLocalStorage() {
    localStorage.setItem('allItems', JSON.stringify(allItems));
}

// Carrega o feed e grupos temporários ao iniciar
loadItemsFromStorage();
loadTempGroups();

// Referência ao modal da página "Você na Tela"
const telaOverlay = document.getElementById('telaOverlay');
const qrcodeContainer = document.getElementById('qrcode');

// Função para exibir o modal "Você na Tela"
function showTelaPage() {
    // Limpa qualquer QR Code existente
    qrcodeContainer.innerHTML = '';

    // Gera o QR Code (substitua o texto pela URL real)
    new QRCode(qrcodeContainer, {
        text: "https://example.com/sugestao", // URL do QR Code
        width: 128,
        height: 128,
    });

    // Exibe o modal
    telaOverlay.style.display = 'flex';

    // Fecha automaticamente após 15 segundos, caso não seja fechado manualmente
    telaTimeout = setTimeout(() => {
        closeTelaPage();
    }, 15000);
}

// Função para fechar o modal "Você na Tela"
function closeTelaPage() {
    const telaOverlay = document.getElementById('telaOverlay');
    telaOverlay.style.display = 'none';

    // Limpa o timeout para evitar conflitos
    clearTimeout(telaTimeout);
}

function addLiveVideo() {
    const videoUrl = document.getElementById('liveVideoUrl').value;

    if (!videoUrl) {
        alert("Por favor, insira um link válido do YouTube.");
        return;
    }

    const embedUrl = convertYoutubeToEmbed(videoUrl);
    if (!embedUrl) return; // Sai se a URL for inválida

    // Salva a URL do vídeo ao vivo no localStorage
    const liveVideo = { id: Date.now(), url: embedUrl };
    localStorage.setItem('liveVideo', JSON.stringify(liveVideo));

    alert("Vídeo ao Vivo adicionado com sucesso!");
    closeAdminPanel();
}


function showLiveVideo() {
    const liveVideo = JSON.parse(localStorage.getItem('liveVideo')); // Recupera o vídeo armazenado

    if (!liveVideo || !liveVideo.url) {
        alert("Nenhum vídeo ao vivo configurado.");
        return;
    }

    const iframe = document.getElementById('fullscreenIframe');
    
    // Atualiza o URL do iframe para reproduzir o vídeo
    iframe.src = `${liveVideo.url}?autoplay=1&rel=0`;

    // Mostra o modal
    document.getElementById('fullscreenOverlay').style.display = 'flex';

    // Fecha automaticamente após 30 segundos
    setTimeout(() => {
        closeLiveScreen();
    }, 30000);
}

function closeLiveScreen() {
    const iframe = document.getElementById('fullscreenIframe');
    iframe.src = ""; // Reseta o URL do iframe
    document.getElementById('fullscreenOverlay').style.display = 'none';
}

function saveLiveVideo() {
    const liveVideoUrl = document.getElementById('liveVideoUrl').value; // Captura o URL do input
    if (!liveVideoUrl) {
        alert("Insira a URL de um vídeo do YouTube.");
        return;
    }

    // Converte a URL para o formato embed, se necessário
    const videoId = liveVideoUrl.split("v=")[1]?.split("&")[0]; // Extrai o ID do vídeo
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    
    // Salva no localStorage
    localStorage.setItem('liveVideo', JSON.stringify({ url: embedUrl }));
    alert("Vídeo ao vivo salvo com sucesso!");
}


function convertYoutubeToEmbed(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    if (match) {
        const videoId = match[1];
        return `https://www.youtube.com/embed/${videoId}`;
    } else {
        alert("URL inválida. Por favor, insira um link válido do YouTube.");
        return null;
    }
}

function closeLiveScreen() {
    document.getElementById('fullscreenOverlay').style.display = 'none';
    document.getElementById('fullscreenIframe').src = ''; // Limpa o iframe
}


// Abrir o Visualizador 360°
let viewer; // Variável global para o visualizador Three.js
let scene, camera, renderer, sphere; // Variáveis globais para Three.js

function open3DViewer() {
    const viewerOverlay = document.getElementById('viewerOverlay');
    viewerOverlay.style.display = 'flex'; // Exibir o modal

    // Inicializar a cena principal apenas uma vez
    if (!viewer) {
        aerialScene(); // Inicializa com a imagem principal
    }
}

function close3DViewer() {
    const viewerOverlay = document.getElementById('viewerOverlay');
    viewerOverlay.style.display = 'none'; // Esconder o modal

    // Limpar a cena e o renderer ao fechar
    if (viewer) {
        renderer.dispose();
        renderer.forceContextLoss();
        viewer = null;
    }
}

function initScene(imagePath) {
    const container = document.getElementById('viewer3D');
    container.innerHTML = ''; // Limpar qualquer cena anterior

    // Configuração da Cena Three.js
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio); // Ajustar resolução com base na densidade de pixels
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Criar geometria da esfera
    const geometry = new THREE.SphereGeometry(700, 250, 40);

    // Carregar a textura
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(
        imagePath,
        () => console.log(`Imagem carregada: ${imagePath}`),
        undefined,
        (error) => console.error(`Erro ao carregar a imagem: ${imagePath}`, error)
    );

    // Criar material e esfera
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide, // Renderizar interior
    });
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // Configuração da câmera
    camera.position.set(0, 10, 0.1);

// Controle de rotação automática e efeitos dinâmicos
let rotationSpeedX = 0.0005; // Velocidade de rotação no eixo X
let rotationSpeedY = 0.001; // Velocidade de rotação no eixo Y
let zoomDirection = 1; // Direção do zoom (1 para aproximar, -1 para afastar)

const animate = function () {
    if (!renderer) return; // Parar animação se o renderer for destruído
    requestAnimationFrame(animate);

    // Efeito de rotação
    sphere.rotation.y += rotationSpeedY;
    sphere.rotation.x += rotationSpeedX;

    // Efeito de zoom dinâmico
    camera.position.z += zoomDirection * 0.1;
    if (camera.position.z > 1.5 || camera.position.z < 0.5) {
        zoomDirection *= -1; // Inverter a direção do zoom
    }

    // Renderizar a cena
    renderer.render(scene, camera);
};


    // Ajustar o tamanho do renderer e da câmera dinamicamente
    function onWindowResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    // Adicionar evento de redimensionamento
    window.addEventListener('resize', onWindowResize);

    animate();
    viewer = { scene, camera, renderer }; // Salvar a cena atual
}

function startTour360() {
    const container = document.getElementById('showcase-container');
    const img = container.querySelector('img');

    // Após 5 segundos, troca a imagem pelo iframe com efeito
    setTimeout(() => {
        img.classList.add('fade-out'); // Adiciona a classe de fade-out
        setTimeout(() => {
            // Substitui a imagem inicial pelo iframe
            container.innerHTML = `
                <iframe 
                    src="https://my.matterport.com/show/?m=MAV5pdniBDe&play=1" 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    allow="autoplay; fullscreen" 
                    style="border-radius: 10px;">
                </iframe>
                <div class="unidade-qrcode-overlay">
                    <img src="img/qrcode.png" alt="QR Code para o link 360°">
                    <p>Escaneie o QR Code para acessar no celular</p>
                </div>
            `;

            // Após 20 segundos, volta para a imagem inicial com efeito
            setTimeout(() => {
                container.innerHTML = `
                    <img 
                        src="img/Home.png" 
                        alt="Clique para iniciar o tour 360°" 
                        class="fade-in" 
                        style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;"
                    >
                    <div class="unidade-qrcode-overlay">
                        <img src="img/qrcode.png" alt="QR Code para o link 360°">
                        <p>Escaneie o QR Code para acessar no celular</p>
                    </div>
                `;
                // Reinicia o ciclo
                startTour360();
            }, 20000); // Exibição do iframe por 20 segundos
        }, 1000); // Tempo para o efeito de fade-out
    }, 5000); // Exibição de 5 segundos da imagem inicial
}

// Inicia automaticamente ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    startTour360();
});

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}


document.addEventListener("DOMContentLoaded", () => {
    const images = document.querySelectorAll('.sidebar-footer img');

    // Adiciona animações futuristas às imagens no carregamento
    images.forEach((img) => {
        img.classList.add('scrolling');
    });
});