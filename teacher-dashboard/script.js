// File: teacher-dashboard/script.js

document.addEventListener('DOMContentLoaded', () => {
    // ---- Perbarui UI Profil Secara Dinamis ---- //
    if (window.updateProfileUI) {
        window.updateProfileUI();
        initRightbar();
    }

    // Update Welcome Message
    const currentUser = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
    const welcomeEl = document.getElementById('teacher-welcome');
    if (welcomeEl && currentUser.name) {
        welcomeEl.textContent = `Selamat Datang, ${currentUser.name} 👋`;
    }

    // Set Today's Date
    const dateBadge = document.getElementById('today-date-badge');
    if (dateBadge) {
        dateBadge.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }


    // ---- Logic Tab Navigasi Sidebar ---- //
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

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

            if (targetPane) {
                targetPane.classList.remove('hidden');
                targetPane.classList.add('active');
                if (targetId === 'home-tab') location.reload();
                if (targetId === 'earnings-tab') renderEarningsTab();
                if (targetId === 'modules-tab') renderTeacherModules();
            }

        });
    });

    // ---- Logic Kalender Penuh ---- //
    const calendarGrid = document.getElementById('calendar-grid');
    const monthDisplay = document.getElementById('current-month-display');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    // Side Panel Elements
    const selectedDateTitle = document.getElementById('selected-date-title');
    const zoomForm = document.getElementById('zoom-form');
    const noDateMsg = document.getElementById('no-date-selected');
    const classDateInput = document.getElementById('class-date');
    const dayEventsList = document.getElementById('day-events-list');

    // State Kalender
    let currentDate = new Date();
    // Untuk demo, kita set ke Oktober 2026 agar cocok dengan mockup HTML lama jika diinginkan
    // Namun lebih baik pakai tanggal aktual hari ini.
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    let selectedDateStr = null; // format: YYYY-MM-DD

    // Format YYYY-MM-DD untuk hari ini
    const todayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

    // Mock Database Jadwal (Bisa diganti LocalStorage)
    let schedules = JSON.parse(localStorage.getItem('b2b_schedules'));
    if (!schedules) {
        schedules = {};
        schedules[todayStr] = [
            { student: "Siti A. (Web Dev)", time: "16:30", link: "https://zoom.us/j/123456" }
        ];
        localStorage.setItem('b2b_schedules', JSON.stringify(schedules));
    }

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    function saveSchedules() {
        localStorage.setItem('b2b_schedules', JSON.stringify(schedules));
    }

    function renderCalendar(month, year) {
        calendarGrid.innerHTML = '';
        monthDisplay.textContent = `${monthNames[month]} ${year}`;

        // Cari hari pertama bulan ini (0 = Minggu, 1 = Senin, dst)
        const firstDay = new Date(year, month, 1).getDay();
        // Cari jumlah hari dalam bulan ini
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const today = new Date();
        const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

        // Kotak kosong sebelum hari 1
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyCell);
        }

        // Generate hari
        for (let i = 1; i <= daysInMonth; i++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';

            // Format tanggal YYYY-MM-DD (pakai padStart agar selalu 2 digit)
            const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            dayCell.setAttribute('data-date', dStr);

            // Tandai hari ini
            if (isCurrentMonth && i === today.getDate()) {
                dayCell.classList.add('today');
            }

            // Jika ini hari yang sedang dipilih
            if (selectedDateStr === dStr) {
                dayCell.classList.add('active');
            }

            // Struktur DOM Hari
            dayCell.innerHTML = `<div class="day-number">${i}</div><div class="day-events"></div>`;

            // Isi event jika ada
            if (schedules[dStr]) {
                const eventsContainer = dayCell.querySelector('.day-events');
                schedules[dStr].forEach(evt => {
                    const badge = document.createElement('div');
                    badge.className = 'event-badge';
                    badge.textContent = `${evt.time} - ${evt.student.split(' ')[0]}`;
                    eventsContainer.appendChild(badge);
                });
            }

            // Event Listener Klik Hari
            dayCell.addEventListener('click', () => {
                // Hapus active dari semua cell
                document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('active'));
                dayCell.classList.add('active');

                selectedDateStr = dStr;
                openSidePanel(dStr, i, monthNames[month], year);
            });

            calendarGrid.appendChild(dayCell);
        }
    }

    function openSidePanel(dateStr, day, monthName, year) {
        selectedDateTitle.textContent = `${day} ${monthName} ${year}`;
        classDateInput.value = dateStr;

        noDateMsg.classList.add('hidden');
        zoomForm.classList.remove('hidden');

        renderDayEvents(dateStr);
    }

    function renderDayEvents(dateStr) {
        dayEventsList.innerHTML = '';
        const dayEvents = schedules[dateStr];

        if (!dayEvents || dayEvents.length === 0) {
            dayEventsList.innerHTML = '<div class="text-xs text-muted text-center">Belum ada jadwal.</div>';
            return;
        }

        dayEvents.sort((a, b) => a.time.localeCompare(b.time)); // urutkan waktu

        dayEvents.forEach(evt => {
            const card = document.createElement('div');
            card.className = 'event-card';
            card.innerHTML = `
                <div class="fw-bold text-success">${evt.student}</div>
                <div class="text-xs text-muted mt-2">🕒 ${evt.time} WIB</div>
                <a href="${evt.link}" target="_blank" class="zoom-link-display">${evt.link}</a>
            `;
            dayEventsList.appendChild(card);
        });
    }

    // Navigasi Bulan
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) { currentMonth = 11; currentYear--; }
            renderCalendar(currentMonth, currentYear);
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) { currentMonth = 0; currentYear++; }
            renderCalendar(currentMonth, currentYear);
        });
    }

    // Handle Form Submit
    if (zoomForm) {
        zoomForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!selectedDateStr) return;

            const studentSelect = document.getElementById('student-select');
            const studentVal = studentSelect.value;
            const selectedOpt = studentSelect.options[studentSelect.selectedIndex];
            const studentName = selectedOpt.dataset.name || "Siswa";
            const moduleName = selectedOpt.dataset.moduleName || "Modul";
            
            const timeVal = document.getElementById('class-time').value;
            const zoomLinkVal = document.getElementById('zoom-link').value;

            if (!schedules[selectedDateStr]) {
                schedules[selectedDateStr] = [];
            }

            schedules[selectedDateStr].push({
                studentId: studentVal,
                student: `${studentName} (${moduleName})`,
                time: timeVal,
                link: zoomLinkVal
            });

            saveSchedules();
            zoomForm.reset();

            // Show Success Toast
            showToast(`Jadwal untuk ${studentVal} berhasil disimpan!`, 'success');

            // Refresh kalender dan panel list
            renderCalendar(currentMonth, currentYear);
            renderDayEvents(selectedDateStr);
        });
    }

    // Populate Student Select Dropdown from Enrollments
    async function populateStudentDropdown() {
        const studentSelect = document.getElementById('student-select');
        const repSelect = document.getElementById('rep-enrollment');
        if (!studentSelect && !repSelect) return;
        
        const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
        const teacherId = userSession.id;
        
        try {
            const { data: myEnrollments, error } = await window.B2B_Supabase.client
                .from('enrollments')
                .select('*, profiles:student_id(full_name), module:module_id(title)')
                .eq('teacher_id', teacherId)
                .eq('status', 'active');

            if (error) throw error;
            
            const options = myEnrollments.map(enr => {
                const studentName = enr.profiles?.full_name || 'Siswa';
                return `<option value="${enr.student_id}" 
                    data-enrollment-id="${enr.id}"
                    data-name="${studentName}"
                    data-student-name="${studentName}"
                    data-module-id="${enr.module_id}"
                    data-module-name="${enr.module?.title || 'Modul'}">
                    ${studentName}
                </option>`;
            }).join('');

            if (studentSelect) studentSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>' + options;
            if (repSelect) repSelect.innerHTML = '<option value="">-- Pilih Siswa --</option>' + options;
        } catch (err) {
            console.error("Dropdown error:", err);
        }
    }

    // Inisialisasi awal
    populateStudentDropdown();
    renderCalendar(currentMonth, currentYear);

    // ---- Animasi Angka Statistik ---- //
    setTimeout(() => {
        const studentCount = calculateTotalStudents();
        animateCount(document.getElementById('rightbar-student-count'), studentCount);
    }, 800);


    // Render Today's Sessions
    renderTodaySessions();


    // ---- Logic Render Modul untuk Guru ---- //
    function renderTeacherModules() {
        const teacherList = document.getElementById('teacher-modules-list');
        if (!teacherList) return;

        const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
        const modules = JSON.parse(localStorage.getItem('b2b_modules') || '[]');

        // Filter modul yang ditugaskan ke guru ini
        const myModules = modules.filter(m => m.teacherId === userSession.id);

        if (myModules.length === 0) {
            teacherList.innerHTML = '<div class="text-center p-8 text-muted">Belum ada modul yang ditugaskan untuk Anda.</div>';
            return;
        }

        teacherList.innerHTML = myModules.map(mod => `
            <div class="bento-box glass mb-15">
                <div class="flex-between">
                    <h3 class="fw-bold">${mod.title}</h3>
                    <button class="btn btn-xs btn-primary" onclick="alert('Link Modul: shared-link.com/${mod.id}')">Bagikan Materi</button>
                </div>
                <p class="text-sm text-muted mt-5">${mod.summary}</p>
                <div class="mt-15 text-xs">
                    <strong>Daftar Topik:</strong>
                    <ul class="mt-5">
                        ${mod.topics.map(t => `<li>• ${t.title}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
    }

    // Panggil saat tab modul dibuka
    const modulesNavItem = document.querySelector('[data-target="modules-tab"]');
    if (modulesNavItem) {
        modulesNavItem.addEventListener('click', renderTeacherModules);
    }

    /** Render Tab Honorarium */
    function renderEarningsTab() {
        const sessions = JSON.parse(localStorage.getItem('b2b_sessions') || '[]');
        const teacherSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
        const myTeacherId = teacherSession.id || 'B2B-T-8812';

        const mySessions = sessions.filter(s => s.teacherId === myTeacherId);
        const totalEarnings = mySessions.reduce((acc, s) => acc + (parseInt(s.honorariumPerSesi) || 0), 0);
        const totalCount = mySessions.length;
        const avg = totalCount > 0 ? Math.round(totalEarnings / totalCount) : 0;

        // Populate Stats
        const totalEarningsEl = document.getElementById('total-earnings');
        const totalSessionsEl = document.getElementById('total-sessions-count');
        const avgEarningsEl = document.getElementById('avg-earnings');

        if (totalEarningsEl) totalEarningsEl.textContent = `Rp ${totalEarnings.toLocaleString()}`;
        if (totalSessionsEl) totalSessionsEl.textContent = totalCount;
        if (avgEarningsEl) avgEarningsEl.textContent = `Rp ${avg.toLocaleString()}`;

        // Populate Table
        const tbody = document.getElementById('earnings-tbody');
        if (!tbody) return;

        if (mySessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada riwayat honorarium.</td></tr>';
            return;
        }

        tbody.innerHTML = mySessions.map(s => `
            <tr>
                <td class="text-xs">${s.date}</td>
                <td><div class="fw-bold text-sm">${s.studentName}</div></td>
                <td class="text-sm">${s.topic}</td>
                <td><span class="badge ${s.attendance === 'hadir' ? 'badge-success' : 'badge-danger'}">${s.attendance}</span></td>
                <td class="fw-bold text-primary">Rp ${(parseInt(s.honorariumPerSesi) || 0).toLocaleString()}</td>
            </tr>
        `).join('');
    }


    // ======================================================
    // RIGHTBAR PROFILE & TODAY SESSIONS LOGIC
    // ======================================================
    function initRightbar() {
        const currentUser = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
        const nameEl = document.getElementById('rightbar-name');
        const bioEl = document.getElementById('rightbar-bio');
        const subjectsEl = document.getElementById('rightbar-subjects');
        const avatarEl = document.getElementById('rightbar-avatar');

        if (nameEl) nameEl.textContent = currentUser.name || 'Guru';
        if (bioEl) bioEl.textContent = currentUser.bio || 'Membimbing dengan hati, mengajar dengan logika. Mari tumbuh bersama!';

        // Subjects (Expertise) - ONLY in Skills area
        if (subjectsEl) {
            const subjects = (currentUser.extra || 'Web Developer, Roblox, Python').split(',').map(s => s.trim());
            subjectsEl.innerHTML = subjects.map(s => `<span class="badge">${s}</span>`).join('');
        }

        // Avatar Handling
        if (avatarEl) {
            if (currentUser.photoUrl) {
                avatarEl.innerHTML = `<img src="${currentUser.photoUrl}" alt="Profile">`;
            } else {
                const initials = currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'BD';
                avatarEl.innerHTML = `<div class="avatar-placeholder">${initials}</div>`;
            }
        }
    }




    function calculateTotalStudents() {
        const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
        const enrollments = JSON.parse(localStorage.getItem('b2b_enrollments') || '[]');
        const teacherId = userSession.id || 'B2B-T-8812';
        return enrollments.filter(e => e.teacherId === teacherId && e.status === 'active').length;
    }

    async function renderTodaySessions() {
        const container = document.getElementById('today-sessions-container');
        if (!container) return;

        const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
        const todayStr = new Date().toISOString().split('T')[0];

        try {
            const { data: todaySessions, error } = await window.B2B_Supabase.client
                .from('schedules')
                .select('*, profiles:student_id(full_name)')
                .eq('teacher_id', userSession.id)
                .eq('date', todayStr)
                .order('time', { ascending: true });

            if (error) throw error;

            if (!todaySessions || todaySessions.length === 0) {
                container.innerHTML = `
                    <div class="bento-box glass text-center p-40">
                        <div style="font-size: 3rem; margin-bottom: 15px;">☕</div>
                        <h3 class="fw-bold">Tidak Ada Sesi Hari Ini</h3>
                        <p class="text-muted text-sm">Waktunya istirahat atau mempersiapkan materi berikutnya!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = todaySessions.map(ses => `
                <div class="session-timeline-card glass">
                    <div class="session-time-col">
                        <div class="session-time">${ses.time.substring(0,5)}</div>
                        <div class="session-status-dot"></div>
                    </div>
                    <div class="session-main-info">
                        <div class="session-student-name">${ses.profiles?.full_name || 'Siswa'}</div>
                        <div class="session-module-tag">Bites2Bytes Interactive Session</div>
                    </div>
                    <div class="session-actions">
                        <a href="${ses.zoom_link}" target="_blank" class="zoom-btn-large">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l5-5v14l-5-5H4V10h11z"></path></svg>
                            Join Zoom
                        </a>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error("Sessions error:", err);
        }
    }


    // ======================================================
    // TAB: DAFTAR SISWA BIMBINGAN
    // ======================================================
    function renderStudentList() {
        const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
        const enrollments = JSON.parse(localStorage.getItem('b2b_enrollments') || '[]');
        const sessions = JSON.parse(localStorage.getItem('b2b_sessions') || '[]');
        const modules = JSON.parse(localStorage.getItem('b2b_modules') || '[]');

        // Filter enrollments untuk guru ini
        // Untuk demo: tampilkan semua jika tidak ada sesi pengguna aktif
        const teacherId = userSession.id || 'B2B-T-8812';
        const myEnrollments = enrollments.filter(e => e.teacherId === teacherId && e.status === 'active');
        const mySessions = sessions.filter(s => s.teacherId === teacherId);

        // Update stat cards
        const countEl = document.getElementById('my-students-count');
        const sessionsEl = document.getElementById('my-sessions-count');
        const avgEl = document.getElementById('my-avg-score');

        if (countEl) countEl.textContent = myEnrollments.length;
        if (sessionsEl) sessionsEl.textContent = mySessions.length;

        const scoredSessions = mySessions.filter(s => s.score !== null);
        if (avgEl) {
            if (scoredSessions.length > 0) {
                const avg = Math.round(scoredSessions.reduce((sum, s) => sum + s.score, 0) / scoredSessions.length);
                avgEl.textContent = avg + '/100';
            } else {
                avgEl.textContent = '-';
            }
        }

        // Render tabel
        const tbody = document.getElementById('my-students-table-body');
        if (!tbody) return;

        if (myEnrollments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">Anda belum memiliki siswa yang di-assign. Hubungi Admin.</td></tr>';
            return;
        }

        tbody.innerHTML = myEnrollments.map(enr => {
            // Ambil sesi untuk enrollment ini
            const enrSessions = mySessions.filter(s => s.enrollmentId === enr.id || s.studentId === enr.studentId);
            const hadirCount = enrSessions.filter(s => s.attendance === 'hadir').length;
            const attendanceRate = enrSessions.length > 0 ? Math.round((hadirCount / enrSessions.length) * 100) : 0;

            const scoredEnrSessions = enrSessions.filter(s => s.score !== null);
            const avgScore = scoredEnrSessions.length > 0
                ? Math.round(scoredEnrSessions.reduce((sum, s) => sum + s.score, 0) / scoredEnrSessions.length)
                : null;

            // Progress modul
            const mod = modules.find(m => m.id === enr.moduleId);
            const progressPercent = mod && mod.topics.length > 0
                ? Math.round((hadirCount / mod.topics.length) * 100)
                : 0;

            const attendanceBadge = attendanceRate >= 80
                ? `<span class="badge" style="background:rgba(52,211,153,0.15); color:var(--success-color); border:1px solid rgba(52,211,153,0.3)">${attendanceRate}%</span>`
                : attendanceRate >= 60
                    ? `<span class="badge" style="background:rgba(251,191,36,0.15); color:var(--warning-color); border:1px solid rgba(251,191,36,0.3)">${attendanceRate}%</span>`
                    : `<span class="badge" style="background:rgba(248,113,113,0.15); color:var(--danger-color); border:1px solid rgba(248,113,113,0.3)">${attendanceRate}%</span>`;

            return `
                <tr class="fade-in" style="cursor:pointer" onclick="showStudentDetail('${enr.id}', '${enr.studentId}')">
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:34px; height:34px; border-radius:50%; background:var(--primary-color); color:white; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0">
                                ${enr.studentName.charAt(0)}
                            </div>
                            <div>
                                <div style="font-weight:600; font-size:0.9rem">${enr.studentName}</div>
                                <div style="font-size:0.72rem; color:var(--text-muted)">${enr.studentId}</div>
                            </div>
                        </div>
                    </td>
                    <td style="font-size:0.85rem; color:var(--text-muted)">${enr.moduleName}</td>
                    <td>
                        <div style="width:100px">
                            <div style="display:flex; justify-content:space-between; font-size:0.72rem; margin-bottom:4px">
                                <span style="color:var(--text-muted)">Progres</span>
                                <span style="font-weight:600; color:var(--primary-color)">${progressPercent}%</span>
                            </div>
                            <div style="height:5px; border-radius:3px; background:var(--border-color); overflow:hidden">
                                <div style="height:100%; width:${progressPercent}%; background:linear-gradient(90deg, var(--primary-color), var(--accent-color)); border-radius:3px; transition:width 0.5s ease"></div>
                            </div>
                        </div>
                    </td>
                    <td style="text-align:center; font-weight:600">${enrSessions.length} sesi</td>
                    <td>${attendanceBadge}</td>
                    <td style="font-weight:700; color:${avgScore !== null ? (avgScore >= 80 ? 'var(--success-color)' : avgScore >= 60 ? 'var(--warning-color)' : 'var(--danger-color)') : 'var(--text-muted)'}">
                        ${avgScore !== null ? avgScore + '/100' : '<span style="color:var(--text-muted)">Belum ada</span>'}
                    </td>
                    <td><span class="badge" style="background:rgba(52,211,153,0.15); color:var(--success-color); border:1px solid rgba(52,211,153,0.3)">✅ Aktif</span></td>
                </tr>
            `;
        }).join('');
    }

    /** Tampilkan panel detail sesi untuk satu siswa */
    window.showStudentDetail = (enrollmentId, studentId) => {
        const sessions = JSON.parse(localStorage.getItem('b2b_sessions') || '[]');
        const enrollments = JSON.parse(localStorage.getItem('b2b_enrollments') || '[]');

        const enr = enrollments.find(e => e.id === enrollmentId);
        const enrSessions = sessions.filter(s => s.enrollmentId === enrollmentId || s.studentId === studentId);

        const panel = document.getElementById('student-detail-panel');
        if (!panel || !enr) return;

        panel.classList.remove('hidden');

        const sessionRows = enrSessions.length === 0
            ? '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:1rem">Belum ada sesi tercatat.</td></tr>'
            : enrSessions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(ses => `
                <tr>
                    <td style="font-size:0.8rem; color:var(--text-muted)">${formatDateTeacher(ses.date)}</td>
                    <td style="font-size:0.85rem">${ses.topic}</td>
                    <td>
                        <span style="padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700; 
                            background:${ses.attendance === 'hadir' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'};
                            color:${ses.attendance === 'hadir' ? 'var(--success-color)' : 'var(--danger-color)'}">
                            ${ses.attendance === 'hadir' ? '✅ Hadir' : '❌ Absen'}
                        </span>
                    </td>
                    <td style="font-weight:700">${ses.score !== null ? ses.score + '/100' : '-'}</td>
                    <td style="font-size:0.78rem; color:var(--text-muted); max-width:200px; word-wrap:break-word">${ses.notes || '-'}</td>
                </tr>
            `).join('');

        panel.innerHTML = `
            <div class="bento-box glass">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px">
                    <div>
                        <h3 style="font-weight:700">📋 Riwayat Sesi: ${enr.studentName}</h3>
                        <p style="font-size:0.8rem; color:var(--text-muted)">Modul: ${enr.moduleName}</p>
                    </div>
                    <button onclick="document.getElementById('student-detail-panel').classList.add('hidden')" 
                        style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:1.2rem">✕</button>
                </div>
                <div style="overflow-x:auto">
                    <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.875rem">
                        <thead>
                            <tr style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; font-weight:700">
                                <th style="padding:0.75rem 1rem; border-bottom:1px solid var(--border-color)">Tanggal</th>
                                <th style="padding:0.75rem 1rem; border-bottom:1px solid var(--border-color)">Topik</th>
                                <th style="padding:0.75rem 1rem; border-bottom:1px solid var(--border-color)">Kehadiran</th>
                                <th style="padding:0.75rem 1rem; border-bottom:1px solid var(--border-color)">Nilai</th>
                                <th style="padding:0.75rem 1rem; border-bottom:1px solid var(--border-color)">Catatan Guru</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sessionRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    function formatDateTeacher(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // Panggil saat tab daftar siswa dibuka
    const studentsNavItem = document.querySelector('[data-target="students-tab"]');
    if (studentsNavItem) {
        studentsNavItem.addEventListener('click', renderStudentList);
    }

    // ======================================================
    // TAB: LAPORAN SESI (SESSION REPORT)
    // ======================================================

    /** Populate dropdown siswa di form laporan */
    function populateReportDropdown() {
        const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
        const teacherId = userSession.id || 'B2B-T-8812';
        const enrollments = JSON.parse(localStorage.getItem('b2b_enrollments') || '[]');
        const myEnrollments = enrollments.filter(e => e.teacherId === teacherId && e.status === 'active');

        const sel = document.getElementById('rep-enrollment');
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Pilih Siswa --</option>';
        myEnrollments.forEach(enr => {
            sel.innerHTML += `<option value="${enr.studentId}" 
                data-enrollment-id="${enr.id}"
                data-student-id="${enr.studentId}"
                data-student-name="${enr.studentName}"
                data-teacher-id="${enr.teacherId}"
                data-teacher-name="${enr.teacherName}"
                data-module-id="${enr.moduleId}"
                data-module-name="${enr.moduleName}">
                ${enr.studentName} — ${enr.moduleName}
            </option>`;
        });

        // Set tanggal default = hari ini
        const dateInput = document.getElementById('rep-date');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    }

    /** Render kartu laporan terbaru di panel kanan */
    function renderRecentReports() {
        const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
        const teacherId = userSession.id || 'B2B-T-8812';
        const sessions = JSON.parse(localStorage.getItem('b2b_sessions') || '[]');
        const mySessions = sessions
            .filter(s => s.teacherId === teacherId)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 6); // tampilkan 6 terbaru

        const listEl = document.getElementById('recent-reports-list');
        if (!listEl) return;

        if (mySessions.length === 0) {
            listEl.innerHTML = '<div class="text-xs text-muted text-center" style="margin-top:1rem">Belum ada laporan. Isi form pertamamu!</div>';
            return;
        }

        listEl.innerHTML = mySessions.map(ses => {
            const attendColor = ses.attendance === 'hadir' ? 'var(--success-color)' : ses.attendance === 'izin' ? 'var(--warning-color)' : 'var(--danger-color)';
            const attendIcon = ses.attendance === 'hadir' ? '✅' : ses.attendance === 'izin' ? '📝' : '❌';
            return `
                <div style="background:rgba(255,255,255,0.04); border:1px solid var(--border-color); border-radius:12px; padding:12px 14px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                        <div style="font-weight:600; font-size:0.85rem">${ses.studentName}</div>
                        <span style="font-size:0.7rem; color:var(--text-muted)">${formatDateTeacher(ses.date)}</span>
                    </div>
                    <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:6px">${ses.topic}</div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span style="font-size:0.72rem; padding:2px 7px; border-radius:4px; background:rgba(255,255,255,0.05); color:${attendColor}; border:1px solid ${attendColor}40">${attendIcon} ${ses.attendance}</span>
                        ${ses.score !== null ? `<span style="font-size:0.72rem; font-weight:700; color:var(--primary-color)">${ses.score}/100</span>` : ''}
                    </div>
                    ${ses.notes ? `<div style="font-size:0.72rem; color:var(--text-muted); margin-top:6px; border-top:1px solid var(--border-color); padding-top:6px; line-clamp:2; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical">${ses.notes}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    /** Form submit: simpan laporan sesi baru */
    const sessionReportForm = document.getElementById('session-report-form');
    if (sessionReportForm) {
        sessionReportForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const enrollSel = document.getElementById('rep-enrollment');
            const selectedOption = enrollSel.options[enrollSel.selectedIndex];
            if (!enrollSel.value) { showToast('Pilih siswa terlebih dahulu!', 'error'); return; }

            const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
            const scoreRaw = document.getElementById('rep-score').value;
            
            const reportData = {
                enrollment_id: selectedOption.dataset.enrollmentId,
                student_id: selectedOption.dataset.studentId || enrollSel.value,
                teacher_id: userSession.id,
                module_id: selectedOption.dataset.moduleId,
                topic: document.getElementById('rep-topic').value.trim(),
                date: document.getElementById('rep-date').value,
                attendance: document.getElementById('rep-attendance').value,
                score: scoreRaw !== '' ? parseInt(scoreRaw) : null,
                notes: document.getElementById('rep-notes').value.trim(),
                honorarium: parseInt(document.getElementById('rep-honorarium').value) || 75000
            };

            try {
                const { error } = await window.B2B_Supabase.client
                    .from('sessions')
                    .insert(reportData);

                if (error) throw error;

                showToast(`Laporan sesi berhasil dikirim! XP siswa akan diperbarui otomatis.`, 'success');
                sessionReportForm.reset();
                renderRecentReports();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    }

    // Listener tab laporan sesi
    document.querySelector('[data-target="report-tab"]')?.addEventListener('click', () => {
        populateReportDropdown();
        renderRecentReports();
    });


    /** Render Daftar Modul yang Ditugaskan ke Guru */
    function renderTeacherModules() {
        const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
        const teacherId = userSession.id || 'B2B-T-8812';
        const modules = JSON.parse(localStorage.getItem('b2b_modules') || '[]');
        const enrollments = JSON.parse(localStorage.getItem('b2b_enrollments') || '[]');

        const myModules = modules.filter(m => m.teacherId === teacherId);
        const listEl = document.getElementById('teacher-modules-list');
        if (!listEl) return;

        if (myModules.length === 0) {
            listEl.innerHTML = '<div class="text-center p-40 text-muted">Belum ada modul yang ditugaskan untuk Anda.</div>';
            return;
        }

        listEl.innerHTML = myModules.map(mod => {
            const studentCount = enrollments.filter(e => e.moduleId === mod.id && e.teacherId === teacherId).length;
            const icon = mod.id.includes('python') ? '🐍' : mod.id.includes('web') ? '🌐' : '📚';

            return `
                <div class="bento-box glass module-card animate-fade-up">
                    <div class="module-card-header">
                        <div class="module-icon-wrapper">${icon}</div>
                        <span class="badge badge-success text-xs">${mod.topics.length} Topik</span>
                    </div>
                    <h3 class="fw-bold mt-15 mb-10 text-lg">${mod.title}</h3>
                    <p class="text-muted text-sm line-height-relaxed module-desc">
                        ${mod.summary || 'Pelajari materi lengkap dari kurikulum standar Bites2Bytes untuk meningkatkan keahlian digital Anda.'}
                    </p>
                    <div class="module-card-footer mt-20">
                        <div class="student-count-badge">
                            <span class="text-xs text-muted">👨‍🎓 ${studentCount} Siswa Aktif</span>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="showToast('Fitur materi detail segera hadir!', 'info')">
                            Buka Materi
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Initial render if active
    if (document.querySelector('[data-target="modules-tab"].active')) {
        renderTeacherModules();
    }

});

