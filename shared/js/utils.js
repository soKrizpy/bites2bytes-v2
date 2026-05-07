/**
 * Bites2Bytes - Utilities
 * Shared helpers for UI state, profile settings, and exports.
 */

function animateCount(el, end, duration = 2500, decimals = 0) {
    if (!el) return;

    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
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

function getCurrentUserProfile() {
    const rawUser = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
    return {
        ...rawUser,
        photoUrl: rawUser.photoUrl || rawUser.photo_url || '',
        photo_url: rawUser.photo_url || rawUser.photoUrl || '',
        bio: rawUser.bio || '',
        extra: rawUser.extra || '',
        name: rawUser.name || 'User'
    };
}

function persistProfileLocally(profile) {
    const normalized = {
        ...profile,
        photoUrl: profile.photoUrl || profile.photo_url || '',
        photo_url: profile.photo_url || profile.photoUrl || '',
        bio: profile.bio || '',
        extra: profile.extra || ''
    };

    localStorage.setItem('b2b_currentUser', JSON.stringify(normalized));

    if ((normalized.role || '').toLowerCase() === 'admin') {
        localStorage.setItem('b2b_admin_profile', JSON.stringify({
            id: normalized.id,
            wa_number: normalized.wa_number || normalized.id,
            name: normalized.name,
            role: normalized.role,
            extra: normalized.extra,
            mpin: normalized.mpin || '123456',
            honorarium: normalized.honorarium || 0,
            sessions_completed: normalized.sessions_completed || 0,
            created_at: normalized.created_at || new Date().toISOString(),
            bio: normalized.bio,
            photo_url: normalized.photo_url
        }));
        return;
    }

    const users = JSON.parse(localStorage.getItem('b2b_users') || '[]');
    let matchedUser = false;
    const nextUsers = users.map((user) => {
        if (user.id !== normalized.id && user.id !== normalized.wa_number) return user;
        matchedUser = true;

        return {
            ...user,
            id: normalized.wa_number || normalized.id,
            name: normalized.name,
            role: normalized.role,
            extra: normalized.extra,
            mpin: normalized.mpin || user.mpin || '',
            honorarium: normalized.honorarium || user.honorarium || 75000,
            sessionsCompleted: normalized.sessions_completed || user.sessionsCompleted || 0,
            bio: normalized.bio,
            photoUrl: normalized.photoUrl
        };
    });

    if (!matchedUser) {
        nextUsers.push({
            id: normalized.wa_number || normalized.id,
            name: normalized.name,
            role: normalized.role,
            extra: normalized.extra,
            mpin: normalized.mpin || '',
            honorarium: normalized.honorarium || 75000,
            sessionsCompleted: normalized.sessions_completed || 0,
            bio: normalized.bio,
            photoUrl: normalized.photoUrl
        });
    }

    localStorage.setItem('b2b_users', JSON.stringify(nextUsers));
}

window.toggleDropdown = function(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.classList.toggle('hidden');
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
};

window.showConfirmDialog = function({
    title = 'Konfirmasi',
    message = 'Apakah Anda yakin ingin melanjutkan?',
    confirmText = 'Lanjutkan',
    cancelText = 'Batal',
    danger = false
} = {}) {
    return new Promise((resolve) => {
        let modal = document.getElementById('global-confirm-modal');

        if (!modal) {
            const modalHTML = `
            <div id="global-confirm-modal" class="modal hidden">
                <div class="modal-content glass" style="max-width:460px; width:calc(100% - 32px);">
                    <div class="flex-between mb-15">
                        <h2 id="confirm-modal-title" class="fw-bold">Konfirmasi</h2>
                        <button type="button" class="icon-btn" data-confirm-close>X</button>
                    </div>
                    <p id="confirm-modal-message" class="text-sm text-muted" style="line-height:1.6; margin-bottom:20px;"></p>
                    <div class="flex gap-2" style="justify-content:flex-end;">
                        <button type="button" id="confirm-modal-cancel" class="btn btn-sm btn-outline">Batal</button>
                        <button type="button" id="confirm-modal-submit" class="btn btn-sm btn-primary">Lanjutkan</button>
                    </div>
                </div>
            </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('global-confirm-modal');
        }

        const titleEl = document.getElementById('confirm-modal-title');
        const messageEl = document.getElementById('confirm-modal-message');
        const cancelBtn = document.getElementById('confirm-modal-cancel');
        const submitBtn = document.getElementById('confirm-modal-submit');
        const closeBtn = modal.querySelector('[data-confirm-close]');

        titleEl.textContent = title;
        messageEl.textContent = message;
        submitBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;
        submitBtn.style.background = danger ? 'var(--danger-color)' : '';
        submitBtn.style.borderColor = danger ? 'var(--danger-color)' : '';
        submitBtn.style.color = '#fff';

        const cleanup = (result) => {
            modal.classList.add('hidden');
            cancelBtn.removeEventListener('click', onCancel);
            submitBtn.removeEventListener('click', onConfirm);
            closeBtn.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onBackdrop);
            document.removeEventListener('keydown', onKeyDown);
            resolve(result);
        };

        const onCancel = () => cleanup(false);
        const onConfirm = () => cleanup(true);
        const onBackdrop = (event) => {
            if (event.target === modal) cleanup(false);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') cleanup(false);
        };

        cancelBtn.addEventListener('click', onCancel);
        submitBtn.addEventListener('click', onConfirm);
        closeBtn.addEventListener('click', onCancel);
        modal.addEventListener('click', onBackdrop);
        document.addEventListener('keydown', onKeyDown);

        modal.classList.remove('hidden');
    });
};

window.handleLogout = async function() {
    const confirmed = await window.showConfirmDialog({
        title: 'Keluar dari Akun',
        message: 'Sesi saat ini akan diakhiri dan Anda akan kembali ke halaman login.',
        confirmText: 'Keluar',
        cancelText: 'Tetap di sini',
        danger: true
    });

    if (!confirmed) return;

    try {
        if (window.B2B_Supabase && window.B2B_Supabase.client) {
            await window.B2B_Supabase.client.auth.signOut();
        }
        sessionStorage.clear();
        localStorage.removeItem('b2b_currentUser');
        window.location.href = '/login';
    } catch (err) {
        console.error('Logout error:', err);
        window.location.href = '/login';
    }
};

function getRoleLabel(role) {
    if (role === 'admin') return 'Admin';
    if (role === 'teacher') return 'Teacher';
    return 'Student';
}

function getRoleFieldMarkup(role, currentUser) {
    if (role === 'teacher') {
        return `
            <div class="form-group mb-0">
                <label class="text-sm text-muted">Mata Pelajaran yang Diampu</label>
                <textarea id="settings-extra" class="form-control" rows="3" placeholder="Contoh: Algoritma, Web Development, UI/UX">${currentUser.extra || ''}</textarea>
            </div>
        `;
    }

    if (role === 'admin') {
        return `
            <div class="form-group mb-0">
                <label class="text-sm text-muted">Area Tanggung Jawab</label>
                <input type="text" id="settings-extra" class="form-control" value="${currentUser.extra || ''}" placeholder="Contoh: Operasional Platform">
            </div>
        `;
    }

    return `
        <div class="form-group mb-0">
            <label class="text-sm text-muted">Kelas / Tingkat</label>
            <input type="text" id="settings-extra" class="form-control" value="${currentUser.extra || ''}" placeholder="Contoh: Kelas 10-A / Web Pro">
        </div>
    `;
}

window.openSettingsModal = function() {
    let modal = document.getElementById('settings-modal');

    if (!modal) {
        const modalHTML = `
        <div id="settings-modal" class="modal hidden">
            <div class="modal-content glass" style="max-width: 680px; width: calc(100% - 32px);">
                <div class="flex-between mb-20">
                    <h2 class="fw-bold">Pengaturan Akun</h2>
                    <button class="icon-btn" onclick="closeModal('settings-modal')">X</button>
                </div>
                <form id="settings-form">
                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:24px; align-items:start;">
                        <div class="glass" style="padding:20px; border-radius:16px; display:flex; flex-direction:column; align-items:center; gap:14px;">
                            <div class="avatar-preview" style="width:112px; height:112px; border-radius:50%; overflow:hidden; background:var(--border-color); display:flex; align-items:center; justify-content:center; border:2px solid var(--primary-color);">
                                <img id="settings-photo-preview" src="" alt="Preview" class="hidden" style="width:100%; height:100%; object-fit:cover;">
                                <span id="settings-avatar-placeholder" class="text-2xl">User</span>
                            </div>
                            <div class="text-center">
                                <div id="settings-role-label" class="badge badge-primary" style="margin-bottom:8px;">Akun</div>
                                <p class="text-xs text-muted" style="margin:0;">Perubahan di sini akan dipakai di seluruh dashboard.</p>
                            </div>
                            <label for="settings-photo-upload" class="btn btn-sm btn-outline cursor-pointer" style="width:100%; justify-content:center;">Unggah Foto</label>
                            <input type="file" id="settings-photo-upload" class="hidden" accept="image/*">
                            <input type="hidden" id="settings-photo-url">
                        </div>

                        <div style="display:flex; flex-direction:column; gap:16px;">
                            <div class="glass" style="padding:18px; border-radius:16px;">
                                <div class="form-group mb-15">
                                    <label class="text-sm text-muted">Nama Lengkap</label>
                                    <input type="text" id="settings-name" class="form-control" required placeholder="Masukkan nama lengkap">
                                </div>
                                <div class="form-group mb-0">
                                    <label class="text-sm text-muted">Tentang Saya / Bio Singkat</label>
                                    <textarea id="settings-bio" class="form-control" rows="3" placeholder="Ceritakan sedikit tentang dirimu..."></textarea>
                                </div>
                            </div>

                            <div class="glass" style="padding:18px; border-radius:16px;">
                                <div id="settings-extra-fields"></div>
                                <div id="settings-admin-fields"></div>
                            </div>

                            <div class="mt-5">
                                <button type="submit" class="btn btn-primary btn-block" style="width:100%;">Simpan Perubahan</button>
                            </div>
                        </div>
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
                    document.getElementById('settings-avatar-placeholder').classList.add('hidden');
                    document.getElementById('settings-photo-url').value = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const extraFields = document.getElementById('settings-extra-fields');
    const adminFields = document.getElementById('settings-admin-fields');
    const roleLabel = document.getElementById('settings-role-label');
    const preview = document.getElementById('settings-photo-preview');
    const avatarPlaceholder = document.getElementById('settings-avatar-placeholder');

    document.getElementById('settings-name').value = '';
    document.getElementById('settings-photo-url').value = '';
    document.getElementById('settings-bio').value = '';
    preview.classList.add('hidden');
    avatarPlaceholder.classList.remove('hidden');
    if (extraFields) extraFields.innerHTML = '';
    if (adminFields) adminFields.innerHTML = '';

    const currentUser = getCurrentUserProfile();
    const userRole = (currentUser.role || 'student').toLowerCase();

    document.getElementById('settings-name').value = currentUser.name || '';
    document.getElementById('settings-photo-url').value = currentUser.photoUrl || '';
    document.getElementById('settings-bio').value = currentUser.bio || '';

    if (roleLabel) roleLabel.textContent = getRoleLabel(userRole);
    if (avatarPlaceholder) avatarPlaceholder.textContent = currentUser.name ? currentUser.name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase() : 'U';

    if (currentUser.photoUrl) {
        preview.src = currentUser.photoUrl;
        preview.classList.remove('hidden');
        avatarPlaceholder.classList.add('hidden');
    }

    if (extraFields) {
        extraFields.innerHTML = getRoleFieldMarkup(userRole, currentUser);
    }

    modal.classList.remove('hidden');
};

async function saveAccountSettings() {
    const name = document.getElementById('settings-name').value.trim();
    const photoUrl = document.getElementById('settings-photo-url').value;
    const bio = document.getElementById('settings-bio').value.trim();
    const extraInput = document.getElementById('settings-extra');
    const extra = extraInput ? extraInput.value.trim() : null;

    let currentUser = getCurrentUserProfile();

    try {
        const { error } = await window.B2B_Supabase.client
            .from('profiles')
            .update({
                name,
                photo_url: photoUrl,
                bio,
                extra
            })
            .eq('id', currentUser.id);

        if (error) throw error;

        currentUser = {
            ...currentUser,
            name,
            photoUrl,
            photo_url: photoUrl,
            bio,
            extra: extra !== null ? extra : currentUser.extra
        };

        persistProfileLocally(currentUser);

        if (window.showToast) showToast('Profil berhasil diperbarui!', 'success');
        window.closeModal('settings-modal');
        if (window.updateProfileUI) window.updateProfileUI();
    } catch (err) {
        if (window.showToast) showToast(err.message, 'error');
    }
}

window.updateProfileUI = function() {
    const currentUser = getCurrentUserProfile();
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
                ? currentUser.name.split(' ').map((word) => word[0]).join('').substring(0, 2).toUpperCase()
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
        if (role === 'student' || role === 'admin') {
            extraDisplay.textContent = currentUser.extra || 'Belum diatur';
        } else if (role === 'teacher') {
            const subjects = currentUser.extra ? currentUser.extra.split(',').map((subject) => subject.trim()).filter(Boolean) : [];
            if (subjects.length > 0) {
                extraDisplay.innerHTML = subjects.map((subject) => `<span class="badge badge-outline" style="margin-right:5px; margin-bottom:5px;">${subject}</span>`).join('');
            } else {
                extraDisplay.textContent = 'Belum ada mata pelajaran.';
            }
        }
    }

    const greetingEl = document.getElementById('student-greeting');
    if (greetingEl && currentUser.name) {
        const firstName = currentUser.name.split(' ')[0];
        greetingEl.innerHTML = `Halo, ${firstName}! ðŸ‘‹`;
    }
};

async function initGlobalFeatures() {
    if (window.B2B_Supabase && window.B2B_Supabase.setupRealtimeBroadcast) {
        window.B2B_Supabase.setupRealtimeBroadcast((payload) => {
            if (window.showToast) {
                showToast(`ðŸ“¢ PENGUMUMAN: ${payload.new.content}`, 'info');
            }
        });
    }
}

const baseUpdateProfileUI = window.updateProfileUI;
window.updateProfileUI = function() {
    baseUpdateProfileUI();

    const currentUser = getCurrentUserProfile();
    const greetingEl = document.getElementById('student-greeting');
    if (greetingEl && currentUser.name) {
        const firstName = currentUser.name.split(' ')[0];
        greetingEl.textContent = `Halo, ${firstName}!`;
    }
};

async function initGlobalFeatures() {
    if (window.B2B_Supabase && window.B2B_Supabase.setupRealtimeBroadcast) {
        window.B2B_Supabase.setupRealtimeBroadcast((payload) => {
            if (window.showToast) {
                showToast(`Pengumuman: ${payload.new.content}`, 'info');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initGlobalFeatures();
    if (window.updateProfileUI) window.updateProfileUI();
});

function deferDropdownAction(callback) {
    requestAnimationFrame(() => {
        setTimeout(callback, 0);
    });
}

document.addEventListener('click', function(event) {
    const dropdownAction = event.target.closest('a.dropdown-item[data-dropdown-action]');
    if (dropdownAction) {
        event.preventDefault();

        const action = dropdownAction.dataset.dropdownAction;
        const dropdown = dropdownAction.closest('.dropdown-menu');
        if (dropdown) dropdown.classList.add('hidden');

        deferDropdownAction(() => {
            if (action === 'settings' && window.openSettingsModal) {
                window.openSettingsModal();
            } else if (action === 'logout' && window.handleLogout) {
                window.handleLogout();
            }
        });
        return;
    }

    const isDropdownTrigger = event.target.closest('.user-profile-trigger') || event.target.closest('.settings-gear-btn');
    const isDropdownMenu = event.target.closest('.dropdown-menu') || event.target.closest('.notif-dropdown');

    if (!isDropdownTrigger && !isDropdownMenu) {
        const dropdowns = document.querySelectorAll('.dropdown-menu, .notif-dropdown');
        dropdowns.forEach((dropdown) => {
            dropdown.classList.add('hidden');
        });
    }
});

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

window.printReport = function(contentHtml, title = 'Laporan Bites2Bytes') {
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
