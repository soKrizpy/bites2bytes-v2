/**
 * Bites2Bytes - Data Initialization
 * Mengatur data awal untuk simulasi database di LocalStorage
 */

// FORCED CLEANUP: Membersihkan data profil yang tersangkut/bocor antar dashboard
if (!localStorage.getItem('b2b_cleaned_v2')) {
    if (!localStorage.getItem('b2b_demo_session')) {
        localStorage.removeItem('b2b_currentUser');
    }
    let usersData = JSON.parse(localStorage.getItem('b2b_users') || '[]');
    usersData = usersData.map(u => {
        delete u.photoUrl;
        delete u.bio;
        return u;
    });
    localStorage.setItem('b2b_users', JSON.stringify(usersData));
    localStorage.setItem('b2b_cleaned_v2', 'true');
    console.log("Data profil lama berhasil dibersihkan.");
}

const INITIAL_MODULES = [
    {
        id: "mod-python",
        title: "Python Masterclass",
        teacherId: "B2B-T-8812", // Ditugaskan ke Guru Budi
        summary: "Belajar pemrograman Python dari dasar hingga mahir.",
        topics: [
            {
                id: "top-1",
                title: "Pengenalan Variabel & Tipe Data",
                content: "Di topik ini kita belajar tentang string, integer, float, dan boolean.",
                quiz: {
                    questions: [
                        { q: "Apa perintah untuk mencetak teks di Python?", a: ["print()", "echo", "log"], correct: 0, explanation: "Fungsi print() digunakan untuk menampilkan output ke layar di Python." },
                        { q: "Manakah tipe data untuk angka desimal?", a: ["string", "int", "float"], correct: 2, explanation: "Float adalah tipe data yang mendukung titik desimal (floating point)." },
                        { q: "Tipe data True/False disebut?", a: ["boolean", "logic", "binary"], correct: 0, explanation: "Boolean hanya memiliki dua nilai: True atau False." },
                        { q: "Cara membuat komentar di Python pakai?", a: ["//", "#", "/*"], correct: 1, explanation: "Karakter pagar (#) digunakan untuk mengawali komentar satu baris di Python." },
                        { q: "Simbol untuk pangkat adalah?", a: ["^", "**", "pow"], correct: 1, explanation: "Dua bintang (**) adalah operator eksponen/pangkat di Python." }
                    ]
                }
            },
            {
                id: "top-2",
                title: "Control Flow: If Else",
                content: "Belajar membuat keputusan dalam kode menggunakan logika percabangan.",
                quiz: {
                    questions: [
                        { q: "Keyword untuk 'jika tidak' adalah?", a: ["else", "if not", "none"], correct: 0 },
                        { q: "Simbol untuk 'sama dengan' dalam perbandingan?", a: ["=", "==", "==="], correct: 1 }
                    ]
                }
            }
        ],
        exam: {
            questions: [
                { q: "Siapa pencipta Python?", a: ["Guido van Rossum", "Brendan Eich", "Elon Musk"], correct: 0 }
            ]
        }
    },
    {
        id: "mod-webdev",
        title: "Web Development Fundamentals",
        teacherId: "B2B-T-8812",
        summary: "Membangun website modern menggunakan HTML, CSS, dan JavaScript.",
        topics: [
            {
                id: "top-1",
                title: "HTML Dasar & Struktur Halaman",
                content: "Belajar tag HTML, elemen semantik, dan struktur dokumen.",
                quiz: {
                    questions: [
                        { q: "Tag untuk heading terbesar di HTML?", a: ["<h6>", "<h1>", "<head>"], correct: 1, explanation: "<h1> adalah level heading tertinggi dan biasanya digunakan untuk judul utama." },
                        { q: "Atribut untuk link di tag anchor?", a: ["src", "href", "url"], correct: 1, explanation: "href (Hypertext Reference) adalah atribut wajib untuk menentukan tujuan link." }
                    ]
                }
            }
        ],
        exam: { questions: [] }
    }
];

const DEMO_USERS = [
    { id: "62812345678", name: "Alex Johnson", role: "student", extra: "Basic", mpin: "142536" },
    { id: "62898765432", name: "Sarah Smith", role: "student", extra: "Basic", mpin: "654321" },
    { id: "62877001122", name: "Rio Kevin", role: "student", extra: "Basic", mpin: "770011" },
    { id: "62899001122", name: "Maya Putri", role: "student", extra: "Basic", mpin: "990011" },
    { id: "B2B-T-8812", name: "Budi Doremi", role: "teacher", extra: "Web Developer, Roblox, Python", mpin: "888222", honorarium: 350000, sessionsCompleted: 14 },
    { id: "B2B-T-9901", name: "Siti Aminah", role: "teacher", extra: "Python", mpin: "990011", honorarium: 300000, sessionsCompleted: 10 }
];

function mergeById(existingRows, demoRows) {
    const byId = new Map(existingRows.map(row => [row.id, row]));
    demoRows.forEach(row => {
        byId.set(row.id, { ...row, ...(byId.get(row.id) || {}) });
    });
    return Array.from(byId.values());
}

// Inisialisasi jika kosong
const currentModules = localStorage.getItem('b2b_modules');
if (!currentModules || currentModules === '[]') {
    localStorage.setItem('b2b_modules', JSON.stringify(INITIAL_MODULES));
}

// Inisialisasi progress siswa jika belum ada
const currentProgress = localStorage.getItem('b2b_progress');
if (!currentProgress || currentProgress === '{}') {
    localStorage.setItem('b2b_progress', JSON.stringify({
        "62899001122": {
            completedTopics: ["mod-python|top-1"],
            quizScores: {"mod-python|top-1": 100},
            badges: ["badge-python-logic"],
            certificates: [],
            xp: 150
        },
        "62812345678": {
            completedTopics: [],
            quizScores: {},
            badges: [],
            certificates: [],
            xp: 0
        },
        "62898765432": {
            completedTopics: [],
            quizScores: {},
            badges: [],
            certificates: [],
            xp: 0
        },
        "62877001122": {
            completedTopics: [],
            quizScores: {},
            badges: [],
            certificates: [],
            xp: 0
        }
    }));
} else {
    // Migrasi format lama jika diperlukan
    let oldProgress = JSON.parse(localStorage.getItem('b2b_progress') || '{}');
    if (oldProgress.completedTopics) {
        oldProgress = {
            "62899001122": {
                completedTopics: oldProgress.completedTopics || [],
                quizScores: oldProgress.quizScores || {},
                badges: oldProgress.badges || [],
                certificates: oldProgress.certificates || [],
                xp: oldProgress.xp || 0
            }
        };
    }

    ["62812345678", "62898765432", "62877001122", "62899001122"].forEach(id => {
        if (!oldProgress[id]) {
            oldProgress[id] = {
                completedTopics: [],
                quizScores: {},
                badges: [],
                certificates: [],
                xp: 0
            };
        }
    });

    localStorage.setItem('b2b_progress', JSON.stringify(oldProgress));
}

// Inisialisasi daftar guru (jika perlu untuk dropdown assignment)
const currentTeachers = JSON.parse(localStorage.getItem('b2b_teachers') || '[]');
localStorage.setItem('b2b_teachers', JSON.stringify(mergeById(
    currentTeachers,
    DEMO_USERS.filter(user => user.role === 'teacher').map(user => ({
        id: user.id,
        name: user.name
    }))
)));

// Inisialisasi daftar user utama
const currentUsers = JSON.parse(localStorage.getItem('b2b_users') || '[]');
localStorage.setItem('b2b_users', JSON.stringify(mergeById(currentUsers, DEMO_USERS)));

/**
 * b2b_enrollments: Hubungan siswa ↔ guru ↔ modul
 * Dibuat oleh Admin, dibaca oleh Guru & Siswa
 */
const currentEnrollments = localStorage.getItem('b2b_enrollments');
if (!currentEnrollments || currentEnrollments === '[]') {
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    const pastDate = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return fmt(d); };

    localStorage.setItem('b2b_enrollments', JSON.stringify([
        {
            id: "enr-001",
            studentId: "62812345678",
            studentName: "Alex Johnson",
            teacherId: "B2B-T-8812",
            teacherName: "Budi Doremi",
            moduleId: "mod-python",
            moduleName: "Python Masterclass",
            enrolledAt: pastDate(30),
            status: "active"
        },
        {
            id: "enr-002",
            studentId: "62898765432",
            studentName: "Sarah Smith",
            teacherId: "B2B-T-8812",
            teacherName: "Budi Doremi",
            moduleId: "mod-webdev",
            moduleName: "Web Development Fundamentals",
            enrolledAt: pastDate(20),
            status: "active"
        },
        {
            id: "enr-003",
            studentId: "62877001122",
            studentName: "Rio Kevin",
            teacherId: "B2B-T-9901",
            teacherName: "Siti Aminah",
            moduleId: "mod-python",
            moduleName: "Python Masterclass",
            enrolledAt: pastDate(15),
            status: "active"
        }
    ]));
}

/**
 * b2b_sessions: Riwayat sesi/pertemuan yang sudah berlangsung
 * Diisi oleh Guru, dibaca oleh Admin (finance) & Siswa (parent hub)
 */
const currentSessions = localStorage.getItem('b2b_sessions');
if (!currentSessions || currentSessions === '[]') {
    const pastDate = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().split('T')[0]; };
    localStorage.setItem('b2b_sessions', JSON.stringify([
        {
            id: "ses-001",
            enrollmentId: "enr-001",
            studentId: "62812345678",
            studentName: "Alex Johnson",
            teacherId: "B2B-T-8812",
            teacherName: "Budi Doremi",
            moduleId: "mod-python",
            moduleName: "Python Masterclass",
            topic: "Pengenalan Variabel & Tipe Data",
            date: pastDate(10),
            attendance: "hadir",
            score: 90,
            notes: "Alex menunjukkan perkembangan yang sangat pesat. Memahami konsep variabel dengan baik.",
            honorariumPerSesi: 75000
        },
        {
            id: "ses-002",
            enrollmentId: "enr-001",
            studentId: "62812345678",
            studentName: "Alex Johnson",
            teacherId: "B2B-T-8812",
            teacherName: "Budi Santoso",
            moduleId: "mod-python",
            moduleName: "Python Masterclass",
            topic: "Control Flow: If Else",
            date: pastDate(5),
            attendance: "hadir",
            score: 85,
            notes: "Diperlukan latihan tambahan di bagian nested condition.",
            honorariumPerSesi: 75000
        },
        {
            id: "ses-003",
            enrollmentId: "enr-002",
            studentId: "62898765432",
            studentName: "Sarah Smith",
            teacherId: "B2B-T-8812",
            teacherName: "Budi Santoso",
            moduleId: "mod-webdev",
            moduleName: "Web Development Fundamentals",
            topic: "HTML Dasar & Struktur Halaman",
            date: pastDate(8),
            attendance: "hadir",
            score: 95,
            notes: "Sarah sangat antusias dan cepat memahami struktur HTML.",
            honorariumPerSesi: 75000
        },
        {
            id: "ses-004",
            enrollmentId: "enr-003",
            studentId: "62877001122",
            studentName: "Rio Kevin",
            teacherId: "B2B-T-9901",
            teacherName: "Siti Aminah",
            moduleId: "mod-python",
            moduleName: "Python Masterclass",
            topic: "Pengenalan Variabel & Tipe Data",
            date: pastDate(7),
            attendance: "tidak hadir",
            score: null,
            notes: "Siswa tidak hadir tanpa keterangan.",
            honorariumPerSesi: 75000
        }
    ]));
}
