document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const mpinInput = document.getElementById('mpin');
    const toggleMpinBtn = document.getElementById('toggle-mpin');
    const errorAlert = document.getElementById('error-message');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.spinner');

    // Toggle MPIN visibility
    toggleMpinBtn.addEventListener('click', () => {
        const type = mpinInput.getAttribute('type') === 'password' ? 'text' : 'password';
        mpinInput.setAttribute('type', type);
        toggleMpinBtn.textContent = type === 'password' ? '👁️' : '🙈';
    });

    /**
     * Ambil daftar user secara dinamis
     */
    function getUsers() {
        const storedUsers = JSON.parse(localStorage.getItem('b2b_users') || '[]');

        // Map b2b_users ke format login
        const dynamicUsers = storedUsers.map(u => ({
            id: u.id,
            name: u.name,
            mpin: u.mpin,
            role: u.role,
            redirectUrl: u.role === 'student'
                ? '/student'
                : '/teacher'
        }));

        // Admin hardcoded (karena admin pusat biasanya tidak di manage di tabel user biasa)
        const adminUser = { 
            id: 'admin', 
            name: 'Administrator', 
            mpin: '123456', 
            role: 'admin', 
            redirectUrl: '/admin' 
        };

        return [adminUser, ...dynamicUsers];
    }

    // Handle Login Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset Error
        errorAlert.classList.add('hidden');
        
        const username = usernameInput.value.trim();
        const mpin = mpinInput.value;

        // UI Loading State
        submitBtn.disabled = true;
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');

        try {
            // 1. Authenticate with Supabase
            // We use a virtual email format: id@bites2bytes.com and MPIN as password
            const email = `${username}@bites2bytes.com`;
            const { data, error } = await window.B2B_Supabase.client.auth.signInWithPassword({
                email: email,
                password: mpin,
            });

            if (error) throw error;

            const user = data.user;
            
            // 2. Fetch full profile from 'profiles' table
            const { data: profile, error: profileError } = await window.B2B_Supabase.client
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;

            // 3. Set redirection based on role
            let redirectUrl = '/student';
            if (profile.role === 'teacher') redirectUrl = '/teacher';
            if (profile.role === 'admin') redirectUrl = '/admin';

            // Store minimal session info for legacy support (if needed)
            localStorage.setItem('b2b_currentUser', JSON.stringify({
                ...profile,
                loginTime: new Date().toISOString()
            }));

            // Success UI
            if (window.showToast) {
                showToast(`Selamat datang kembali, ${profile.name}!`, 'success');
            }

            // Transition Skeleton Loading
            setTimeout(() => {
                const overlay = document.createElement('div');
                overlay.className = 'loading-overlay fade-in';
                overlay.innerHTML = `
                    <div class="glass" style="width: 300px; padding: 2rem; border-radius: 20px; display:flex; flex-direction:column; align-items:center; background: var(--glass-bg);">
                        <div class="skeleton-circle" style="width: 60px; height: 60px; margin-bottom: 1rem;"></div>
                        <div class="skeleton-text" style="width: 80%;"></div>
                        <div class="skeleton-text" style="width: 60%;"></div>
                        <div class="skeleton-text" style="width: 90%; height: 100px; margin-top: 1rem; border-radius: 12px;"></div>
                        <p class="text-sm" style="margin-top: 1rem; color: var(--text-muted);">Mempersiapkan Dasbor...</p>
                    </div>
                `;
                document.body.appendChild(overlay);

                // Redirect
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 1500);
            }, 800);

        } catch (error) {
            console.error("Login failed:", error.message);
            if (window.showToast) {
                showToast(error.message || "ID atau MPIN salah. Silakan coba lagi.", "error");
            }
            
            // Reset UI
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
            mpinInput.value = '';
            mpinInput.focus();
        }
    });

    // ---- Developer Seeding Tools ---- //
    const seedBtn = document.getElementById('seed-admin-btn');
    if (seedBtn) {
        seedBtn.addEventListener('click', async () => {
            if (!confirm("Buat akun admin default 'admin' / '123456'?")) return;
            
            try {
                const { data, error } = await window.B2B_Supabase.client.auth.signUp({
                    email: 'admin@bites2bytes.com',
                    password: '123456',
                    options: {
                        data: {
                            name: 'Super Admin',
                            role: 'admin',
                            wa_number: 'admin'
                        }
                    }
                });

                if (error) throw error;
                showToast("Akun admin berhasil dibuat! Silakan login.", "success");
                seedBtn.style.display = 'none';
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    }
});
