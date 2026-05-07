document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const mpinInput = document.getElementById('mpin');
    const toggleMpinBtn = document.getElementById('toggle-mpin');
    const errorAlert = document.getElementById('error-message');
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.spinner');

    function afterNextPaint(callback) {
        requestAnimationFrame(() => {
            setTimeout(callback, 0);
        });
    }

    function setLoadingState(isLoading) {
        submitBtn.disabled = isLoading;
        submitBtn.setAttribute('aria-busy', String(isLoading));
        btnText.classList.toggle('hidden', isLoading);
        spinner.classList.toggle('hidden', !isLoading);
    }

    function showRedirectOverlay(role, redirectUrl) {
        afterNextPaint(() => {
            const overlay = document.createElement('div');
            overlay.className = 'loading-overlay fade-in';
            overlay.innerHTML = `
                <div class="glass" style="width: 300px; padding: 2rem; border-radius: 20px; display:flex; flex-direction:column; align-items:center; background: var(--glass-bg);">
                    <div class="spinner mb-20"></div>
                    <p class="text-sm" style="color: var(--text-muted);">Mengarahkan ke Dasbor ${role}...</p>
                </div>
            `;
            document.body.appendChild(overlay);
            setTimeout(() => window.location.href = redirectUrl, 1200);
        });
    }

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
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Reset Error
        errorAlert.classList.add('hidden');

        const username = usernameInput.value.trim();
        const mpin = mpinInput.value.trim();

        // UI Loading State
        setLoadingState(true);

        afterNextPaint(() => runLogin(username, mpin));
    });

    async function runLogin(username, mpin) {
        try {
            console.log("Attempting login for:", username);
            const email = username.includes('@') ? username : `${username}@bites2bytes.com`;

            // 1. Try to authenticate
            let { data, error } = await window.B2B_Supabase.client.auth.signInWithPassword({
                email: email,
                password: mpin,
            });

            // If it fails with invalid credentials, try the default seed password 'password123'
            // This handles cases where seeding used the default password instead of MPIN
            if (error && error.message.includes("Invalid login credentials")) {
                console.log("Retrying with default seed password...");
                const retry = await window.B2B_Supabase.client.auth.signInWithPassword({
                    email: email,
                    password: 'password123',
                });
                data = retry.data;
                error = retry.error;
            }

            if (error) throw error;

            const user = data.user;
            console.log("Auth success for UUID:", user.id);

            // 2. Fetch full profile from 'profiles' table
            const { data: profile, error: profileError } = await window.B2B_Supabase.client
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error("Profile Fetch Error:", profileError);
                throw new Error("Akun ditemukan, tapi Profil (data dashboard) belum dibuat. Silakan hubungi admin atau Klik 'Seed' lagi.");
            }

            // 3. Set redirection based on role
            let redirectUrl = '/student';
            if (profile.role === 'teacher') redirectUrl = '/teacher';
            if (profile.role === 'admin') redirectUrl = '/admin';

            const profileOverrides = JSON.parse(localStorage.getItem('b2b_profile_overrides') || '{}');
            const profileOverride = profileOverrides[profile.id] || profileOverrides[profile.wa_number] || {};
            const mergedProfile = {
                ...profile,
                ...profileOverride,
                name: profileOverride.name || profileOverride.full_name || profile.full_name || profile.name || 'User',
                full_name: profileOverride.full_name || profileOverride.name || profile.full_name || profile.name || 'User',
                loginTime: new Date().toISOString()
            };

            localStorage.setItem('b2b_currentUser', JSON.stringify(mergedProfile));

            if (window.showToast) {
                showToast(`Selamat datang, ${mergedProfile.full_name || mergedProfile.name || 'User'}!`, 'success');
            }

            // Transition Loading
            setTimeout(() => {
                showRedirectOverlay(profile.role, redirectUrl);
            }, 500);

        } catch (error) {
            console.error("Login process error:", error);

            let displayMsg = error.message || "ID atau MPIN salah.";
            if (error.message.includes("Email not confirmed")) {
                displayMsg = "Email belum dikonfirmasi! Matikan 'Email Confirmation' di Supabase Settings.";
            } else if (error.message.includes("Invalid login credentials")) {
                displayMsg = "ID atau Password salah. Jika baru klik 'Seed', gunakan password123.";
            }

            if (window.showToast) {
                showToast(displayMsg, "error");
            } else {
                errorAlert.textContent = displayMsg;
                errorAlert.classList.remove('hidden');
            }

            setLoadingState(false);
            mpinInput.value = '';
            mpinInput.focus();
        }
    }

    // ---- Developer Seeding Tools ---- //
    const seedBtn = document.getElementById('seed-admin-btn');
    if (seedBtn) {
        seedBtn.addEventListener('click', async () => {
            const confirmMsg = "Hapus data lama dan buat akun test baru?\n\n" +
                             "Email: [role]@bites2bytes.com\n" +
                             "Password: password123\n\n" +
                             "Pastikan 'Email Confirmation' di Supabase sudah OFF!";
            if (!confirm(confirmMsg)) return;

            const testUsers = [
                { id: 'admin', name: 'Super Admin', role: 'admin', mpin: '123456' },
                { id: '62812345678', name: 'Siswa Test', role: 'student', mpin: '142536' },
                { id: 'B2B-T-8812', name: 'Guru Test', role: 'teacher', mpin: '888222' }
            ];

            seedBtn.disabled = true;
            seedBtn.textContent = "⏳ Processing...";

            try {
                const accounts = [];
                for (const u of testUsers) {
                    const email = `${u.id}@bites2bytes.com`;
                    const password = 'password123'; // Standardized password for ease of use

                    // 1. Auth Signup
                    let { data, error } = await window.B2B_Supabase.client.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: u.name,
                                role: u.role,
                                wa_number: u.id
                            }
                        }
                    });

                    let userId;
                    if (error) {
                        if (error.message.includes("already registered")) {
                            console.warn(`${email} already in Auth. Attempting to retrieve ID via sign-in...`);
                            // Try to sign in to get the UUID (using either password123 or their mpin)
                            const loginTry = await window.B2B_Supabase.client.auth.signInWithPassword({ email, password });
                            if (loginTry.data?.user) {
                                userId = loginTry.data.user.id;
                            } else {
                                // Try MPIN as fallback for older seeds
                                const loginRetry = await window.B2B_Supabase.client.auth.signInWithPassword({ email, password: u.mpin });
                                if (loginRetry.data?.user) userId = loginRetry.data.user.id;
                            }
                        } else {
                            throw error;
                        }
                    } else if (data?.user) {
                        userId = data.user.id;
                    }

                    // 2. Manual Profile Upsert (in case trigger missed it or user existed)
                    if (userId) {
                        const { error: profError } = await window.B2B_Supabase.client
                            .from('profiles')
                            .upsert({
                                id: userId,
                                full_name: u.name,
                                role: u.role,
                                wa_number: u.id,
                                mpin: u.mpin
                            });

                        if (!profError) {
                            accounts.push({ id: userId, role: u.role });
                            console.log(`Profile synced for ${u.role}: ${userId}`);
                        } else {
                            console.error(`Profile sync error for ${u.role}:`, profError);
                        }
                    } else {
                        console.error(`Could not retrieve UUID for ${email}. Please delete the user in Supabase Dashboard and re-seed.`);
                    }
                }

                if (accounts.length === 0) {
                    throw new Error("Gagal membuat akun. Mungkin user sudah ada di Supabase Auth tapi tidak bisa diakses. Silakan hapus User di Supabase Dashboard (Authentication) lalu klik Seed lagi.");
                }

                // 3. Seed Base Module & Enrollment
                const teacher = accounts.find(a => a.role === 'teacher');
                const student = accounts.find(a => a.role === 'student');

                if (teacher) {
                    const { data: newMod, error: modError } = await window.B2B_Supabase.client
                        .from('modules')
                        .insert({
                            title: 'Python Masterclass',
                            summary: 'Belajar pemrograman Python dari dasar hingga mahir.',
                            teacher_id: teacher.id,
                            topics: [
                                { id: 'top-1', title: 'Variabel & Tipe Data', content: 'Intro to Python variables.' },
                                { id: 'top-2', title: 'Logic & Loops', content: 'Control flow in Python.' }
                            ]
                        })
                        .select()
                        .single();

                    if (!modError && student) {
                        await window.B2B_Supabase.client
                            .from('enrollments')
                            .insert({
                                student_id: student.id,
                                teacher_id: teacher.id,
                                module_id: newMod.id
                            });
                    }
                }

                showToast("Seeding Berhasil! Gunakan password123 untuk login.", "success");
                seedBtn.style.display = 'none';
            } catch (err) {
                console.error("Seed Error:", err);
                showToast(err.message, "error");
                seedBtn.disabled = false;
                seedBtn.textContent = "🚀 Re-Try Seeding";
            }
        });
    }
});
