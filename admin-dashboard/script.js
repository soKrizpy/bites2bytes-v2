// File: admin-dashboard/script.js

document.addEventListener('DOMContentLoaded', () => {
    const isDemoSession = () => !!localStorage.getItem('b2b_demo_session');

    // ---- Perbarui UI Profil Secara Dinamis ---- //
    if (window.updateProfileUI) window.updateProfileUI();

    // ---- Logic Tab Navigasi Sidebar ---- //
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');

    const closeMobileSidebar = () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.add('hidden');
        }
    };

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            sidebarOverlay.classList.remove('hidden');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                pane.classList.add('hidden');
            });

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            const targetPane = document.getElementById(targetId);
            
            if(targetPane) {
                targetPane.classList.remove('hidden');
                targetPane.classList.add('active');
                
                // Trigger refresh data if needed
                if (targetId === 'users-management-tab') {
                    renderUserTable('student', 'students-table-body');
                    renderUserTable('teacher', 'teachers-table-body');
                    renderEnrollmentTable();
                } else if (targetId === 'curriculum-tab') {
                    renderCurriculum();
                } else if (targetId === 'finance-tab') {
                    renderFinanceTab();
                }
            }

            // Close sidebar on mobile after selection
            closeMobileSidebar();
        });
    });

    // ---- Logic Toggle MPIN (Global Function) ---- //
    window.toggleMPIN = (id) => {
        const mpinInput = document.getElementById(`mpin-${id}`);
        const btn = mpinInput.nextElementSibling;
        
        if (mpinInput.type === 'password') {
            mpinInput.type = 'text';
            btn.textContent = '🔒';
            btn.setAttribute('title', 'Sembunyikan MPIN');
        } else {
            mpinInput.type = 'password';
            btn.textContent = '👁️';
            btn.setAttribute('title', 'Tampilkan MPIN');
        }
    };

    // ======================================================
    // STAT CARDS LIVE — Hubungkan ke Supabase
    // ======================================================
    function getDemoDashboardStats() {
        const users = JSON.parse(localStorage.getItem('b2b_users') || '[]');
        const enrollments = JSON.parse(localStorage.getItem('b2b_enrollments') || '[]');

        const studentCount = users.filter(user => user.role === 'student').length;
        const teacherCount = users.filter(user => user.role === 'teacher').length;
        const enrollmentCount = enrollments.filter(enrollment => enrollment.status === 'active').length;

        return {
            studentCount,
            teacherCount,
            enrollmentCount,
            total: studentCount + teacherCount
        };
    }

    async function updateDashboardStats() {
        try {
            if (isDemoSession()) {
                const stats = getDemoDashboardStats();
                const statTotal = document.getElementById('stat-total');
                const statStudents = document.getElementById('stat-students');
                const statTeachers = document.getElementById('stat-teachers');
                const statEnrollments = document.getElementById('stat-enrollments');

                if (statTotal) statTotal.textContent = String(stats.total);
                if (statStudents) statStudents.textContent = String(stats.studentCount);
                if (statTeachers) statTeachers.textContent = String(stats.teacherCount);
                if (statEnrollments) statEnrollments.textContent = String(stats.enrollmentCount);
                return;
            }

            const { count: studentCount } = await window.B2B_Supabase.client
                .from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
            
            const { count: teacherCount } = await window.B2B_Supabase.client
                .from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher');

            const { count: enrollmentCount } = await window.B2B_Supabase.client
                .from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active');

            const total = (studentCount || 0) + (teacherCount || 0);

            const statTotal = document.getElementById('stat-total');
            const statStudents = document.getElementById('stat-students');
            const statTeachers = document.getElementById('stat-teachers');
            const statEnrollments = document.getElementById('stat-enrollments');

            if (statTotal) animateCount(statTotal, total, 1000, 0);
            if (statStudents) animateCount(statStudents, studentCount || 0);
            if (statTeachers) animateCount(statTeachers, teacherCount || 0);
            if (statEnrollments) animateCount(statEnrollments, enrollmentCount || 0);
        } catch (err) {
            console.error("Stats error:", err);
        }
    }

    updateDashboardStats();

    // ======================================================
    // LEADERBOARD & TEACHER PERFORMANCE (IKHTISAR SISTEM)
    // ======================================================
    async function renderAdminLeaderboard() {
        const tbody = document.getElementById('admin-leaderboard-body');
        if (!tbody) return;

        try {
            const { data: leaderboard, error } = await window.B2B_Supabase.client
                .from('progress')
                .select('xp, profiles:student_id(name)')
                .order('xp', { ascending: false })
                .limit(5);

            if (error) throw error;

            if (!leaderboard || leaderboard.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Belum ada data siswa.</td></tr>';
                return;
            }

            tbody.innerHTML = leaderboard.map((st, idx) => `
                <tr>
                    <td style="text-align:center">
                        ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </td>
                    <td class="fw-bold">${st.profiles?.name || 'Siswa'}</td>
                    <td style="color:var(--primary-color); font-weight:bold">${st.xp} XP</td>
                    <td>Aktif Belajar</td>
                </tr>
            `).join('');
        } catch (err) {
            console.error("Leaderboard error:", err);
        }
    }

    async function renderAdminTeacherPerformance() {
        const tbody = document.getElementById('admin-teacher-performance-body');
        if (!tbody) return;

        try {
            const { data: teachers, error } = await window.B2B_Supabase.client
                .from('profiles')
                .select('id, name, sessions:sessions(id)')
                .eq('role', 'teacher');

            if (error) throw error;

            const performanceData = teachers.map(tc => ({
                name: tc.name,
                sessionsLogged: tc.sessions?.length || 0
            })).sort((a, b) => b.sessionsLogged - a.sessionsLogged).slice(0, 5);

            if (performanceData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Belum ada data guru.</td></tr>';
                return;
            }

            tbody.innerHTML = performanceData.map(tc => `
                <tr>
                    <td class="fw-bold">${tc.name}</td>
                    <td>${tc.sessionsLogged} Sesi</td>
                    <td style="color:var(--success-color); font-weight:bold">Aktif</td>
                </tr>
            `).join('');
        } catch (err) {
            console.error("Performance error:", err);
        }
    }

    renderAdminLeaderboard();
    renderAdminTeacherPerformance();

    renderAdminLeaderboard();
    renderAdminTeacherPerformance();

    // ======================================================
    // TABEL SISWA & GURU
    // ======================================================
    // Initial render
    renderUserTable('student', 'students-table-body');
    renderUserTable('teacher', 'teachers-table-body');

    // ======================================================
    // SISTEM BROADCAST
    // ======================================================
    const broadcastInput = document.getElementById('broadcast-message');
    const broadcastImage = document.getElementById('broadcast-image');
    const sendBroadcastBtn = document.getElementById('send-broadcast-btn');

    if (sendBroadcastBtn) {
        sendBroadcastBtn.addEventListener('click', () => {
            const msg = broadcastInput.value.trim();
            const img = broadcastImage.value.trim();
            const targetEl = document.getElementById('broadcast-target');
            const targetVal = targetEl ? targetEl.value : 'all';

            if (!msg) {
                showToast("Pesan tidak boleh kosong!", "error");
                return;
            }

            const broadcastData = {
                id: Date.now(),
                message: msg,
                imageUrl: img || null,
                sender: "Admin",
                target: targetVal,
                timestamp: new Date().toISOString()
            };

            localStorage.setItem('b2b_broadcast', JSON.stringify(broadcastData));
            
            // Trigger checkBroadcast locally since storage event doesn't fire in the same window
            if (window.checkBroadcast) {
                window.checkBroadcast();
            }
            
            showToast("Banner pengumuman berhasil dikirim!", "success");
            broadcastInput.value = '';
            broadcastImage.value = '';
        });
    }

    // ======================================================
    // MODAL & CRUD
    // ======================================================
    window.openModal = (id) => {
        document.getElementById(id).classList.remove('hidden');
        // Reset titles/buttons if they were in edit mode
        if (id === 'user-modal') {
            document.getElementById('user-modal-title').textContent = 'Tambah Pengguna Baru 👥';
            document.getElementById('user-modal-submit').textContent = 'Simpan Pengguna';
            document.getElementById('edit-user-original-id').value = '';
            document.getElementById('add-user-form').reset();
        }
        if (id === 'module-modal') {
            document.getElementById('module-modal-title').textContent = 'Buat Modul Baru 📚';
            document.getElementById('module-modal-submit').textContent = 'Terbitkan Modul';
            document.getElementById('edit-module-id').value = '';
            document.getElementById('add-module-form').reset();
        }
        // Populate dropdown enrollment modal jika yang dibuka adalah enrollment-modal
        if (id === 'enrollment-modal') populateEnrollmentDropdowns();
    };
    window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

    const addUserForm = document.getElementById('add-user-form');
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const originalId = document.getElementById('edit-user-original-id').value;
            const wa_number = document.getElementById('new-user-id').value.trim();
            const name = document.getElementById('new-user-name').value.trim();
            const role = document.getElementById('new-user-role').value;
            const mpin = document.getElementById('new-user-mpin').value.trim();

            try {
                if (!/^\d{6}$/.test(mpin)) {
                    throw new Error('MPIN harus 6 digit angka.');
                }

                if (originalId) {
                    // EDIT MODE
                    const { error } = await window.B2B_Supabase.client
                        .from('profiles')
                        .update({ name, role, mpin, wa_number })
                        .eq('id', originalId);
                    if (error) throw error;
                    showToast(`Data ${name} berhasil diperbarui!`, 'success');
                } else {
                    const currentAdmin = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
                    const adminLoginId = currentAdmin.wa_number || currentAdmin.id || 'admin';
                    const adminMpin = currentAdmin.mpin || '123456';
                    const email = `${wa_number}@bites2bytes.com`;

                    const { data: existingUsers, error: existingError } = await window.B2B_Supabase.client
                        .from('profiles')
                        .select('*')
                        .eq('wa_number', wa_number);

                    if (existingError) throw existingError;
                    if (existingUsers && existingUsers.length > 0) {
                        throw new Error('ID / Nomor WA tersebut sudah terdaftar.');
                    }

                    const { data: signUpData, error: signUpError } = await window.B2B_Supabase.client.auth.signUp({
                        email,
                        password: mpin,
                        options: {
                            data: {
                                name,
                                role,
                                wa_number
                            }
                        }
                    });

                    if (signUpError) throw signUpError;

                    if (signUpData?.user?.id) {
                        const { error: profileUpdateError } = await window.B2B_Supabase.client
                            .from('profiles')
                            .update({ name, role, mpin, wa_number })
                            .eq('id', signUpData.user.id);

                        if (profileUpdateError && profileUpdateError.code !== 'PGRST116') {
                            console.warn('Profile sync warning:', profileUpdateError);
                        }
                    }

                    const restoreResult = await window.B2B_Supabase.client.auth.signInWithPassword({
                        email: `${adminLoginId}@bites2bytes.com`,
                        password: adminMpin
                    });

                    if (restoreResult.error) {
                        console.warn('Admin session restore warning:', restoreResult.error);
                    }

                    showToast(`Akun ${role === 'student' ? 'siswa' : 'guru'} untuk ${name} berhasil dibuat!`, 'success');
                }

                closeModal('user-modal');
                addUserForm.reset();
                renderUserTable('student', 'students-table-body');
                renderUserTable('teacher', 'teachers-table-body');
                updateDashboardStats();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    }

    window.editUser = (id) => {
        const users = JSON.parse(localStorage.getItem('b2b_users') || '[]');
        const user = users.find(u => u.id === id);
        if (!user) return;

        document.getElementById('user-modal-title').textContent = 'Edit Pengguna ✏️';
        document.getElementById('user-modal-submit').textContent = 'Update Pengguna';
        document.getElementById('edit-user-original-id').value = user.id;
        
        document.getElementById('new-user-id').value = user.id;
        document.getElementById('new-user-name').value = user.name;
        document.getElementById('new-user-role').value = user.role;
        document.getElementById('new-user-mpin').value = user.mpin;

        document.getElementById('user-modal').classList.remove('hidden');
    };

    const addModuleForm = document.getElementById('add-module-form');
    if (addModuleForm) {
        addModuleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = document.getElementById('edit-module-id').value;
            const title = document.getElementById('new-module-title').value.trim();
            const summary = document.getElementById('new-module-summary').value.trim();
            const teacher = document.getElementById('new-module-teacher').value.trim();
            
            try {
                if (editId) {
                    const { error } = await window.B2B_Supabase.client
                        .from('modules')
                        .update({
                            title,
                            summary,
                            teacher_id: teacher || null
                        })
                        .eq('id', editId);

                    if (error) throw error;
                    showToast(`Modul "${title}" diperbarui!`, 'success');
                } else {
                    const { error } = await window.B2B_Supabase.client
                        .from('modules')
                        .insert({
                            id: 'mod-' + Date.now(),
                            title,
                            summary,
                            teacher_id: teacher || null,
                            topics: [],
                            exam: []
                        });

                    if (error) throw error;
                    showToast(`Modul "${title}" berhasil diterbitkan!`, 'success');
                }

                closeModal('module-modal');
                addModuleForm.reset();
                populateEnrollmentDropdowns();
                renderCurriculum();
            } catch (err) {
                console.error('Module save error:', err);
                showToast(err.message || 'Modul gagal disimpan.', 'error');
            }
        });
    }

    window.editModule = async (id) => {
        try {
            const { data: mod, error } = await window.B2B_Supabase.client
                .from('modules')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!mod) return;

        document.getElementById('module-modal-title').textContent = 'Edit Modul ✏️';
        document.getElementById('module-modal-submit').textContent = 'Update Modul';
        document.getElementById('edit-module-id').value = mod.id;
        
        document.getElementById('new-module-title').value = mod.title;
        document.getElementById('new-module-summary').value = mod.summary || '';
        document.getElementById('new-module-teacher').value = mod.teacher_id || mod.teacherId || '';

        document.getElementById('module-modal').classList.remove('hidden');
        } catch (err) {
            console.error('Module edit error:', err);
            showToast(err.message || 'Modul tidak dapat dibuka.', 'error');
        }
    };

    // ======================================================
    // ENROLLMENT MANAGEMENT
    // ======================================================

    /** Populate dropdown di modal enrollment dari data LocalStorage */
    function populateEnrollmentDropdowns() {
        const users = JSON.parse(localStorage.getItem('b2b_users') || '[]');
        const modules = JSON.parse(localStorage.getItem('b2b_modules') || '[]');

        const studentSel = document.getElementById('enr-student');
        const teacherSel = document.getElementById('enr-teacher');
        const moduleSel = document.getElementById('enr-module');

        if (!studentSel || !teacherSel || !moduleSel) return;

        // Siswa
        studentSel.innerHTML = '<option value="">-- Pilih Siswa --</option>';
        users.filter(u => u.role === 'student').forEach(u => {
            studentSel.innerHTML += `<option value="${u.id}" data-name="${u.name}">${u.name} (${u.id})</option>`;
        });

        // Guru
        teacherSel.innerHTML = '<option value="">-- Pilih Guru --</option>';
        users.filter(u => u.role === 'teacher').forEach(u => {
            teacherSel.innerHTML += `<option value="${u.id}" data-name="${u.name}">${u.name}</option>`;
        });

        // Modul
        moduleSel.innerHTML = '<option value="">-- Pilih Modul --</option>';
        modules.forEach(m => {
            moduleSel.innerHTML += `<option value="${m.id}" data-name="${m.title}">${m.title}</option>`;
        });
    }

    /** Render tabel enrollment */
    async function renderEnrollmentTable() {
        const tbody = document.getElementById('enrollment-table-body');
        if (!tbody) return;

        try {
            const { data: enrollments, error } = await window.B2B_Supabase.client
                .from('enrollments')
                .select('*, student:student_id(name), teacher:teacher_id(name), module:module_id(title)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!enrollments || enrollments.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted p-20">Belum ada enrollment. Silakan assign siswa ke guru.</td></tr>';
                return;
            }

            tbody.innerHTML = enrollments.map(enr => `
                <tr class="fade-in">
                    <td>
                        <div class="flex items-center gap-2">
                            <div class="avatar" style="width:30px; height:30px; font-size:10px; background:var(--primary-color)">${enr.student?.name ? enr.student.name.charAt(0) : '?'}</div>
                            <div>
                                <div class="fw-bold text-sm">${enr.student?.name || 'Siswa'}</div>
                                <div class="text-xs text-muted">${enr.student_id}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="fw-bold text-sm">${enr.teacher?.name || 'Guru'}</div>
                        <div class="text-xs text-muted">${enr.teacher_id}</div>
                    </td>
                    <td><span class="badge badge-primary">${enr.module?.title || 'Modul'}</span></td>
                    <td class="text-xs text-muted">${formatDate(enr.created_at)}</td>
                    <td><span class="badge ${enr.status === 'active' ? 'badge-success' : 'badge-warning'}">${enr.status === 'active' ? '✅ Aktif' : '⏸ Nonaktif'}</span></td>
                    <td>
                        <button class="icon-btn-sm text-warning" title="Nonaktifkan" onclick="toggleEnrollmentStatus('${enr.id}', '${enr.status}')">⏸</button>
                        <button class="icon-btn-sm text-danger" title="Hapus" onclick="deleteEnrollment('${enr.id}')">🗑️</button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error("Enrollment render error:", err);
        }
    }

    /** Form submit: tambah enrollment baru */
    const enrollmentForm = document.getElementById('enrollment-form');
    if (enrollmentForm) {
        enrollmentForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const studentSel = document.getElementById('enr-student');
            const teacherSel = document.getElementById('enr-teacher');
            const moduleSel = document.getElementById('enr-module');

            const studentId = studentSel.value;
            const studentName = studentSel.options[studentSel.selectedIndex].getAttribute('data-name');
            const teacherId = teacherSel.value;
            const teacherName = teacherSel.options[teacherSel.selectedIndex].getAttribute('data-name');
            const moduleId = moduleSel.value;
            const moduleName = moduleSel.options[moduleSel.selectedIndex].getAttribute('data-name');

            if (!studentId || !teacherId || !moduleId) {
                showToast("Lengkapi semua pilihan!", "error");
                return;
            }

            const enrollments = JSON.parse(localStorage.getItem('b2b_enrollments') || '[]');

            // Cegah duplikasi enrollment (siswa + modul yang sama)
            const duplicate = enrollments.find(e => e.studentId === studentId && e.moduleId === moduleId);
            if (duplicate) {
                showToast("Siswa ini sudah terdaftar di modul tersebut!", "error");
                return;
            }

            const newEnrollment = {
                id: 'enr-' + Date.now(),
                studentId,
                studentName,
                teacherId,
                teacherName,
                moduleId,
                moduleName,
                enrolledAt: new Date().toISOString().split('T')[0],
                status: 'active'
            };

            enrollments.push(newEnrollment);
            localStorage.setItem('b2b_enrollments', JSON.stringify(enrollments));

            showToast(`${studentName} berhasil di-assign ke ${teacherName}!`, 'success');
            closeModal('enrollment-modal');
            enrollmentForm.reset();
            renderEnrollmentTable();
            updateDashboardStats();
        });
    }

    /** Toggle status enrollment aktif/nonaktif */
    window.toggleEnrollmentStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            const { error } = await window.B2B_Supabase.client
                .from('enrollments')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            showToast("Status enrollment diperbarui.", "success");
            renderEnrollmentTable();
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    /** Hapus enrollment */
    window.deleteEnrollment = async (id) => {
        const confirmed = await window.showConfirmDialog({
            title: 'Hapus Enrollment',
            message: 'Siswa tidak akan lagi terhubung ke guru dan modul pada enrollment ini.',
            confirmText: 'Hapus Enrollment',
            cancelText: 'Batal',
            danger: true
        });

        if (!confirmed) return;

        try {
            const { error } = await window.B2B_Supabase.client
                .from('enrollments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast("Enrollment berhasil dihapus.", "success");
            renderEnrollmentTable();
            updateDashboardStats();
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    // ======================================================
    // FINANCE TAB — Honorarium & Session Log
    // ======================================================
    // ======================================================
    // FINANCE TAB — Honorarium & Session Log
    // ======================================================
    async function renderFinanceTab() {
        try {
            const { data: sessions, error } = await window.B2B_Supabase.client
                .from('sessions')
                .select('*, profiles:student_id(name)')
                .order('date', { ascending: false });

            if (error) throw error;

            // --- Hitung Statistik Keseluruhan ---
            const totalSessions = sessions.length;
            const hadirSessions = sessions.filter(s => s.attendance === 'hadir');
            const attendanceRate = totalSessions > 0 ? Math.round((hadirSessions.length / totalSessions) * 100) : 0;
            const totalHonorarium = hadirSessions.reduce((sum, s) => sum + (s.honorarium || 0), 0);

            // Update stat cards
            const elTotal = document.getElementById('finance-total-honorarium');
            const elSessions = document.getElementById('finance-total-sessions');
            const elRate = document.getElementById('finance-attendance-rate');
            const elAverage = document.getElementById('finance-avg-honorarium');

            if (elTotal) elTotal.textContent = formatRupiah(totalHonorarium);
            if (elSessions) elSessions.textContent = `${hadirSessions.length} sesi hadir dari ${totalSessions} total`;
            if (elRate) elRate.textContent = `${attendanceRate}%`;
            if (elAverage) {
                const teacherIds = [...new Set(sessions.map(ses => ses.teacher_id).filter(Boolean))];
                const averageHonorarium = teacherIds.length > 0 ? Math.round(totalHonorarium / teacherIds.length) : 0;
                elAverage.textContent = formatRupiah(averageHonorarium);
            }

            // --- Log Sesi ---
            const sessionsBody = document.getElementById('finance-sessions-body');
            if (sessionsBody) {
                if (sessions.length === 0) {
                    sessionsBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Belum ada sesi tercatat.</td></tr>';
                } else {
                    sessionsBody.innerHTML = sessions.map(ses => `
                        <tr class="fade-in">
                            <td class="text-xs text-muted">${formatDate(ses.date)}</td>
                            <td class="fw-bold text-sm">${ses.profiles?.name || 'Siswa'}</td>
                            <td class="text-sm">${getTeacherName(ses.teacher_id)}</td>
                            <td class="text-xs text-muted">${ses.topic}</td>
                            <td>
                                <span class="badge ${ses.attendance === 'hadir' ? 'badge-success' : 'badge-danger'}">
                                    ${ses.attendance === 'hadir' ? '✅ Hadir' : '❌ Absen'}
                                </span>
                            </td>
                            <td class="fw-bold">${ses.score !== null ? ses.score + '/100' : '<span class="text-muted">-</span>'}</td>
                        </tr>
                    `).join('');
                }
            }
        } catch (err) {
            console.error("Finance error:", err);
        }
    }

    // ======================================================
    // KURIKULUM
    // ======================================================
    const modulesList = document.getElementById('modules-list');

    async function renderCurriculum() {
        if (!modulesList) return;

        try {
            const { data: modules, error } = await window.B2B_Supabase.client
                .from('modules')
                .select('*');

            if (error) throw error;

            if (!modules || modules.length === 0) {
                modulesList.innerHTML = '<div class="text-center p-8 text-muted">Belum ada modul. Silakan buat modul baru.</div>';
                return;
            }

            modulesList.innerHTML = modules.map(mod => `
                <div class="bento-box glass mb-15">
                    <div class="flex-between">
                        <div>
                            <h3 class="fw-bold">${mod.title}</h3>
                            <p class="text-xs text-muted">Modul ID: ${mod.id}</p>
                        </div>
                        <div class="flex gap-2">
                            <button type="button" class="btn btn-sm btn-outline" onclick="editModule('${mod.id}')">Edit</button>
                            <button type="button" class="btn btn-sm btn-outline text-danger" style="color: var(--danger-color);" onclick="deleteModule('${mod.id}')">Hapus</button>
                        </div>
                    </div>
                    <div class="mt-15 p-10 bg-darker rounded text-sm">
                        <strong>Keterangan:</strong> ${mod.summary || 'Modul pembelajaran Bites2Bytes.'}
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error("Curriculum error:", err);
        }
    }

    window.deleteModule = async (id) => {
        const confirmed = await window.showConfirmDialog({
            title: 'Hapus Modul',
            message: 'Modul ini akan dihapus. Enrollment lama yang masih menunjuk ke modul ini bisa terdampak.',
            confirmText: 'Hapus Modul',
            cancelText: 'Batal',
            danger: true
        });

        if (!confirmed) return;

        try {
            const { error } = await window.B2B_Supabase.client
                .from('modules')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast("Modul berhasil dihapus.", "success");
            populateEnrollmentDropdowns();
            renderCurriculum();
        } catch (err) {
            console.error('Module delete error:', err);
            showToast(err.message || 'Modul gagal dihapus.', 'error');
        }
    };

    // ======================================================
    // MANAJEMEN USER
    // ======================================================
    async function renderUserTable(role, tbodyId) {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) return;

        try {
            const { data: users, error } = await window.B2B_Supabase.client
                .from('profiles')
                .select('*')
                .eq('role', role)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!users || users.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted p-20">Belum ada data ${role === 'student' ? 'siswa' : 'guru'}.</td></tr>`;
                return;
            }

            tbody.innerHTML = users.map(user => `
                <tr class="fade-in">
                    <td><input type="checkbox" class="user-checkbox" data-id="${user.id}" data-role="${user.role}" onchange="updateBulkActionBar()"></td>
                    <td class="font-mono text-xs">${user.wa_number || user.id.substring(0,8)}</td>
                    <td><div class="flex items-center gap-2"><div class="avatar" style="width:30px; height:30px; font-size:10px; background:var(--primary-color)">${user.name ? user.name.charAt(0) : '?'}</div><span class="fw-bold">${user.name || 'User Baru'}</span></div></td>
                    <td><span class="badge ${user.role === 'student' ? 'badge-primary' : 'badge-success'}">${user.extra || (user.role === 'student' ? 'Basic' : 'Instruktur')}</span></td>
                    <td>
                        <div class="mpin-container">
                            <input type="password" value="${user.mpin || '******'}" class="mpin-input" id="mpin-${user.id}" readonly>
                            <button class="icon-btn-sm" onclick="toggleMPIN('${user.id}')">👁️</button>
                        </div>
                    </td>
                    <td>
                        <button class="icon-btn-sm text-info" onclick="editUser('${user.id}')">✏️</button>
                        <button class="icon-btn-sm text-danger" onclick="deleteUser('${user.id}')">🗑️</button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error("Table render error:", err);
        }
    }

    window.deleteUser = async (id) => {
        const confirmed = await window.showConfirmDialog({
            title: 'Hapus Pengguna',
            message: 'Pengguna ini akan dihapus dari daftar. Enrollment lama akan tetap tersimpan.',
            confirmText: 'Hapus Pengguna',
            cancelText: 'Batal',
            danger: true
        });

        if (!confirmed) return;

        let users = JSON.parse(localStorage.getItem('b2b_users') || '[]');
        users = users.filter(u => u.id !== id);
        localStorage.setItem('b2b_users', JSON.stringify(users));
        showToast("Pengguna berhasil dihapus", "success");
        renderUserTable('student', 'students-table-body');
        renderUserTable('teacher', 'teachers-table-body');
        updateDashboardStats();
    };

    // ======================================================
    // EVENT: Tab Click Handlers
    // ======================================================
    document.querySelector('[data-target="users-management-tab"]')?.addEventListener('click', () => {
        // Data refreshed in tab click handler above
    });
    document.querySelector('[data-target="curriculum-tab"]')?.addEventListener('click', () => {
        // Data refreshed in tab click handler above
    });
    document.querySelector('[data-target="finance-tab"]')?.addEventListener('click', () => {
        // Data refreshed in tab click handler above
    });

    // ---- Logic Sub-Tabs Manajemen Pengguna ---- //
    const subTabBtns = document.querySelectorAll('.sub-tab-btn');
    const subTabPanes = document.querySelectorAll('.sub-tab-pane');

    subTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            subTabBtns.forEach(b => {
                b.classList.remove('active', 'btn-primary');
                b.classList.add('btn-outline');
            });
            
            subTabPanes.forEach(pane => {
                pane.classList.remove('active');
                pane.classList.add('hidden');
            });

            btn.classList.add('active', 'btn-primary');
            btn.classList.remove('btn-outline');
            
            const targetId = btn.getAttribute('data-subtarget');
            const targetPane = document.getElementById(targetId);
            if(targetPane) {
                targetPane.classList.remove('hidden');
                targetPane.classList.add('active');
            }
        });
    });

    // ======================================================
    // LIVE SEARCH
    // ======================================================
    function setupSearch(inputId, tbodyId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = document.querySelectorAll(`#${tbodyId} tr`);
                rows.forEach(row => {
                    row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
                });
            });
        }
    }

    setupSearch('search-students', 'students-table-body');
    setupSearch('search-teachers', 'teachers-table-body');

    // ======================================================
    // HELPER UTILITIES
    // ======================================================
    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const opts = { day: 'numeric', month: 'short', year: 'numeric' };
        return new Date(dateStr).toLocaleDateString('id-ID', opts);
    }

    function formatRupiah(amount) {
        return 'Rp ' + (amount || 0).toLocaleString('id-ID');
    }

    function getTeacherName(teacherId) {
        const users = JSON.parse(localStorage.getItem('b2b_users') || '[]');
        return users.find(user => user.id === teacherId)?.name || 'Guru';
    }

    // ======================================================
    // BULK ACTIONS LOGIC
    // ======================================================
    window.toggleSelectAll = (role) => {
        const checkAll = document.getElementById(`check-all-${role}s`);
        const checkboxes = document.querySelectorAll(`#${role}s-table-body .user-checkbox`);
        checkboxes.forEach(cb => cb.checked = checkAll.checked);
        updateBulkActionBar();
    };

    window.updateBulkActionBar = () => {
        const selected = document.querySelectorAll('.user-checkbox:checked');
        const bar = document.getElementById('bulk-action-bar');
        const count = document.getElementById('selected-count');
        
        if (selected.length > 0) {
            bar.classList.remove('hidden');
            count.textContent = `${selected.length} dipilih`;
        } else {
            bar.classList.add('hidden');
        }
    };

    window.bulkAction = async (type) => {
        const selected = document.querySelectorAll('.user-checkbox:checked');
        const ids = Array.from(selected).map(cb => cb.getAttribute('data-id'));
        
        if (type === 'delete') {
            const confirmed = await window.showConfirmDialog({
                title: 'Hapus Pengguna Terpilih',
                message: `${ids.length} pengguna terpilih akan dihapus dari daftar ini.`,
                confirmText: 'Hapus Semua',
                cancelText: 'Batal',
                danger: true
            });

            if (!confirmed) return;

            let users = JSON.parse(localStorage.getItem('b2b_users') || '[]');
            users = users.filter(u => !ids.includes(u.id));
            localStorage.setItem('b2b_users', JSON.stringify(users));
            showToast(`${ids.length} pengguna berhasil dihapus.`, "success");
        } else if (type === 'deactivate') {
            // Simulasi deaktifasi dengan mengubah status di extra
            let users = JSON.parse(localStorage.getItem('b2b_users') || '[]');
            users.forEach(u => {
                if (ids.includes(u.id)) u.status = 'inactive';
            });
            localStorage.setItem('b2b_users', JSON.stringify(users));
            showToast(`${ids.length} akun dinonaktifkan.`, "success");
        }
        
        renderUserTable('student', 'students-table-body');
        renderUserTable('teacher', 'teachers-table-body');
        updateBulkActionBar();
        updateDashboardStats();
    };

    // ======================================================
    // EXPORT LOGIC
    // ======================================================
    window.exportFinance = (format) => {
        const sessions = JSON.parse(localStorage.getItem('b2b_sessions') || '[]');
        const users = JSON.parse(localStorage.getItem('b2b_users') || '[]');
        const teachers = users.filter(u => u.role === 'teacher');
        
        const payrollData = teachers.map(teacher => {
            const tSessions = sessions.filter(s => s.teacherId === teacher.id && s.attendance === 'hadir');
            const total = tSessions.length * (teacher.honorarium || 75000);
            return {
                nama: teacher.name,
                wa: teacher.id,
                totalSesi: tSessions.length,
                totalHonor: total
            };
        });

        if (format === 'json') {
            downloadJSON({ timestamp: new Date().toISOString(), payroll: payrollData }, 'rekap-keuangan-b2b.json');
            showToast("Data Keuangan berhasil di-export ke JSON.", "success");
        } else if (format === 'pdf') {
            const html = `
                <h3>Rekapitulasi Honorarium Guru</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Nama Guru</th>
                            <th>ID / WA</th>
                            <th>Total Sesi Hadir</th>
                            <th>Total Honorarium</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payrollData.map(d => `
                            <tr>
                                <td>${d.nama}</td>
                                <td>${d.wa}</td>
                                <td>${d.totalSesi} Sesi</td>
                                <td>${formatRupiah(d.totalHonor)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            printReport(html, "Laporan Keuangan Bites2Bytes");
        }
    };
});
