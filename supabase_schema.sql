-- 1. Tables for Bites2Bytes

-- Profiles (extends users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    wa_number TEXT UNIQUE, -- Original ID in the app
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'teacher', 'student')),
    extra TEXT,
    mpin TEXT, -- Stored as text for now, should be hashed in production
    honorarium INTEGER DEFAULT 75000,
    sessions_completed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modules
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT,
    teacher_id UUID REFERENCES profiles(id),
    topics JSONB DEFAULT '[]'::JSONB,
    exam JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id),
    teacher_id UUID REFERENCES profiles(id),
    module_id UUID REFERENCES modules(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    enrolled_at DATE DEFAULT CURRENT_DATE,
    UNIQUE (student_id, module_id)
);

-- Sessions (Logs)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id),
    teacher_id UUID REFERENCES profiles(id),
    module_id UUID REFERENCES modules(id),
    topic TEXT,
    date DATE DEFAULT CURRENT_DATE,
    attendance TEXT CHECK (attendance IN ('hadir', 'izin', 'tidak hadir')),
    score INTEGER,
    notes TEXT,
    honorarium_per_sesi INTEGER DEFAULT 75000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress
CREATE TABLE progress (
    student_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    completed_topics JSONB DEFAULT '[]'::JSONB,
    quiz_scores JSONB DEFAULT '{}'::JSONB,
    badges JSONB DEFAULT '[]'::JSONB,
    certificates JSONB DEFAULT '[]'::JSONB,
    xp INTEGER DEFAULT 0
);

-- Broadcasts (Real-time)
CREATE TABLE broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    image_url TEXT,
    sender TEXT,
    target TEXT DEFAULT 'all',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Schedules
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE,
    time TEXT,
    student_id UUID REFERENCES profiles(id),
    teacher_id UUID REFERENCES profiles(id),
    zoom_link TEXT, -- Zoom/GMeet link
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE REALTIME
-- In Supabase dashboard, go to Database -> Replication -> supabase_realtime and enable for 'broadcasts'

-- 3. TRIGGERS
-- Auto-create progress when profile is student
CREATE OR REPLACE FUNCTION handle_new_student_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'student' THEN
        INSERT INTO progress (student_id) VALUES (NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_student_created
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_student_progress();

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, wa_number, mpin)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User Baru'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        COALESCE(NEW.raw_user_meta_data->>'wa_number', NEW.email), -- Fallback to email
        '123456' -- Default MPIN
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Auto-update XP when session score is added
CREATE OR REPLACE FUNCTION update_xp_on_session()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.attendance = 'hadir' AND NEW.score >= 80 THEN
        UPDATE progress
        SET xp = xp + 250
        WHERE student_id = NEW.student_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_session_logged
    AFTER INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_xp_on_session();

-- 4. RLS POLICIES (Development: Permissive)
-- By default, RLS is enabled but no policies exist. This locks all tables.
-- Run these to allow the app to function in development.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Enable insert for authenticated users only" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Development profile management" ON profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modules are viewable by everyone" ON modules FOR SELECT USING (true);
CREATE POLICY "Admins/Teachers can manage modules" ON modules FOR ALL USING (true); -- Simplify for dev

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrollments are viewable by everyone" ON enrollments FOR SELECT USING (true);
CREATE POLICY "Management can insert enrollments" ON enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "Management can update enrollments" ON enrollments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Management can delete enrollments" ON enrollments FOR DELETE USING (true);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions are viewable by everyone" ON sessions FOR SELECT USING (true);
CREATE POLICY "Teachers can insert sessions" ON sessions FOR INSERT WITH CHECK (true);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Progress viewable by everyone" ON progress FOR SELECT USING (true);
CREATE POLICY "Users can update own progress" ON progress FOR UPDATE USING (auth.uid() = student_id);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Broadcasts viewable by everyone" ON broadcasts FOR SELECT USING (true);
CREATE POLICY "Admins can insert broadcasts" ON broadcasts FOR INSERT WITH CHECK (true);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schedules viewable by everyone" ON schedules FOR SELECT USING (true);
CREATE POLICY "Management can insert schedules" ON schedules FOR INSERT WITH CHECK (true);
