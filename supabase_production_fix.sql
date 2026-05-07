-- Bites2Bytes production repair patch
-- Run this in Supabase Dashboard > SQL Editor for project ghrkcyqtnncshpoqxkmj.
-- It fixes student signup, progress creation, and admin profile management.

-- Profile biodata fields used by the account settings modal.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Helpers
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'teacher'
    );
$$;

-- Auth signup profile trigger: align with production columns.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, wa_number, mpin)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User Baru'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        COALESCE(NEW.raw_user_meta_data->>'wa_number', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'mpin', '123456')
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        wa_number = EXCLUDED.wa_number,
        mpin = EXCLUDED.mpin;

    RETURN NEW;
END;
$$;

-- Student progress trigger: make it security definer and idempotent.
CREATE OR REPLACE FUNCTION public.handle_new_student_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role = 'student' THEN
        INSERT INTO public.progress (student_id)
        VALUES (NEW.id)
        ON CONFLICT (student_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_student_created ON public.profiles;
CREATE TRIGGER on_student_created
    AFTER INSERT OR UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_student_progress();

-- XP trigger should also be able to update progress under RLS.
CREATE OR REPLACE FUNCTION public.update_xp_on_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.attendance = 'hadir' AND COALESCE(NEW.score, 0) >= 80 THEN
        INSERT INTO public.progress (student_id, xp)
        VALUES (NEW.student_id, 250)
        ON CONFLICT (student_id) DO UPDATE
        SET xp = public.progress.xp + 250;
    END IF;

    RETURN NEW;
END;
$$;

-- Add missing progress rows for existing student profiles.
INSERT INTO public.progress (student_id)
SELECT id
FROM public.profiles
WHERE role = 'student'
ON CONFLICT (student_id) DO NOTHING;

-- RLS policy repairs.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.progress;
CREATE POLICY "Users can insert own progress"
ON public.progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own progress" ON public.progress;
CREATE POLICY "Users can update own progress"
ON public.progress
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id OR public.is_admin())
WITH CHECK (auth.uid() = student_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins and teachers can manage modules" ON public.modules;
CREATE POLICY "Admins and teachers can manage modules"
ON public.modules
FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_teacher())
WITH CHECK (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "Admins and teachers can manage enrollments" ON public.enrollments;
CREATE POLICY "Admins and teachers can manage enrollments"
ON public.enrollments
FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_teacher())
WITH CHECK (public.is_admin() OR public.is_teacher());

DROP POLICY IF EXISTS "Teachers can insert sessions" ON public.sessions;
CREATE POLICY "Teachers can insert sessions"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() OR teacher_id = auth.uid());

DROP POLICY IF EXISTS "Admins and teachers can manage schedules" ON public.schedules;
CREATE POLICY "Admins and teachers can manage schedules"
ON public.schedules
FOR ALL
TO authenticated
USING (public.is_admin() OR teacher_id = auth.uid())
WITH CHECK (public.is_admin() OR teacher_id = auth.uid());

DROP POLICY IF EXISTS "Admins can insert broadcasts" ON public.broadcasts;
CREATE POLICY "Admins can insert broadcasts"
ON public.broadcasts
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());
