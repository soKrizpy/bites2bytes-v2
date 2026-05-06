/**
 * Bites2Bytes - Utilities
 * Fungsi untuk menganimasi angka (Count Up)
 */

function animateCount(el, end, duration = 2500, decimals = 0) {
    if (!el) return;
    
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (easeOutExpo)
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        
        const currentValue = (easeProgress * end).toFixed(decimals);
        el.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = end.toFixed(decimals);
        }
    }
    
    requestAnimationFrame(update);
}

window.animateCount = animateCount;

/**
 * Toggle Dropdown Menu
 */
window.toggleDropdown = function(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
};

/**
 * Close Modal
 */
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
};

/**
 * Handle Logout (Supabase Integrated)
 */
window.handleLogout = async function() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        try {
            if (window.B2B_Supabase && window.B2B_Supabase.client) {
                await window.B2B_Supabase.client.auth.signOut();
            }
            // Clear local session data
            sessionStorage.clear();
            localStorage.removeItem('b2b_currentUser');
            // Redirect to login page
            window.location.href = '/login';
        } catch (err) {
            console.error("Logout error:", err);
            window.location.href = '/login';
        }
    }
};

/**
 * Open Account Settings Modal
 */
window.openSettingsModal = function() {
    let modal = document.getElementById('settings-modal');
    
    if (!modal) {
        const modalHTML = `
        <div id="settings-modal" class="modal hidden">
            <div class="modal-content glass" style="max-width: 500px;">
                <div class="flex-between mb-20">
                    <h2 class="fw-bold">Pengaturan Profil 👤</h2>
                    <button class="icon-btn" onclick="closeModal('settings-modal')">✕</button>
                </div>
                <form id="settings-form">
                    <div class="flex flex-column items-center mb-20">
                        <div class="avatar-preview mb-10" style="width: 100px; height: 100px; border-radius: 50%; overflow: hidden; background: var(--border-color); display: flex; align-items: center; justify-content: center; border: 2px solid var(--primary-color);">
                            <img id="settings-photo-preview" src="" alt="Preview" class="hidden" style="width: 100%; height: 100%; object-fit: cover;">
                            <span id="settings-avatar-placeholder" class="text-2xl">👤</span>
                        </div>
                        <label for="settings-photo-upload" class="btn btn-sm btn-outline cursor-pointer">📤 Unggah Foto</label>
                        <input type="file" id="settings-photo-upload" class="hidden" accept="image/*">
                        <input type="hidden" id="settings-photo-url">
                    </div>
                    <div class="form-group mb-15">
                        <label class="text-sm text-muted">Nama Lengkap</label>
                        <input type="text" id="settings-name" class="form-control" required placeholder="Masukkan nama lengkap">
                    </div>
                    <div class="form-group mb-15">
                        <label class="text-sm text-muted">Tentang Saya / Bio Singkat</label>
                        <textarea id="settings-bio" class="form-control" rows="3" placeholder="Ceritakan sedikit tentang dirimu..."></textarea>
                    </div>
                    <div id="settings-extra-fields"></div>
                    <div id="settings-admin-fields"></div>
                    <div class="mt-20">
                        <button type="submit" class="btn btn-primary btn-block" style="width: 100%;">Simpan Perubahan</button>
                    </div>
                </form>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('settings-modal');

        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            saveAccountSettings();
        });

        const photoInput = document.getElementById('settings-photo-upload');
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    document.getElementById('settings-photo-preview').src = event.target.result;
                    document.getElementById('settings-photo-preview').classList.remove('hidden');
                    document.getElementById('settings-photo-url').value = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const extraFields = document.getElementById('settings-extra-fields');
    const adminFields = document.getElementById('settings-admin-fields');

    // Reset form
    document.getElementById('settings-name').value = '';
    document.getElementById('settings-photo-url').value = '';
    document.getElementById('settings-bio').value = '';
    document.getElementById('settings-photo-preview').classList.add('hidden');
    if (extraFields) extraFields.innerHTML = '';
    if (adminFields) adminFields.innerHTML = '';

    // Populate current data
    let currentUser = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
    let userRole = (currentUser.role || '').toLowerCase();

    document.getElementById('settings-name').value = currentUser.name || '';
    document.getElementById('settings-photo-url').value = currentUser.photoUrl || '';
    document.getElementById('settings-bio').value = currentUser.bio || '';
    
    const preview = document.getElementById('settings-photo-preview');
    if (currentUser.photoUrl) {
        preview.src = currentUser.photoUrl;
        preview.classList.remove('hidden');
    }

    if (userRole === 'student') {
        extraFields.innerHTML = `
            <div class="form-group mb-15">
                <label class="text-sm text-muted">Kelas / Tingkat 🏫</label>
                <input type="text" id="settings-extra" class="form-control" value="${currentUser.extra || ''}" placeholder="Contoh: Kelas 10-A / Web Pro">
            </div>
        `;
    } else if (userRole === 'teacher') {
        extraFields.innerHTML = `
            <div class="form-group mb-15">
                <label class="text-sm text-muted">Mata Pelajaran yang Diampu 📚</label>
                <textarea id="settings-extra" class="form-control" rows="3" placeholder="Contoh: Algoritma, Web Development, UI/UX">${currentUser.extra || ''}</textarea>
            </div>
        `;
    }

    modal.classList.remove('hidden');
};

async function saveAccountSettings() {
    const name = document.getElementById('settings-name').value;
    const photoUrl = document.getElementById('settings-photo-url').value;
    const bio = document.getElementById('settings-bio').value;
    const extraInput = document.getElementById('settings-extra');
    const extra = extraInput ? extraInput.value : null;
    
    let currentUser = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
    
    try {
        const { error } = await window.B2B_Supabase.client
            .from('profiles')
            .update({
                name: name,
                photo_url: photoUrl,
                bio: bio,
                extra: extra
            })
            .eq('id', currentUser.id);

        if (error) throw error;

        // Update local session
        currentUser.name = name;
        currentUser.photoUrl = photoUrl;
        currentUser.bio = bio;
        if (extra !== null) currentUser.extra = extra;
        localStorage.setItem('b2b_currentUser', JSON.stringify(currentUser));
        
        if (window.showToast) showToast("Profil berhasil diperbarui!", "success");
        window.closeModal('settings-modal');
        setTimeout(() => location.reload(), 1000);
    } catch (err) {
        if (window.showToast) showToast(err.message, "error");
    }
}

/**
 * Update Profile UI in Header
 */
window.updateProfileUI = function() {
    const currentUser = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
    const role = currentUser.role || 'student';
    
    const nameEl = document.getElementById(`${role}-display-name`);
    const avatarEl = document.getElementById(`${role}-avatar`);
    const avatarMiniEl = document.getElementById(`${role}-avatar-mini`);
    
    if (nameEl) nameEl.textContent = currentUser.name || 'User';

    const applyAvatar = (el) => {
        if (!el) return;
        if (currentUser.photoUrl) {
            el.innerHTML = `<img src="${currentUser.photoUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            el.style.padding = '0';
        } else {
            const initials = currentUser.name 
                ? currentUser.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() 
                : 'U';
            el.textContent = initials;
            el.style.padding = '';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
        }
    };

    applyAvatar(avatarEl);
    applyAvatar(avatarMiniEl);

    const bioDisplay = document.getElementById(`${role}-bio-display`);
    const extraDisplay = document.getElementById(`${role}-extra-display`);
    
    if (bioDisplay) bioDisplay.textContent = currentUser.bio || 'Belum ada bio singkat.';
    if (extraDisplay) {
        if (role === 'student') {
            extraDisplay.textContent = currentUser.extra || 'Belum diatur';
        } else if (role === 'teacher') {
            const subjects = currentUser.extra ? currentUser.extra.split(',').map(s => s.trim()).filter(s => s) : [];
            if (subjects.length > 0) {
                extraDisplay.innerHTML = subjects.map(s => `<span class="badge badge-outline" style="margin-right:5px; margin-bottom:5px;">${s}</span>`).join('');
            } else {
                extraDisplay.textContent = 'Belum ada mata pelajaran.';
            }
        }
    }

    const greetingEl = document.getElementById('student-greeting');
    if (greetingEl && currentUser.name) {
        const firstName = currentUser.name.split(' ')[0];
        greetingEl.innerHTML = `Halo, ${firstName}! 👋`;
    }
};

/**
 * Initialize Global Supabase Features (Realtime Broadcast)
 */
async function initGlobalFeatures() {
    if (window.B2B_Supabase && window.B2B_Supabase.setupRealtimeBroadcast) {
        window.B2B_Supabase.setupRealtimeBroadcast((payload) => {
            if (window.showToast) {
                showToast(`📢 PENGUMUMAN: ${payload.new.content}`, 'info');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initGlobalFeatures();
    if (window.updateProfileUI) window.updateProfileUI();
});

// Tutup dropdown jika klik luar
document.addEventListener('click', function(event) {
    const isDropdownTrigger = event.target.closest('.user-profile-trigger') || event.target.closest('.settings-gear-btn');
    const isDropdownMenu = event.target.closest('.dropdown-menu') || event.target.closest('.notif-dropdown');

    if (!isDropdownTrigger && !isDropdownMenu) {
        const dropdowns = document.querySelectorAll('.dropdown-menu, .notif-dropdown');
        dropdowns.forEach(dropdown => {
            dropdown.classList.add('hidden');
        });
    }
});

/**
 * Utility: Download JSON
 */
window.downloadJSON = function(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'b2b-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Utility: Print Report
 */
window.printReport = function(contentHtml, title = "Laporan Bites2Bytes") {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; }
                    h1 { color: #9333ea; border-bottom: 2px solid #9333ea; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background-color: #f3f4f6; }
                    .footer { margin-top: 50px; font-size: 12px; color: #666; text-align: center; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                ${contentHtml}
                <div class="footer">&copy; 2026 Bites2Bytes Platform.</div>
                <script>window.onload = function() { window.print(); window.close(); }</script>
            </body>
        </html>
    `);
    printWindow.document.close();
};
