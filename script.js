document.getElementById('channelForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const channelName = document.getElementById('channelName').value.trim();
    const channelURL = document.getElementById('channelURL').value.trim();

    if (channelName && channelURL) {
        if (isValidYouTubeURL(channelURL)) {
            const channelData = await fetchChannelData(channelURL);
            if (channelData) {
                addChannel(channelData);
                document.getElementById('channelForm').reset();
                document.getElementById('channelURL').value = "https://www.youtube.com/channel/"; // Resetar o campo URL
                showMessage('Canal adicionado com sucesso!');
            }
        } else {
            showMessage('Por favor, insira uma URL válida do YouTube.', true);
        }
    }
});

document.getElementById('channelName').addEventListener('input', async function(event) {
    const query = event.target.value.trim();
    if (query.length > 2) {
        const results = await searchChannels(query);
        displaySearchResults(results);
    } else {
        document.getElementById('searchResults').style.display = 'none';
    }
});

function isValidYouTubeURL(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(c\/|channel\/|user\/)|youtu\.?be\/).*$/;
    return pattern.test(url);
}

async function searchChannels(query) {
    try {
        const apiKey = 'AIzaSyB3J2TOHZPelz4-SVPgLinm8Ns6UozmOVk'; // Substitua pela sua chave de API do YouTube
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${query}&maxResults=5&key=${apiKey}`);
        if (!response.ok) throw new Error('Erro ao buscar canais');

        const data = await response.json();
        return data.items.map(item => ({
            id: item.snippet.channelId,
            name: item.snippet.channelTitle,
            url: `https://www.youtube.com/channel/${item.snippet.channelId}`
        }));
    } catch (error) {
        console.error('Erro ao buscar canais:', error);
        showMessage('Erro ao buscar canais. Tente novamente.', true);
        return [];
    }
}

function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';
    results.forEach(result => {
        const div = document.createElement('div');
        div.textContent = result.name;
        div.onclick = () => {
            document.getElementById('channelName').value = result.name;
            document.getElementById('channelURL').value = result.url;
            searchResults.style.display = 'none';
        };
        searchResults.appendChild(div);
    });
    searchResults.style.display = results.length ? 'block' : 'none';
}

async function fetchChannelData(url) {
    try {
        const channelID = getChannelID(url);
        if (!channelID) throw new Error('URL do canal inválida');

        const apiKey = 'AIzaSyB3J2TOHZPelz4-SVPgLinm8Ns6UozmOVk'; // Substitua pela sua chave de API do YouTube
        const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelID}&key=${apiKey}`);
        const videoResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelID}&order=date&maxResults=1&key=${apiKey}`);

        if (!channelResponse.ok || !videoResponse.ok) {
            throw new Error('Erro ao buscar dados do canal');
        }

        const channelData = await channelResponse.json();
        const videoData = await videoResponse.json();

        if (!channelData.items || !videoData.items) {
            throw new Error('Canal não encontrado');
        }

        return {
            name: channelData.items[0].snippet.title,
            url: url,
            logo: channelData.items[0].snippet.thumbnails.default.url,
            lastVideo: videoData.items[0].id.videoId,
            lastVideoDate: videoData.items[0].snippet.publishedAt
        };
    } catch (error) {
        console.error('Erro ao buscar dados do canal:', error);
        showMessage('Erro ao buscar dados do canal. Verifique a URL e tente novamente.', true);
        return null;
    }
}

function getChannelID(url) {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(segment => segment);
    if (pathSegments[0] === 'user' || pathSegments[0] === 'c' || pathSegments[0] === 'channel') {
        return pathSegments[1];
    }
    return null;
}

function addChannel(channel) {
    let channels = JSON.parse(localStorage.getItem('channels')) || [];
    const isDuplicate = channels.some(existingChannel => existingChannel.url === channel.url);
    if (isDuplicate) {
        showMessage('Este canal já foi adicionado.', true);
        return;
    }
    channels.push(channel);
    localStorage.setItem('channels', JSON.stringify(channels));
    displayChannels();
}

function displayChannels() {
    const channels = JSON.parse(localStorage.getItem('channels')) || [];
    const channelList = document.getElementById('channelList');
    channelList.innerHTML = '';

    channels.forEach((channel, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <img src="${channel.logo}" alt="${channel.name}" class="channel-logo">
            <a href="${channel.url}" target="_blank">${channel.name}</a>
            <a href="https://www.youtube.com/watch?v=${channel.lastVideo}" target="_blank">Último Vídeo</a>
            <button onclick="removeChannel(${index})">Remover</button>
        `;
        channelList.appendChild(li);
    });
}

function removeChannel(index) {
    let channels = JSON.parse(localStorage.getItem('channels')) || [];
    channels.splice(index, 1);
    localStorage.setItem('channels', JSON.stringify(channels));
    displayChannels();
    showMessage('Canal removido com sucesso!');
}

function sortChannelsByName() {
    let channels = JSON.parse(localStorage.getItem('channels')) || [];
    channels.sort((a, b) => a.name.localeCompare(b.name));
    localStorage.setItem('channels', JSON.stringify(channels));
    displayChannels();
}

function sortChannelsByRecent() {
    let channels = JSON.parse(localStorage.getItem('channels')) || [];
    channels.sort((a, b) => new Date(b.lastVideoDate) - new Date(a.lastVideoDate));
    localStorage.setItem('channels', JSON.stringify(channels));
    displayChannels();
}

function showMessage(message, isError = false) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.position = 'fixed';
    messageElement.style.bottom = '20px';
    messageElement.style.right = '20px';
    messageElement.style.padding = '10px';
    messageElement.style.backgroundColor = isError ? '#dc3545' : '#28a745';
    messageElement.style.color = 'white';
    messageElement.style.borderRadius = '4px';
    messageElement.style.zIndex = '1000';
    document.body.appendChild(messageElement);

    setTimeout(() => {
        document.body.removeChild(messageElement);
    }, 3000);
}

window.onload = displayChannels;
