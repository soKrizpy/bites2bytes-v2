// File: student-dashboard/script.js

document.addEventListener('DOMContentLoaded', () => {

    // ======================================================
    // PROFIL & HEADER
    // ======================================================
    const userSession = JSON.parse(localStorage.getItem('b2b_currentUser') || '{}');
    const studentId = userSession.id || '62812345678';
    
    if (window.updateProfileUI) window.updateProfileUI();



    // ======================================================
    // TAB NAVIGASI
    // ======================================================
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    function switchTab(targetId) {
        navItems.forEach(n => n.classList.remove('active'));
        tabPanes.forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
        const target = document.getElementById(targetId);
        if (target) { target.classList.remove('hidden'); target.classList.add('active'); }
        const navItem = document.querySelector(`[data-target="${targetId}"]`);
        if (navItem) navItem.classList.add('active');
        // Trigger lazy load per tab
        if (targetId === 'schedule-tab') renderScheduleTab();
        if (targetId === 'modules-tab') renderStudentModules();
        if (targetId === 'leaderboard-tab') renderLeaderboard();
        if (targetId === 'parent-tab') initParentHub();
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item.getAttribute('data-target')));
    });

    // "Lihat Semua" link di dashboard
    document.querySelector('.nav-link-btn')?.addEventListener('click', () => switchTab('schedule-tab'));

    // ======================================================
    // DASHBOARD TAB — Stats, Jadwal Terdekat, Learning Path
    // ======================================================
    async function initDashboard() {
        try {
            // 1. Fetch Progress
            const { data: progress, error: progressError } = await window.B2B_Supabase.client
                .from('progress')
                .select('*')
                .eq('student_id', studentId)
                .single();

            if (progressError && progressError.code !== 'PGRST116') throw progressError;

            const xp = progress?.xp || 0;
            const level = Math.floor(xp / 1000) + 1;
            const xpInLevel = xp % 1000;
            const xpPct = Math.min(100, Math.round((xpInLevel / 1000) * 100));

            // 2. Fetch Sessions for Analytics
            const { data: sessions, error: sessionError } = await window.B2B_Supabase.client
                .from('sessions')
                .select('*')
                .eq('student_id', studentId);

            if (sessionError) throw sessionError;

            // --- Update UI ---
            const xpSidebar = document.getElementById('student-xp-sidebar');
            if (xpSidebar) xpSidebar.textContent = xp.toLocaleString('id-ID');

            const levelEl = document.getElementById('student-level');
            const xpTextEl = document.getElementById('student-xp');
            const xpBarEl = document.getElementById('xp-bar');

            if (levelEl) levelEl.textContent = `Level ${level}`;
            if (xpTextEl) xpTextEl.textContent = `${xpInLevel}/1000 XP`;
            if (xpBarEl) xpBarEl.style.width = `${xpPct}%`;

            const attendanceRate = sessions.length > 0 
                ? Math.round((sessions.filter(s => s.attendance === 'hadir').length / sessions.length) * 100) 
                : 0;
            
            const attendanceEl = document.getElementById('ana-attendance');
            if (attendanceEl) attendanceEl.textContent = `${attendanceRate}%`;

            // --- Streak & Missions ---
            updateStreak();
            renderDailyMissions();

            // --- Jadwal Terdekat ---
            renderNextSchedule();

            // --- Learning Path ---
            renderLearningPath();
        } catch (err) {
            console.error("Dashboard init error:", err);
        }
    }

    async function renderNextSchedule() {
        const container = document.getElementById('next-schedule-container');
        if (!container) return;

        const todayStr = new Date().toISOString().split('T')[0];

        try {
            const { data: upcoming, error } = await window.B2B_Supabase.client
                .from('schedules')
                .select('*')
                .eq('student_id', studentId)
                .gte('date', todayStr)
                .order('date', { ascending: true })
                .order('time', { ascending: true })
                .limit(3);

            if (error) throw error;

            if (!upcoming || upcoming.length === 0) {
                container.innerHTML = `<div class="text-muted text-sm" style="padding:.5rem 0">Belum ada jadwal mendatang. Guru akan segera menambahkan sesi.</div>`;
                return;
            }

            container.innerHTML = upcoming.map(ev => {
                const d = new Date(ev.date);
                const day = d.getDate();
                const month = d.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase();
                return `
                    <div class="schedule-item">
                        <div class="date-block">
                            <span class="day">${day}</span>
                            <span class="month">${month}</span>
                        </div>
                        <div class="schedule-info">
                            <div class="fw-bold">Sesi Mentoring</div>
                            <div class="text-sm text-muted">${ev.time.substring(0,5)} WIB</div>
                        </div>
                        ${ev.zoom_link
                            ? `<a href="${ev.zoom_link}" target="_blank" class="btn btn-primary btn-sm zoom-join-btn">🔗 Join Zoom</a>`
                            : `<span class="time-badge">${ev.time.substring(0,5)} WIB</span>`}
                    </div>`;
            }).join('');
        } catch (err) {
            console.error("Schedule error:", err);
        }
    }

    function renderLearningPath(myEnrollments, modules, mySessions, progress) {
        const container = document.getElementById('learning-path-container');
        if (!container) return;

        if (myEnrollments.length === 0) {
            container.innerHTML = `<div class="text-muted text-sm">Belum ada enrollment aktif. Hubungi admin untuk mulai belajar.</div>`;
            return;
        }

        container.innerHTML = myEnrollments.map((enr, idx) => {
            const mod = modules.find(m => m.id === enr.moduleId);
            const enrSessions = mySessions.filter(s => s.enrollmentId === enr.id || s.moduleId === enr.moduleId);
            const completedTopics = mod ? mod.topics.filter(t =>
                (progress.completedTopics || []).includes(`${mod.id}|${t.id}`)
            ).length : 0;
            const totalTopics = mod ? mod.topics.length : 0;
            const pct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
            const isActive = idx === 0;
            const isDone = pct === 100;
            const statusClass = isDone ? 'lp-done' : isActive ? 'lp-active' : 'lp-pending';
            const statusIcon = isDone ? '✅' : isActive ? '🔵' : '🔒';
            const statusLabel = isDone ? 'Selesai' : isActive ? 'Sedang Berjalan' : 'Akan Datang';

            return `
                <div class="lp-node ${statusClass}">
                    <div class="lp-icon">${statusIcon}</div>
                    <div class="lp-content">
                        <div class="lp-title fw-bold">${enr.moduleName}</div>
                        <div class="lp-meta text-xs text-muted">Guru: ${enr.teacherName} · ${enrSessions.length} sesi tercatat</div>
                        <div class="lp-progress-wrap">
                            <div class="lp-progress-bar">
                                <div class="lp-progress-fill" style="width:${pct}%"></div>
                            </div>
                            <span class="lp-pct text-xs">${pct}%</span>
                        </div>
                        <span class="lp-badge ${statusClass}-badge">${statusLabel}</span>
                    </div>
                    ${idx < myEnrollments.length - 1 ? '<div class="lp-connector"></div>' : ''}
                </div>`;
        }).join('');
    }

    // ======================================================
    // SCHEDULE TAB — Upcoming & Past sessions
    // ======================================================
    function renderScheduleTab() {
        const schedules = JSON.parse(localStorage.getItem('b2b_schedules') || '{}');
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const upcoming = [], past = [];

        Object.entries(schedules).forEach(([dateStr, events]) => {
            const d = new Date(dateStr);
            events.forEach(ev => {
                // Filter jadwal hanya untuk siswa yang bersangkutan
                if (ev.studentId && ev.studentId !== studentId) return;
                
                const item = { date: dateStr, dateObj: d, ...ev };
                if (d >= today) upcoming.push(item);
                else past.push(item);
            });
        });

        upcoming.sort((a, b) => a.dateObj - b.dateObj);
        past.sort((a, b) => b.dateObj - a.dateObj);

        const upcomingEl = document.getElementById('upcoming-sessions-list');
        const pastEl = document.getElementById('past-sessions-list');

        upcomingEl.innerHTML = upcoming.length === 0
            ? `<p class="text-muted text-sm">Belum ada jadwal mendatang.</p>`
            : upcoming.map(ev => sessionCard(ev, true)).join('');

        pastEl.innerHTML = past.length === 0
            ? `<p class="text-muted text-sm">Belum ada riwayat sesi.</p>`
            : past.slice(0, 5).map(ev => sessionCard(ev, false)).join('');
    }

    function sessionCard(ev, isUpcoming) {
        const d = ev.dateObj;
        const dateStr = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
        return `
            <div class="session-card glass ${isUpcoming ? 'session-upcoming' : 'session-past'}">
                <div class="session-date-col">
                    <div class="session-day">${d.getDate()}</div>
                    <div class="session-month">${d.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase()}</div>
                </div>
                <div class="session-info">
                    <div class="fw-bold">${ev.student || 'Sesi Kelas'}</div>
                    <div class="text-xs text-muted">${dateStr} · ${ev.time} WIB</div>
                    ${ev.link ? `<a href="${ev.link}" target="_blank" class="zoom-link-chip">🔗 ${ev.link.substring(0, 40)}...</a>` : ''}
                </div>
                ${isUpcoming && ev.link
                    ? `<a href="${ev.link}" target="_blank" class="btn btn-primary btn-sm" style="flex-shrink:0">Join Zoom</a>`
                    : isUpcoming ? `<span class="badge badge-warning" style="flex-shrink:0">Menunggu Link</span>` : `<span class="badge badge-muted" style="flex-shrink:0">Selesai</span>`}
            </div>`;
    }

    // ======================================================
    // LEADERBOARD & BADGE SYSTEM
    // ======================================================
    /** Hitung XP total untuk satu siswa */
    function calculateStudentXP(targetId) {
        const globalProgress = JSON.parse(localStorage.getItem('b2b_progress') || '{}');
        const progress = globalProgress[targetId] || { xp: 0 };
        return progress.xp || 0;
    }

    function renderLeaderboard() {
        const allUsers = JSON.parse(localStorage.getItem('b2b_users') || '[]');
        const students = allUsers.filter(u => u.role === 'student');
        
        const rankedData = students.map(s => ({
            ...s,
            xp: calculateStudentXP(s.id),
            badges: (parseInt(s.id.slice(-1)) % 3) + 1
        })).sort((a, b) => b.xp - a.xp);

        const podiumEl = document.getElementById('leaderboard-podium');
        if (podiumEl) {
            const top3 = rankedData.slice(0, 3);
            podiumEl.innerHTML = `
                <div class="podium-rank second animate-fade-up" style="animation-delay: 0.2s">
                    <div class="podium-avatar">${top3[1]?.name[0] || '?'}</div>
                    <div class="podium-name">${top3[1]?.name || '-'}</div>
                    <div class="podium-xp">${(top3[1]?.xp || 0).toLocaleString()} XP</div>
                    <div class="podium-step">2</div>
                </div>
                <div class="podium-rank first animate-fade-up">
                    <div class="crown">👑</div>
                    <div class="podium-avatar" style="border-color: #FFD700">${top3[0]?.name[0] || '?'}</div>
                    <div class="podium-name">${top3[0]?.name || '-'}</div>
                    <div class="podium-xp" style="color: #FFD700">${(top3[0]?.xp || 0).toLocaleString()} XP</div>
                    <div class="podium-step">1</div>
                </div>
                <div class="podium-rank third animate-fade-up" style="animation-delay: 0.4s">
                    <div class="podium-avatar">${top3[2]?.name[0] || '?'}</div>
                    <div class="podium-name">${top3[2]?.name || '-'}</div>
                    <div class="podium-xp">${(top3[2]?.xp || 0).toLocaleString()} XP</div>
                    <div class="podium-step">3</div>
                </div>
            `;
        }

        const tbody = document.getElementById('leaderboard-tbody');
        if (tbody) {
            tbody.innerHTML = rankedData.map((s, idx) => `
                <tr class="${s.id === studentId ? 'row-highlight' : ''}">
                    <td><span class="rank-circle ${idx < 3 ? 'rank-' + (idx + 1) : ''}">${idx + 1}</span></td>
                    <td>
                        <div class="flex items-center gap-10">
                            <div class="avatar-xs" style="width:30px; height:30px; border-radius:50%; background:var(--border-color); display:flex; align-items:center; justify-content:center; font-size:12px;">${s.name[0]}</div>
                            <div>
                                <div class="fw-bold text-sm">${s.name} ${s.id === studentId ? '⭐' : ''}</div>
                                <div class="text-xs text-muted">${s.extra || 'Siswa'}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="badges-mini-list">
                            ${Array(s.badges).fill('🏅').join('')}
                        </div>
                    </td>
                    <td><span class="fw-bold text-primary">${s.xp.toLocaleString()} XP</span></td>
                </tr>
            `).join('');
        }
    }

    // ======================================================
    // STREAK & MISSIONS LOGIC
    // ======================================================
    function updateStreak() {
        const today = new Date().toISOString().split('T')[0];
        const streakData = JSON.parse(localStorage.getItem(`b2b_streak_${studentId}`) || '{"count": 0, "lastDate": ""}');
        
        if (streakData.lastDate === today) {
            // Already logged today
        } else {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (streakData.lastDate === yesterdayStr) {
                streakData.count += 1;
            } else {
                streakData.count = 1;
            }
            streakData.lastDate = today;
            localStorage.setItem(`b2b_streak_${studentId}`, JSON.stringify(streakData));
        }
        
        const streakEl = document.getElementById('student-streak');
        if (streakEl) {
            streakEl.textContent = `🔥 ${streakData.count} Hari`;
        }
    }

    function renderDailyMissions() {
        const today = new Date().toISOString().split('T')[0];
        let missions = JSON.parse(localStorage.getItem(`b2b_missions_${studentId}_${today}`));
        
        if (!missions) {
            missions = [
                { id: 'm1', text: 'Cek jadwal mentoring hari ini', xp: 50, done: false },
                { id: 'm2', text: 'Kerjakan 1 kuis topik baru', xp: 150, done: false },
                { id: 'm3', text: 'Kunjungi Parent Hub / Rekap Belajar', xp: 50, done: false }
            ];
            localStorage.setItem(`b2b_missions_${studentId}_${today}`, JSON.stringify(missions));
        }

        const listEl = document.getElementById('mission-list');
        const progressEl = document.getElementById('mission-progress');
        if (listEl) {
            const doneCount = missions.filter(m => m.done).length;
            progressEl.textContent = `${doneCount}/${missions.length}`;
            
            listEl.innerHTML = missions.map(m => `
                <div class="mission-item ${m.done ? 'done' : ''}" onclick="completeMission('${m.id}')">
                    <div class="mission-check">${m.done ? '✅' : '⭕'}</div>
                    <div class="mission-info">
                        <div class="text-sm fw-bold">${m.text}</div>
                        <div class="mission-xp">+${m.xp} XP</div>
                    </div>
                </div>
            `).join('');
        }
    }

    window.completeMission = (missionId) => {
        const today = new Date().toISOString().split('T')[0];
        let missions = JSON.parse(localStorage.getItem(`b2b_missions_${studentId}_${today}`));
        const mission = missions.find(m => m.id === missionId);
        
        if (mission && !mission.done) {
            mission.done = true;
            localStorage.setItem(`b2b_missions_${studentId}_${today}`, JSON.stringify(missions));
            showToast(`Misi Selesai! +${mission.xp} XP didapat.`, 'success');
            // Simulasi tambah XP instan
            initDashboard(); 
        }
    };

    function triggerLevelUp(newLevel) {
        const overlay = document.createElement('div');
        overlay.className = 'level-up-overlay animate-fade-in';
        overlay.innerHTML = `
            <div class="level-up-card">
                <div class="text-2xl fw-bold text-white mb-20">SELAMAT! KAMU NAIK LEVEL</div>
                <div class="level-number">${newLevel}</div>
                <div class="text-xl text-muted mt-20">Teruslah belajar dan jadilah yang terbaik!</div>
                <button class="btn btn-primary mt-30" onclick="this.parentElement.parentElement.remove()">Keren! 🔥</button>
            </div>
        `;
        document.body.appendChild(overlay);
        // Play sound if available
    }

    // ======================================================
    // PARENT HUB — Direct Access (no PIN)
    // ======================================================
    function initParentHub() {
        renderParentData();
    }

    function renderParentData() {
        const sessions = JSON.parse(localStorage.getItem('b2b_sessions') || '[]');
        const mySessions = sessions
            .filter(s => s.studentId === studentId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // --- Tabel Log ---
        const tbody = document.getElementById('parent-sessions-tbody');
        if (tbody) {
            if (mySessions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted" style="padding:1.5rem">Belum ada sesi yang tercatat.</td></tr>';
            } else {
                tbody.innerHTML = mySessions.map(ses => `
                    <tr>
                        <td class="text-xs text-muted">${fmtDate(ses.date)}</td>
                        <td class="fw-bold text-sm">${ses.topic}</td>
                        <td class="text-sm">${ses.teacherName}</td>
                        <td><span class="badge ${ses.attendance === 'hadir' ? 'badge-success' : ses.attendance === 'izin' ? 'badge-warning' : 'badge-danger'}">
                            ${ses.attendance === 'hadir' ? '✅ Hadir' : ses.attendance === 'izin' ? '📝 Izin' : '❌ Absen'}
                        </span></td>
                        <td class="fw-bold">${ses.score !== null ? ses.score + '/100' : '<span class="text-muted">-</span>'}</td>
                    </tr>`).join('');
            }
        }

        // --- Pesan Mentor ---
        const msgEl = document.getElementById('parent-mentor-messages');
        if (msgEl) {
            const withNotes = mySessions.filter(s => s.notes && s.notes.trim());
            if (withNotes.length === 0) {
                msgEl.innerHTML = '<div class="text-muted text-sm">Belum ada catatan dari mentor.</div>';
            } else {
                msgEl.innerHTML = withNotes.slice(0, 3).map(ses => `
                    <div class="feedback-card" style="margin-bottom:12px;">
                        <p class="text-sm">"${ses.notes}"</p>
                        <div class="text-xs text-muted mt-10">— ${ses.teacherName} · ${fmtDate(ses.date)}</div>
                    </div>`).join('');
            }
        }

        // --- Ringkasan ---
        const summaryEl = document.getElementById('parent-summary');
        if (summaryEl) {
            const hadir = mySessions.filter(s => s.attendance === 'hadir').length;
            const scored = mySessions.filter(s => s.score !== null);
            const avg = scored.length > 0 ? Math.round(scored.reduce((a, s) => a + s.score, 0) / scored.length) : null;
            const attendRate = mySessions.length > 0 ? Math.round((hadir / mySessions.length) * 100) : 0;

            summaryEl.innerHTML = `
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-color)">
                    <span class="text-muted text-sm">Total Sesi</span>
                    <span class="fw-bold">${mySessions.length}</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-color)">
                    <span class="text-muted text-sm">Tingkat Kehadiran</span>
                    <span class="fw-bold" style="color:${attendRate >= 80 ? 'var(--success-color)' : 'var(--warning-color)'}">${attendRate}%</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding:8px 0">
                    <span class="text-muted text-sm">Rata-rata Nilai</span>
                    <span class="fw-bold" style="color:${avg && avg >= 80 ? 'var(--success-color)' : 'var(--warning-color)'}">${avg !== null ? avg + '/100' : '-'}</span>
                </div>`;
        }
    }

    // ======================================================
    // MODUL BELAJAR TAB
    // ======================================================
    function renderStudentModules() {
        const grid = document.getElementById('student-modules-grid');
        if (!grid) return;
        const allModules = JSON.parse(localStorage.getItem('b2b_modules') || '[]');
        const enrollments = JSON.parse(localStorage.getItem('b2b_enrollments') || '[]');
        const globalProgress = JSON.parse(localStorage.getItem('b2b_progress') || '{}');
        const progress = globalProgress[studentId] || { completedTopics: [], quizScores: {}, badges: [], certificates: [], xp: 0 };

        const myActiveEnrollments = enrollments.filter(e => e.studentId === studentId && e.status === 'active');
        const myModuleIds = myActiveEnrollments.map(e => e.moduleId);
        const myModules = allModules.filter(m => myModuleIds.includes(m.id));

        if (myModules.length === 0) {
            grid.innerHTML = '<div class="text-muted">Belum ada modul yang ditugaskan kepadamu.</div>';
            return;
        }

        grid.innerHTML = myModules.map(mod => {
            const completed = mod.topics.filter(t =>
                (progress.completedTopics || []).includes(`${mod.id}|${t.id}`)
            ).length;
            const pct = mod.topics.length > 0 ? Math.round((completed / mod.topics.length) * 100) : 0;

            return `
                <div class="module-card glass">
                    <div class="module-banner" style="background:linear-gradient(135deg, var(--primary-color), var(--accent-color));">
                        <div class="badge-mini">Terdaftar</div>
                    </div>
                    <div class="module-info">
                        <h3 class="fw-bold">${mod.title}</h3>
                        <p class="text-xs text-muted mt-5">${mod.summary}</p>
                        <div class="progress-container mt-15">
                            <div class="flex-between text-xs mb-5">
                                <span>Progress</span><span>${pct}%</span>
                            </div>
                            <div class="progress-bar-sm">
                                <div class="progress-fill" style="width:${pct}%"></div>
                            </div>
                        </div>
                        <div class="module-topics mt-15">
                            <details>
                                <summary class="text-xs fw-bold cursor-pointer">Daftar Topik (${mod.topics.length})</summary>
                                <div class="topic-list mt-10">
                                    ${mod.topics.map(t => {
                                        const isDone = (progress.completedTopics || []).includes(`${mod.id}|${t.id}`);
                                        const score = (progress.quizScores || {})[`${mod.id}|${t.id}`];
                                        return `<div class="topic-item flex-between p-5 text-xs ${isDone ? 'text-success' : ''}">
                                            <span>${isDone ? '✅' : '📖'} ${t.title}</span>
                                            <button class="btn btn-xs btn-outline" onclick="openQuiz('${mod.id}', '${t.id}')">
                                                ${isDone ? `Kuis: ${score}%` : 'Kerjakan Kuis'}
                                            </button>
                                        </div>`;
                                    }).join('')}
                                </div>
                            </details>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    // ======================================================
    // KUIS LOGIC
    // ======================================================
    const quizModal = document.getElementById('quiz-modal');
    const quizBody = document.getElementById('quiz-body');
    const quizTitle = document.getElementById('quiz-title');

    window.openQuiz = (modId, topId) => {
        const modules = JSON.parse(localStorage.getItem('b2b_modules') || '[]');
        const mod = modules.find(m => m.id === modId);
        const topic = mod?.topics.find(t => t.id === topId);
        if (!topic) return;
        quizTitle.textContent = `Kuis: ${topic.title}`;
        quizModal.classList.remove('hidden');
        renderQuizQuestions(topic.quiz.questions, modId, topId);
    };

    function renderQuizQuestions(questions, modId, topId) {
        // Create container structure for questions and submit button
        quizBody.innerHTML = `
            <div id="quiz-questions"></div>
            <button class="btn btn-primary w-full mt-20" onclick="finalizeQuiz('${modId}', '${topId}')">Selesaikan Kuis</button>
        `;
        const container = document.getElementById('quiz-questions');
        container.innerHTML = questions.map((q, qIdx) => `
            <div class="quiz-q-item mb-20 p-20 glass rounded-xl" id="q-container-${qIdx}" data-correct="${q.correct}">
                <p class="fw-bold mb-10 text-sm">${qIdx + 1}. ${q.q}</p>
                <div class="quiz-options grid-2">
                    ${q.a.map((opt, aIdx) => `
                        <label class="quiz-opt-label" id="opt-label-${qIdx}-${aIdx}">
                            <input type="radio" name="q-${qIdx}" value="${aIdx}" class="hidden" onclick="handleQuizAnswer(${qIdx}, ${aIdx}, ${q.correct}, '${q.explanation?.replace(/'/g, "\\'") || ''}')">
                            <div class="quiz-opt-card">${opt}</div>
                        </label>
                    `).join('')}
                </div>
                <div id="feedback-${qIdx}" class="quiz-feedback-box hidden mt-10 p-10 rounded-lg text-xs"></div>
            </div>
        `).join('');
    }

    /** Global handler untuk klik jawaban kuis */
    window.handleQuizAnswer = (qIdx, selectedIdx, correctIdx, explanation) => {
        const feedbackEl = document.getElementById(`feedback-${qIdx}`);
        const container = document.getElementById(`q-container-${qIdx}`);
        const options = container.querySelectorAll('input[type="radio"]');
        
        // Disable all options for this question
        options.forEach(opt => opt.disabled = true);

        const isCorrect = selectedIdx === correctIdx;
        const selectedLabel = document.getElementById(`opt-label-${qIdx}-${selectedIdx}`);
        
        // Visual Feedback
        feedbackEl.classList.remove('hidden');
        if (isCorrect) {
            selectedLabel.querySelector('.quiz-opt-card').style.borderColor = 'var(--success-color)';
            selectedLabel.querySelector('.quiz-opt-card').style.background = 'rgba(16,185,129,0.1)';
            feedbackEl.innerHTML = `<strong>✅ Benar!</strong><br>${explanation}`;
            feedbackEl.className = 'quiz-feedback-box mt-10 p-10 rounded-lg text-xs feedback-success';
        } else {
            selectedLabel.querySelector('.quiz-opt-card').style.borderColor = 'var(--danger-color)';
            selectedLabel.querySelector('.quiz-opt-card').style.background = 'rgba(239,68,68,0.1)';
            feedbackEl.innerHTML = `<strong>❌ Kurang Tepat.</strong> Jawaban yang benar adalah: <em>${document.querySelectorAll(`input[name="q-${qIdx}"]`)[correctIdx].parentElement.innerText}</em>.<br>${explanation}`;
            feedbackEl.className = 'quiz-feedback-box mt-10 p-10 rounded-lg text-xs feedback-error';
        }
    };

    window.closeQuiz = () => quizModal.classList.add('hidden');

    window.finalizeQuiz = (modId, topId) => {
        const modules = JSON.parse(localStorage.getItem('b2b_modules') || '[]');
        const mod = modules.find(m => m.id === modId);
        const topic = mod?.topics.find(t => t.id === topId);
        if (!topic) return;

        const totalQ = topic.quiz.questions.length;
        let correctCount = 0;

        for (let i = 0; i < totalQ; i++) {
            const selected = document.querySelector(`input[name="q-${i}"]:checked`);
            if (selected && parseInt(selected.value) === topic.quiz.questions[i].correct) {
                correctCount++;
            }
        }

        const score = Math.round((correctCount / totalQ) * 100);
        const globalProgress = JSON.parse(localStorage.getItem('b2b_progress') || '{}');
        const progress = globalProgress[studentId] || { completedTopics: [], quizScores: {}, badges: [], certificates: [], xp: 0 };
        
        const key = `${modId}|${topId}`;
        progress.quizScores[key] = Math.max(score, progress.quizScores[key] || 0); // Keep highest score

        if (score >= 80 && !progress.completedTopics.includes(key)) {
            progress.completedTopics.push(key);
            progress.xp = (progress.xp || 0) + 250; // Award XP
            showToast(`Selamat! Topik selesai dengan skor ${score}! 🏆 (+250 XP)`, 'success');
        } else if (score < 80) {
            showToast(`Skor ${score}% — belum lulus (min 80%). Coba lagi!`, 'error');
        } else {
            showToast(`Skor: ${score}%. Kamu sudah pernah lulus topik ini.`, 'info');
        }

        globalProgress[studentId] = progress;
        localStorage.setItem('b2b_progress', JSON.stringify(globalProgress));

        setTimeout(() => { 
            closeQuiz(); 
            renderStudentModules(); 
            initDashboard(); 
        }, 2000);
    };

    // ======================================================
    // HELPERS
    // ======================================================
    function fmtDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // ======================================================
    // INIT
    // ======================================================
    initDashboard();
    renderStudentModules();
});
