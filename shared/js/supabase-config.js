/**
 * Bites2Bytes - Supabase Configuration
 * Adds a demo-safe fallback when the hosted Supabase auth/schema is out of sync.
 */

const SUPABASE_URL = 'https://ghrkcyqtnncshpoqxkmj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8GodJfaZr0uk_1vw1-uNYg_si5p74xN';
const DEMO_MODE_KEY = 'b2b_auth_mode';
const DEMO_SESSION_KEY = 'b2b_demo_session';
const DEMO_ADMIN_KEY = 'b2b_admin_profile';

window.B2B_Supabase = {
    client: null,
    getCurrentProfile: null,
    subscribeToBroadcasts: null
};

function readJson(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (_error) {
        return fallback;
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function shouldUseDemoMode() {
    return localStorage.getItem(DEMO_MODE_KEY) === 'demo' || !!localStorage.getItem(DEMO_SESSION_KEY);
}

function setDemoMode(value) {
    localStorage.setItem(DEMO_MODE_KEY, value);
}

function getAdminProfile() {
    const stored = readJson(DEMO_ADMIN_KEY, null);
    return {
        id: 'admin',
        wa_number: 'admin',
        name: stored?.name || 'Administrator',
        role: 'admin',
        extra: stored?.extra || 'Platform Owner',
        mpin: stored?.mpin || '123456',
        honorarium: stored?.honorarium || 0,
        sessions_completed: stored?.sessions_completed || 0,
        created_at: stored?.created_at || new Date().toISOString(),
        bio: stored?.bio || '',
        photo_url: stored?.photo_url || ''
    };
}

function saveAdminProfile(profile) {
    writeJson(DEMO_ADMIN_KEY, {
        ...getAdminProfile(),
        ...profile
    });
}

function getStoredUsers() {
    const users = readJson('b2b_users', []);
    return users.map((user) => ({
        id: user.id,
        wa_number: user.id,
        name: user.name,
        role: user.role,
        extra: user.extra || '',
        mpin: user.mpin || '',
        honorarium: user.honorarium || 75000,
        sessions_completed: user.sessionsCompleted || 0,
        created_at: user.created_at || new Date().toISOString(),
        bio: user.bio || '',
        photo_url: user.photoUrl || ''
    }));
}

function saveStoredUsers(users) {
    const nonAdminUsers = users
        .filter((user) => user.role !== 'admin')
        .map((user) => ({
            id: user.wa_number || user.id,
            name: user.name,
            role: user.role,
            extra: user.extra || '',
            mpin: user.mpin || '',
            honorarium: user.honorarium || 75000,
            sessionsCompleted: user.sessions_completed || 0,
            bio: user.bio || '',
            photoUrl: user.photo_url || ''
        }));

    writeJson('b2b_users', nonAdminUsers);
}

function getProfiles() {
    return [getAdminProfile(), ...getStoredUsers()];
}

function getProfileById(id) {
    return getProfiles().find((profile) => profile.id === id || profile.wa_number === id) || null;
}

function saveProfiles(profiles) {
    const admin = profiles.find((profile) => profile.role === 'admin');
    if (admin) saveAdminProfile(admin);
    saveStoredUsers(profiles);
}

function getModules() {
    return readJson('b2b_modules', []).map((module) => ({
        id: module.id,
        title: module.title,
        summary: module.summary || '',
        teacher_id: module.teacher_id || module.teacherId || null,
        topics: module.topics || [],
        exam: module.exam || [],
        created_at: module.created_at || new Date().toISOString()
    }));
}

function saveModules(modules) {
    writeJson('b2b_modules', modules.map((module) => ({
        id: module.id,
        title: module.title,
        summary: module.summary || '',
        teacherId: module.teacher_id || null,
        topics: module.topics || [],
        exam: module.exam || [],
        created_at: module.created_at || new Date().toISOString()
    })));
}

function getEnrollments() {
    return readJson('b2b_enrollments', []).map((enrollment) => ({
        id: enrollment.id,
        student_id: enrollment.student_id || enrollment.studentId,
        teacher_id: enrollment.teacher_id || enrollment.teacherId,
        module_id: enrollment.module_id || enrollment.moduleId,
        status: enrollment.status || 'active',
        created_at: enrollment.created_at || enrollment.enrolledAt || new Date().toISOString(),
        enrolled_at: enrollment.enrolled_at || enrollment.enrolledAt || new Date().toISOString().split('T')[0]
    }));
}

function saveEnrollments(enrollments) {
    const profiles = getProfiles();
    const modules = getModules();

    writeJson('b2b_enrollments', enrollments.map((enrollment) => ({
        id: enrollment.id,
        studentId: enrollment.student_id,
        studentName: getProfileById(enrollment.student_id)?.name || '',
        teacherId: enrollment.teacher_id,
        teacherName: getProfileById(enrollment.teacher_id)?.name || '',
        moduleId: enrollment.module_id,
        moduleName: modules.find((module) => module.id === enrollment.module_id)?.title || '',
        enrolledAt: enrollment.enrolled_at || enrollment.created_at || new Date().toISOString().split('T')[0],
        status: enrollment.status || 'active'
    })));
}

function getSessions() {
    return readJson('b2b_sessions', []).map((session) => ({
        id: session.id,
        enrollment_id: session.enrollment_id || session.enrollmentId || null,
        student_id: session.student_id || session.studentId || null,
        teacher_id: session.teacher_id || session.teacherId || null,
        module_id: session.module_id || session.moduleId || null,
        topic: session.topic || '',
        date: session.date || new Date().toISOString().split('T')[0],
        attendance: session.attendance || null,
        score: session.score ?? null,
        notes: session.notes || '',
        honorarium: session.honorarium || session.honorariumPerSesi || 75000,
        honorarium_per_sesi: session.honorarium_per_sesi || session.honorariumPerSesi || 75000,
        created_at: session.created_at || new Date().toISOString()
    }));
}

function saveSessions(sessions) {
    const profiles = getProfiles();
    const modules = getModules();

    writeJson('b2b_sessions', sessions.map((session) => ({
        id: session.id,
        enrollmentId: session.enrollment_id,
        studentId: session.student_id,
        studentName: getProfileById(session.student_id)?.name || '',
        teacherId: session.teacher_id,
        teacherName: getProfileById(session.teacher_id)?.name || '',
        moduleId: session.module_id,
        moduleName: modules.find((module) => module.id === session.module_id)?.title || '',
        topic: session.topic || '',
        date: session.date,
        attendance: session.attendance,
        score: session.score ?? null,
        notes: session.notes || '',
        honorariumPerSesi: session.honorarium || session.honorarium_per_sesi || 75000,
        created_at: session.created_at || new Date().toISOString()
    })));
}

function getProgressRows() {
    const progress = readJson('b2b_progress', {});
    return Object.entries(progress).map(([studentId, value]) => ({
        student_id: studentId,
        completed_topics: value.completedTopics || [],
        quiz_scores: value.quizScores || {},
        badges: value.badges || [],
        certificates: value.certificates || [],
        xp: value.xp || 0
    }));
}

function saveProgressRows(rows) {
    const next = {};
    rows.forEach((row) => {
        next[row.student_id] = {
            completedTopics: row.completed_topics || [],
            quizScores: row.quiz_scores || {},
            badges: row.badges || [],
            certificates: row.certificates || [],
            xp: row.xp || 0
        };
    });
    writeJson('b2b_progress', next);
}

function getScheduleRows() {
    const raw = readJson('b2b_schedules', {});
    const rows = [];

    Object.entries(raw).forEach(([date, entries]) => {
        entries.forEach((entry) => {
            rows.push({
                id: entry.id || makeId('sch'),
                date,
                time: entry.time || '',
                student_id: entry.student_id || entry.studentId || null,
                teacher_id: entry.teacher_id || entry.teacherId || null,
                zoom_link: entry.zoom_link || entry.link || '',
                created_at: entry.created_at || new Date().toISOString()
            });
        });
    });

    return rows;
}

function saveScheduleRows(rows) {
    const grouped = {};
    rows.forEach((row) => {
        if (!grouped[row.date]) grouped[row.date] = [];
        grouped[row.date].push({
            id: row.id,
            studentId: row.student_id,
            teacherId: row.teacher_id,
            time: row.time,
            link: row.zoom_link || '',
            created_at: row.created_at || new Date().toISOString()
        });
    });
    writeJson('b2b_schedules', grouped);
}

function getBroadcastRows() {
    return readJson('b2b_broadcasts', []);
}

function saveBroadcastRows(rows) {
    writeJson('b2b_broadcasts', rows);
    if (rows.length > 0) {
        localStorage.setItem('b2b_broadcast', JSON.stringify(rows[rows.length - 1]));
    }
}

function getLocalRows(table) {
    switch (table) {
    case 'profiles': return getProfiles();
    case 'modules': return getModules();
    case 'enrollments': return getEnrollments();
    case 'sessions': return getSessions();
    case 'progress': return getProgressRows();
    case 'schedules': return getScheduleRows();
    case 'broadcasts': return getBroadcastRows();
    default: return [];
    }
}

function saveLocalRows(table, rows) {
    switch (table) {
    case 'profiles': saveProfiles(rows); break;
    case 'modules': saveModules(rows); break;
    case 'enrollments': saveEnrollments(rows); break;
    case 'sessions': saveSessions(rows); break;
    case 'progress': saveProgressRows(rows); break;
    case 'schedules': saveScheduleRows(rows); break;
    case 'broadcasts': saveBroadcastRows(rows); break;
    default: break;
    }
}

function compareValues(a, b) {
    if (a === b) return 0;
    if (a === null || a === undefined) return 1;
    if (b === null || b === undefined) return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
}

function applyFilters(rows, filters) {
    return rows.filter((row) => filters.every((filter) => {
        const value = row[filter.column];
        if (filter.type === 'eq') return value === filter.value;
        if (filter.type === 'gte') return value >= filter.value;
        return true;
    }));
}

function applyOrders(rows, orders) {
    if (!orders.length) return rows;
    const next = [...rows];
    next.sort((left, right) => {
        for (const order of orders) {
            const comparison = compareValues(left[order.column], right[order.column]);
            if (comparison !== 0) {
                return order.ascending === false ? -comparison : comparison;
            }
        }
        return 0;
    });
    return next;
}

function mapRelationship(table, row, spec) {
    const match = spec.match(/^([a-zA-Z_][\w]*):([a-zA-Z_][\w]*)\((.+)\)$/);
    if (!match) return null;

    const [, alias, relation, rawColumns] = match;
    const relationColumns = rawColumns.split(',').map((column) => column.trim());
    const profiles = getProfiles();
    const modules = getModules();
    const sessions = getSessions();

    if (relation === 'student_id') {
        const profile = profiles.find((item) => item.id === row.student_id) || null;
        return [alias, profile ? pickColumns(profile, relationColumns) : null];
    }

    if (relation === 'teacher_id') {
        const profile = profiles.find((item) => item.id === row.teacher_id) || null;
        return [alias, profile ? pickColumns(profile, relationColumns) : null];
    }

    if (relation === 'module_id') {
        const module = modules.find((item) => item.id === row.module_id) || null;
        return [alias, module ? pickColumns(module, relationColumns) : null];
    }

    if (relation === 'sessions' && table === 'profiles') {
        const teacherSessions = sessions
            .filter((session) => session.teacher_id === row.id)
            .map((session) => pickColumns(session, relationColumns));
        return [alias, teacherSessions];
    }

    return null;
}

function pickColumns(row, columns) {
    if (!columns.length || (columns.length === 1 && columns[0] === '*')) return { ...row };
    const picked = {};
    columns.forEach((column) => {
        if (column in row) picked[column] = row[column];
    });
    return picked;
}

function applySelect(table, rows, columns) {
    if (!columns || columns === '*') return rows.map((row) => ({ ...row }));

    const specs = columns.split(',').map((item) => item.trim());
    return rows.map((row) => {
        const next = {};

        specs.forEach((spec) => {
            if (spec === '*') {
                Object.assign(next, row);
                return;
            }

            if (spec.includes(':') && spec.includes('(') && spec.endsWith(')')) {
                const relation = mapRelationship(table, row, spec);
                if (relation) next[relation[0]] = relation[1];
                return;
            }

            if (spec in row) next[spec] = row[spec];
        });

        return next;
    });
}

function buildDemoUser(profile) {
    return {
        id: profile.id,
        email: `${profile.wa_number || profile.id}@bites2bytes.com`,
        user_metadata: {
            name: profile.name,
            role: profile.role,
            wa_number: profile.wa_number || profile.id
        }
    };
}

function bootstrapDashboardSession() {
    const pathname = window.location.pathname || '';
    const currentUser = readJson('b2b_currentUser', null);

    if (currentUser && currentUser.id) {
        if (!localStorage.getItem(DEMO_SESSION_KEY) && (currentUser.role || '').toLowerCase()) {
            writeJson(DEMO_SESSION_KEY, buildDemoUser(currentUser));
        }
        if ((currentUser.role || '').toLowerCase() && localStorage.getItem(DEMO_MODE_KEY) !== 'demo') {
            setDemoMode('demo');
        }
        return;
    }

    let fallbackProfile = null;
    if (pathname.includes('/admin')) {
        fallbackProfile = getAdminProfile();
    } else if (pathname.includes('/teacher')) {
        fallbackProfile = getProfiles().find((profile) => profile.role === 'teacher') || null;
    } else if (pathname.includes('/student')) {
        fallbackProfile = getProfiles().find((profile) => profile.role === 'student') || null;
    }

    if (!fallbackProfile) return;

    setDemoMode('demo');
    writeJson(DEMO_SESSION_KEY, buildDemoUser(fallbackProfile));
    localStorage.setItem('b2b_currentUser', JSON.stringify({
        ...fallbackProfile,
        loginTime: new Date().toISOString()
    }));
}

class LocalQueryBuilder {
    constructor(table, realClient) {
        this.table = table;
        this.realClient = realClient;
        this.mode = 'select';
        this.columns = '*';
        this.options = {};
        this.filters = [];
        this.orders = [];
        this.limitCount = null;
        this.singleMode = false;
        this.payload = null;
    }

    select(columns = '*', options = {}) {
        this.mode = 'select';
        this.columns = columns;
        this.options = options;
        return this;
    }

    update(payload) {
        this.mode = 'update';
        this.payload = payload;
        return this;
    }

    insert(payload) {
        this.mode = 'insert';
        this.payload = Array.isArray(payload) ? payload : [payload];
        return this;
    }

    delete() {
        this.mode = 'delete';
        return this;
    }

    eq(column, value) {
        this.filters.push({ type: 'eq', column, value });
        return this;
    }

    gte(column, value) {
        this.filters.push({ type: 'gte', column, value });
        return this;
    }

    order(column, options = {}) {
        this.orders.push({ column, ascending: options.ascending !== false });
        return this;
    }

    limit(count) {
        this.limitCount = count;
        return this;
    }

    single() {
        this.singleMode = true;
        return this;
    }

    then(resolve, reject) {
        return this.execute().then(resolve, reject);
    }

    async execute() {
        if (shouldUseDemoMode() || !this.realClient) {
            return this.executeLocal();
        }

        try {
            return await this.executeRemote();
        } catch (error) {
            console.warn('Remote query failed, switching to demo mode for this session.', error);
            setDemoMode('demo');
            return this.executeLocal();
        }
    }

    async executeRemote() {
        let query = this.realClient.from(this.table);

        if (this.mode === 'select') {
            query = query.select(this.columns, this.options);
        } else if (this.mode === 'update') {
            query = query.update(this.payload);
        } else if (this.mode === 'insert') {
            query = query.insert(this.payload);
        } else if (this.mode === 'delete') {
            query = query.delete();
        }

        this.filters.forEach((filter) => {
            if (filter.type === 'eq') query = query.eq(filter.column, filter.value);
            if (filter.type === 'gte') query = query.gte(filter.column, filter.value);
        });

        this.orders.forEach((order) => {
            query = query.order(order.column, { ascending: order.ascending });
        });

        if (this.limitCount !== null) query = query.limit(this.limitCount);
        if (this.singleMode) query = query.single();

        return query;
    }

    async executeLocal() {
        const rows = getLocalRows(this.table);

        if (this.mode === 'insert') {
            const insertedRows = this.payload.map((row) => ({
                id: row.id || makeId(this.table.slice(0, 3)),
                created_at: row.created_at || new Date().toISOString(),
                ...row
            }));
            const nextRows = [...rows, ...insertedRows];
            saveLocalRows(this.table, nextRows);
            return { data: insertedRows, error: null };
        }

        if (this.mode === 'update') {
            const nextRows = rows.map((row) => (
                applyFilters([row], this.filters).length
                    ? { ...row, ...this.payload }
                    : row
            ));
            const updated = nextRows.filter((row) => applyFilters([row], this.filters).length);
            saveLocalRows(this.table, nextRows);
            return { data: updated, error: null };
        }

        if (this.mode === 'delete') {
            const kept = rows.filter((row) => !applyFilters([row], this.filters).length);
            const removed = rows.filter((row) => applyFilters([row], this.filters).length);
            saveLocalRows(this.table, kept);
            return { data: removed, error: null };
        }

        let filtered = applyFilters(rows, this.filters);
        filtered = applyOrders(filtered, this.orders);
        if (this.limitCount !== null) filtered = filtered.slice(0, this.limitCount);

        if (this.options?.head && this.options?.count === 'exact') {
            return { data: null, count: filtered.length, error: null };
        }

        const selected = applySelect(this.table, filtered, this.columns);

        if (this.singleMode) {
            if (selected.length === 0) {
                return {
                    data: null,
                    error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
                };
            }
            return { data: selected[0], error: null };
        }

        return { data: selected, error: null };
    }
}

function createCompatibleClient(realClient) {
    return {
        auth: {
            signInWithPassword: async ({ email, password }) => {
                if (realClient && !shouldUseDemoMode()) {
                    const remoteResult = await realClient.auth.signInWithPassword({ email, password });
                    if (!remoteResult.error) {
                        setDemoMode('remote');
                        localStorage.removeItem(DEMO_SESSION_KEY);
                        return remoteResult;
                    }

                    const errorMessage = String(remoteResult.error?.message || '').toLowerCase();
                    const canTryDemo = ['invalid_credentials', 'email_not_confirmed'].includes(remoteResult.error?.error_code)
                        || errorMessage.includes('invalid login credentials')
                        || errorMessage.includes('email not confirmed');
                    if (!canTryDemo) return remoteResult;
                }

                const username = (email || '').split('@')[0];
                const profile = getProfiles().find((item) => (
                    item.id === username || item.wa_number === username
                ));

                if (!profile || profile.mpin !== password) {
                    return {
                        data: { user: null, session: null },
                        error: { message: 'ID atau MPIN demo tidak cocok.' }
                    };
                }

                const user = buildDemoUser(profile);
                setDemoMode('demo');
                writeJson(DEMO_SESSION_KEY, user);
                localStorage.setItem('b2b_currentUser', JSON.stringify({
                    ...profile,
                    loginTime: new Date().toISOString()
                }));
                return {
                    data: { user, session: { access_token: 'demo-session', token_type: 'bearer' } },
                    error: null
                };
            },

            signUp: async ({ email, password, options }) => {
                if (realClient && !shouldUseDemoMode()) {
                    const remoteResult = await realClient.auth.signUp({ email, password, options });
                    if (!remoteResult.error) return remoteResult;
                }

                const username = (email || '').split('@')[0] || 'admin';
                const currentAdmin = getAdminProfile();
                const nextAdmin = {
                    ...currentAdmin,
                    id: username,
                    wa_number: options?.data?.wa_number || username,
                    name: options?.data?.name || currentAdmin.name,
                    role: options?.data?.role || 'admin',
                    mpin: password || currentAdmin.mpin
                };

                saveAdminProfile(nextAdmin);
                const user = buildDemoUser(nextAdmin);
                return { data: { user, session: null }, error: null };
            },

            getUser: async () => {
                if (shouldUseDemoMode()) {
                    const user = readJson(DEMO_SESSION_KEY, null);
                    return { data: { user }, error: null };
                }

                if (!realClient) return { data: { user: null }, error: null };
                return realClient.auth.getUser();
            },

            signOut: async () => {
                localStorage.removeItem(DEMO_SESSION_KEY);
                localStorage.removeItem('b2b_currentUser');
                if (shouldUseDemoMode() || !realClient) {
                    setDemoMode('remote');
                    return { error: null };
                }
                setDemoMode('remote');
                return realClient.auth.signOut();
            }
        },

        from(table) {
            return new LocalQueryBuilder(table, realClient);
        },

        channel() {
            return {
                on() { return this; },
                subscribe() { return { unsubscribe() {} }; }
            };
        }
    };
}

function initSupabase() {
    if (!window.supabase) return false;

    bootstrapDashboardSession();

    const realClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const client = createCompatibleClient(realClient);

    window.B2B_Supabase.client = client;
    window.B2B_Supabase.getCurrentProfile = async function() {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return null;

        const { data: profile, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        return profile;
    };

    window.B2B_Supabase.subscribeToBroadcasts = function(callback) {
        return client
            .channel('public:broadcasts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, (payload) => {
                callback(payload.new);
            })
            .subscribe();
    };

    console.log('Supabase Client Initialized');
    return true;
}

if (!initSupabase()) {
    const checkInterval = setInterval(() => {
        if (initSupabase()) {
            clearInterval(checkInterval);
        }
    }, 100);

    setTimeout(() => clearInterval(checkInterval), 5000);
}
