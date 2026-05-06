/**
 * Bites2Bytes - Notification System
 * Mengelola toast dan riwayat notifikasi in-app
 */

const NOTIF_STORAGE_KEY = 'b2b_notifications';

/**
 * Tampilkan Toast dan simpan ke riwayat
 * @param {string} message 
 * @param {'success'|'error'|'info'|'warning'} type 
 * @param {boolean} saveToHistory 
 */
function showToast(message, type = 'info', saveToHistory = true) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;
    
    const icon = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    }[type];

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    // Container
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    container.appendChild(toast);

    // Auto remove toast
    setTimeout(() => {
        toast.classList.replace('fade-in', 'fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 4000);

    // Save to LocalStorage if requested
    if (saveToHistory) {
        addNotificationToHistory(message, type);
    }
}

/** Simpan ke riwayat b2b_notifications */
function addNotificationToHistory(message, type) {
    const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
    const userId = userSession.id || 'anonymous';
    
    const notifications = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]');
    const newNotif = {
        id: 'ntf-' + Date.now(),
        userId: userId,
        message: message,
        type: type,
        time: new Date().toISOString(),
        read: false
    };

    notifications.unshift(newNotif);
    // Keep only last 20
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications.slice(0, 20)));
    
    // Dispatch event agar dashboard bisa update UI secara real-time
    window.dispatchEvent(new CustomEvent('b2b_new_notification'));
}

/** Ambil notifikasi untuk user tertentu */
function getMyNotifications() {
    const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
    const userId = userSession.id;
    const all = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]');
    return all.filter(n => n.userId === userId);
}

// ==========================================
// BROADCAST SYSTEM LOGIC
// ==========================================

function checkBroadcast() {
    const broadcastStr = localStorage.getItem('b2b_broadcast');
    if (!broadcastStr) return;
    
    try {
        const broadcast = JSON.parse(broadcastStr);
        if (document.getElementById('global-broadcast-banner')) return;
        
        // Cek target audiens (all, student, teacher)
        const currentUserStr = localStorage.getItem('b2b_currentUser');
        if (currentUserStr) {
            const currentUser = JSON.parse(currentUserStr);
            if (broadcast.target && broadcast.target !== 'all') {
                if (currentUser.role !== broadcast.target && currentUser.role !== 'admin') {
                    return; // Abaikan jika role tidak sesuai target
                }
            }
        }

        const closedId = sessionStorage.getItem('closed_broadcast_id');
        if (closedId == broadcast.id) return;
        
        const banner = document.createElement('div');
        banner.className = 'broadcast-banner';
        banner.id = 'global-broadcast-banner';
        
        let imgHtml = '';
        if (broadcast.imageUrl) {
            imgHtml = `<img src="${broadcast.imageUrl}" class="banner-img" alt="Broadcast Image" onerror="this.style.display='none'">`;
        }
        
        banner.innerHTML = `
            ${imgHtml}
            <div class="banner-content">
                <div class="banner-title">PENGUMUMAN DARI ${broadcast.sender.toUpperCase()}</div>
                <div class="banner-message">${broadcast.message}</div>
            </div>
            <button class="banner-close" onclick="closeBroadcast('${broadcast.id}')">✕</button>
        `;
        
        document.body.appendChild(banner);
    } catch(e) {}
}

window.closeBroadcast = function(id) {
    sessionStorage.setItem('closed_broadcast_id', id);
    const banner = document.getElementById('global-broadcast-banner');
    if (banner) {
        banner.style.animation = 'bannerFadeOut 0.3s forwards';
        setTimeout(() => banner.remove(), 300);
    }
}

document.addEventListener('DOMContentLoaded', checkBroadcast);

window.addEventListener('storage', (e) => {
    if (e.key === 'b2b_broadcast') {
        const oldBanner = document.getElementById('global-broadcast-banner');
        if (oldBanner) oldBanner.remove();
        checkBroadcast();
    }
});

// ==========================================
// NOTIFICATION UI LOGIC
// ==========================================

function initNotifications() {
    const toggle = document.getElementById('notif-toggle');
    const dropdown = document.getElementById('notif-dropdown');
    const markRead = document.getElementById('mark-all-read');
    
    const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
    const userId = userSession.id;

    if (toggle && dropdown) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
            renderNotificationList(userId);
        });

        document.addEventListener('click', () => dropdown.classList.add('hidden'));
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    if (markRead) {
        markRead.addEventListener('click', () => {
            const all = JSON.parse(localStorage.getItem('b2b_notifications') || '[]');
            all.forEach(n => { if (n.userId === userId) n.read = true; });
            localStorage.setItem('b2b_notifications', JSON.stringify(all));
            renderNotificationList(userId);
        });
    }

    window.addEventListener('b2b_new_notification', () => renderNotificationList(userId));
    renderNotificationList(userId);
}

function renderNotificationList(userId) {
    const listEl = document.getElementById('notif-list');
    const countEl = document.getElementById('notif-count');
    if (!listEl) return;

    const myNotifs = getMyNotifications();
    const unread = myNotifs.filter(n => !n.read);

    if (countEl) {
        countEl.textContent = unread.length;
        countEl.style.display = unread.length > 0 ? 'flex' : 'none';
    }

    if (myNotifs.length === 0) {
        listEl.innerHTML = '<div class="text-center p-20 text-muted text-xs">Tidak ada notifikasi baru</div>';
        return;
    }

    listEl.innerHTML = myNotifs.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}">
            <div class="notif-icon-small">${n.type === 'success' ? '🏆' : n.type === 'error' ? '❌' : '📅'}</div>
            <div class="notif-content-area">
                <p class="text-xs" style="margin:0">${n.message}</p>
                <span class="notif-time text-muted" style="font-size:0.6rem">${new Date(n.time).toLocaleTimeString()}</span>
            </div>
        </div>
    `).join('');
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    initNotifications();
});

window.initNotifications = initNotifications;
window.renderNotificationList = renderNotificationList;
window.checkBroadcast = checkBroadcast;
