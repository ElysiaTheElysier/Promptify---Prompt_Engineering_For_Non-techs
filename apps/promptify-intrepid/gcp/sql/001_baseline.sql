-- Intrepid Cloud SQL candidate. Fresh EMPTY staging database only.
-- Source-derived and offline tested; live catalog drift must be checked before cutover.
-- Supabase API/Auth/Storage/Realtime are NOT implemented by this file.
-- Migration owner executes this file. Runtime roles remain NOLOGIN.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA auth FROM PUBLIC;
-- These functions consume SERVER-VERIFIED transaction-local claims, not browser input.
-- Preserve legacy UUID subjects for existing RPCs. Firebase/Google subjects need mapping.
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
$$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),auth.jwt()->>'sub')::uuid;
$$;
GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION auth.jwt(),auth.uid() TO authenticated,service_role;

-- supabase/schema.sql statement 1
CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL, full_name text NOT NULL, role text NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'instructor', 'admin')), auth_provider_id text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- supabase/schema.sql statement 2
CREATE TABLE IF NOT EXISTS clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, industry text NOT NULL, created_at timestamptz DEFAULT now());

-- supabase/schema.sql statement 3
CREATE TABLE IF NOT EXISTS courses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text, status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')), created_by uuid REFERENCES users (id) ON DELETE SET NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());

-- supabase/schema.sql statement 4
CREATE TABLE IF NOT EXISTS classes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_code text UNIQUE NOT NULL, course_id uuid NOT NULL REFERENCES courses (id) ON DELETE RESTRICT, client_id uuid NOT NULL REFERENCES clients (id) ON DELETE RESTRICT, department text NOT NULL, start_date timestamptz NOT NULL, end_date timestamptz NOT NULL, status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'completed', 'archived')), enrollment_mode text NOT NULL DEFAULT 'instructor' CHECK (enrollment_mode IN ('instructor', 'self_enroll')), created_at timestamptz DEFAULT now());

-- supabase/schema.sql statement 5
CREATE SEQUENCE IF NOT EXISTS learner_code_seq START WITH 1;

-- supabase/schema.sql statement 6
CREATE OR REPLACE FUNCTION generate_learner_code() RETURNS text AS $$
BEGIN
  RETURN 'LRN-' || LPAD(nextval('learner_code_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- supabase/schema.sql statement 7
CREATE TABLE IF NOT EXISTS learners (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), learner_code text UNIQUE NOT NULL DEFAULT generate_learner_code(), user_id uuid UNIQUE NOT NULL REFERENCES users (id) ON DELETE CASCADE, created_at timestamptz DEFAULT now());

-- supabase/schema.sql statement 8
CREATE TABLE IF NOT EXISTS enrollments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), learner_id uuid NOT NULL REFERENCES learners (id) ON DELETE CASCADE, class_id uuid NOT NULL REFERENCES classes (id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'removed', 'expired')), joined_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), CONSTRAINT unique_learner_class UNIQUE (learner_id, class_id));

-- supabase/schema.sql statement 9
CREATE INDEX IF NOT EXISTS idx_classes_course ON classes (course_id);

-- supabase/schema.sql statement 10
CREATE INDEX IF NOT EXISTS idx_classes_client ON classes (client_id);

-- supabase/schema.sql statement 11
CREATE INDEX IF NOT EXISTS idx_enrollments_learner ON enrollments (learner_id);

-- supabase/schema.sql statement 12
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments (class_id);

-- supabase/schema.sql statement 13
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- supabase/schema.sql statement 14
CREATE OR REPLACE FUNCTION trigger_set_timestamp() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- supabase/schema.sql statement 15
DROP TRIGGER IF EXISTS set_timestamp_users ON users;

-- supabase/schema.sql statement 16
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- supabase/schema.sql statement 17
DROP TRIGGER IF EXISTS set_timestamp_courses ON courses;

-- supabase/schema.sql statement 18
CREATE TRIGGER set_timestamp_courses BEFORE UPDATE ON courses FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- supabase/schema.sql statement 19
DROP TRIGGER IF EXISTS set_timestamp_enrollments ON enrollments;

-- supabase/schema.sql statement 20
CREATE TRIGGER set_timestamp_enrollments BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- supabase/schema.sql statement 24
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- supabase/schema.sql statement 25
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- supabase/schema.sql statement 26
REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM anon;

-- supabase/schema.sql statement 27
GRANT USAGE ON SCHEMA public TO authenticated;

-- supabase/schema.sql statement 28
GRANT USAGE, SELECT ON SEQUENCE public.learner_code_seq TO authenticated;

-- supabase/schema.sql statement 29
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clients, public.courses, public.classes TO authenticated;

-- supabase/schema.sql statement 30
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users, public.learners, public.enrollments TO authenticated;

-- supabase/schema.sql statement 31
CREATE OR REPLACE FUNCTION public.is_instructor() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE (auth_provider_id = auth.uid()::text OR email = auth.jwt() ->> 'email')
      AND role IN ('instructor', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public', 'pg_temp';

-- supabase/schema.sql statement 32
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS uuid AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.users
  WHERE (auth_provider_id = auth.uid()::text OR email = auth.jwt() ->> 'email')
  LIMIT 1;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public', 'pg_temp';

-- supabase/schema.sql statement 33
REVOKE ALL PRIVILEGES ON FUNCTION public.is_instructor () FROM PUBLIC, anon;

-- supabase/schema.sql statement 34
GRANT EXECUTE ON FUNCTION public.is_instructor () TO authenticated;

-- supabase/schema.sql statement 35
REVOKE ALL PRIVILEGES ON FUNCTION public.current_user_id () FROM PUBLIC, anon;

-- supabase/schema.sql statement 36
GRANT EXECUTE ON FUNCTION public.current_user_id () TO authenticated;

-- supabase/schema.sql statement 37
CREATE OR REPLACE FUNCTION public.check_user_privilege_escalation() RETURNS trigger AS $$
BEGIN
  IF NOT public.is_instructor() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Privilege escalation denied: Learner không được phép tự thay đổi vai trò (role).';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Không được phép thay đổi địa chỉ email của tài khoản.';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Không được phép thay đổi user id.';
    END IF;
    IF OLD.auth_provider_id IS NOT NULL AND NEW.auth_provider_id IS DISTINCT FROM OLD.auth_provider_id THEN
      RAISE EXCEPTION 'Không được phép thay đổi auth_provider_id đã liên kết.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- supabase/schema.sql statement 38
DROP TRIGGER IF EXISTS trg_check_user_privilege_escalation ON public.users;

-- supabase/schema.sql statement 39
CREATE TRIGGER trg_check_user_privilege_escalation BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE public.check_user_privilege_escalation();

-- supabase/schema.sql statement 40
ALTER TABLE users ENABLE ROW LEVEL SECURITY ;

-- supabase/schema.sql statement 41
ALTER TABLE clients ENABLE ROW LEVEL SECURITY ;

-- supabase/schema.sql statement 42
ALTER TABLE courses ENABLE ROW LEVEL SECURITY ;

-- supabase/schema.sql statement 43
ALTER TABLE classes ENABLE ROW LEVEL SECURITY ;

-- supabase/schema.sql statement 44
ALTER TABLE learners ENABLE ROW LEVEL SECURITY ;

-- supabase/schema.sql statement 45
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY ;

-- supabase/schema.sql statement 46
DROP POLICY IF EXISTS "Users can read own profile or instructor read all" ON users;

-- supabase/schema.sql statement 47
CREATE POLICY "Users can read own profile or instructor read all" ON users AS PERMISSIVE FOR select TO authenticated USING (auth_provider_id = CAST(auth.uid() AS text) OR email = (auth.jwt() ->> 'email') OR public.is_instructor());

-- supabase/schema.sql statement 48
DROP POLICY IF EXISTS "Users can insert own profile or instructor insert" ON users;

-- supabase/schema.sql statement 49
CREATE POLICY "Users can insert own profile or instructor insert" ON users AS PERMISSIVE FOR insert TO authenticated WITH CHECK ((email = (auth.jwt() ->> 'email') AND role = 'learner') OR public.is_instructor());

-- supabase/schema.sql statement 50
DROP POLICY IF EXISTS "Users can update own profile or instructor update" ON users;

-- supabase/schema.sql statement 51
CREATE POLICY "Users can update own profile or instructor update" ON users AS PERMISSIVE FOR update TO authenticated USING (auth_provider_id = CAST(auth.uid() AS text) OR email = (auth.jwt() ->> 'email') OR public.is_instructor()) WITH CHECK (public.is_instructor() OR ((auth_provider_id = CAST(auth.uid() AS text) OR email = (auth.jwt() ->> 'email')) AND role = 'learner'));

-- supabase/schema.sql statement 52
DROP POLICY IF EXISTS "Clients read by all" ON clients;

-- supabase/schema.sql statement 53
DROP POLICY IF EXISTS "Clients read by authenticated only" ON clients;

-- supabase/schema.sql statement 54
CREATE POLICY "Clients read by authenticated only" ON clients AS PERMISSIVE FOR select TO authenticated USING (TRUE);

-- supabase/schema.sql statement 55
DROP POLICY IF EXISTS "Clients modified by instructors only" ON clients;

-- supabase/schema.sql statement 56
CREATE POLICY "Clients modified by instructors only" ON clients AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/schema.sql statement 57
DROP POLICY IF EXISTS "Courses read active or instructor read all" ON courses;

-- supabase/schema.sql statement 58
CREATE POLICY "Courses read active or instructor read all" ON courses AS PERMISSIVE FOR select TO authenticated USING (status = 'active' OR public.is_instructor());

-- supabase/schema.sql statement 59
DROP POLICY IF EXISTS "Courses modified by instructors only" ON courses;

-- supabase/schema.sql statement 60
CREATE POLICY "Courses modified by instructors only" ON courses AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/schema.sql statement 61
DROP POLICY IF EXISTS "Classes read active or enrolled or instructor" ON classes;

-- supabase/schema.sql statement 62
CREATE POLICY "Classes read active or enrolled or instructor" ON classes AS PERMISSIVE FOR select TO authenticated USING (status = 'active' OR public.is_instructor() OR EXISTS (SELECT 1 FROM enrollments AS e INNER JOIN learners AS l ON l.id = e.learner_id WHERE e.class_id = classes.id AND l.user_id = public.current_user_id()));

-- supabase/schema.sql statement 63
DROP POLICY IF EXISTS "Classes modified by instructors only" ON classes;

-- supabase/schema.sql statement 64
CREATE POLICY "Classes modified by instructors only" ON classes AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/schema.sql statement 65
DROP POLICY IF EXISTS "Learners read own record or instructor read all" ON learners;

-- supabase/schema.sql statement 66
CREATE POLICY "Learners read own record or instructor read all" ON learners AS PERMISSIVE FOR select TO authenticated USING (user_id = public.current_user_id() OR public.is_instructor());

-- supabase/schema.sql statement 67
DROP POLICY IF EXISTS "Learners insert own record or instructor insert" ON learners;

-- supabase/schema.sql statement 68
CREATE POLICY "Learners insert own record or instructor insert" ON learners AS PERMISSIVE FOR insert TO authenticated WITH CHECK (user_id = public.current_user_id() OR public.is_instructor());

-- supabase/schema.sql statement 69
DROP POLICY IF EXISTS "Learners update by instructor" ON learners;

-- supabase/schema.sql statement 70
CREATE POLICY "Learners update by instructor" ON learners AS PERMISSIVE FOR update TO authenticated USING (public.is_instructor());

-- supabase/schema.sql statement 71
DROP POLICY IF EXISTS "Enrollments read own or instructor read all" ON enrollments;

-- supabase/schema.sql statement 72
CREATE POLICY "Enrollments read own or instructor read all" ON enrollments AS PERMISSIVE FOR select TO authenticated USING (learner_id IN (SELECT id FROM learners WHERE user_id = public.current_user_id()) OR public.is_instructor());

-- supabase/schema.sql statement 73
DROP POLICY IF EXISTS "Enrollments modified by instructors only" ON enrollments;

-- supabase/schema.sql statement 74
CREATE POLICY "Enrollments modified by instructors only" ON enrollments AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/migrations/002_add_grants_and_rls.sql statement 1
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- supabase/migrations/002_add_grants_and_rls.sql statement 2
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- supabase/migrations/002_add_grants_and_rls.sql statement 3
REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM anon;

-- supabase/migrations/002_add_grants_and_rls.sql statement 4
GRANT USAGE ON SCHEMA public TO authenticated;

-- supabase/migrations/002_add_grants_and_rls.sql statement 5
GRANT USAGE, SELECT ON SEQUENCE public.learner_code_seq TO authenticated;

-- supabase/migrations/002_add_grants_and_rls.sql statement 6
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clients, public.courses, public.classes TO authenticated;

-- supabase/migrations/002_add_grants_and_rls.sql statement 7
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users, public.learners, public.enrollments TO authenticated;

-- supabase/migrations/002_add_grants_and_rls.sql statement 8
CREATE OR REPLACE FUNCTION public.is_instructor() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE (auth_provider_id = auth.uid()::text OR email = auth.jwt() ->> 'email')
      AND role IN ('instructor', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public', 'pg_temp';

-- supabase/migrations/002_add_grants_and_rls.sql statement 9
CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS uuid AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.users
  WHERE (auth_provider_id = auth.uid()::text OR email = auth.jwt() ->> 'email')
  LIMIT 1;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public', 'pg_temp';

-- supabase/migrations/002_add_grants_and_rls.sql statement 10
REVOKE ALL PRIVILEGES ON FUNCTION public.is_instructor () FROM PUBLIC, anon;

-- supabase/migrations/002_add_grants_and_rls.sql statement 11
GRANT EXECUTE ON FUNCTION public.is_instructor () TO authenticated;

-- supabase/migrations/002_add_grants_and_rls.sql statement 12
REVOKE ALL PRIVILEGES ON FUNCTION public.current_user_id () FROM PUBLIC, anon;

-- supabase/migrations/002_add_grants_and_rls.sql statement 13
GRANT EXECUTE ON FUNCTION public.current_user_id () TO authenticated;

-- supabase/migrations/002_add_grants_and_rls.sql statement 14
CREATE OR REPLACE FUNCTION public.check_user_privilege_escalation() RETURNS trigger AS $$
BEGIN
  -- Nếu người thực hiện không phải là instructor/admin:
  IF NOT public.is_instructor() THEN
    -- 1. Tuyệt đối cấm đổi role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Privilege escalation denied: Learner không được phép tự thay đổi vai trò (role).';
    END IF;
    -- 2. Cấm đổi email
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Không được phép thay đổi địa chỉ email của tài khoản.';
    END IF;
    -- 3. Cấm đổi id
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Không được phép thay đổi user id.';
    END IF;
    -- 4. auth_provider_id một khi đã gán thì không được đổi sang tài khoản khác
    IF OLD.auth_provider_id IS NOT NULL AND NEW.auth_provider_id IS DISTINCT FROM OLD.auth_provider_id THEN
      RAISE EXCEPTION 'Không được phép thay đổi auth_provider_id đã liên kết.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- supabase/migrations/002_add_grants_and_rls.sql statement 15
DROP TRIGGER IF EXISTS trg_check_user_privilege_escalation ON public.users;

-- supabase/migrations/002_add_grants_and_rls.sql statement 16
CREATE TRIGGER trg_check_user_privilege_escalation BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE public.check_user_privilege_escalation();

-- supabase/migrations/002_add_grants_and_rls.sql statement 17
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/002_add_grants_and_rls.sql statement 18
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/002_add_grants_and_rls.sql statement 19
ALTER TABLE IF EXISTS public.courses ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/002_add_grants_and_rls.sql statement 20
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/002_add_grants_and_rls.sql statement 21
ALTER TABLE IF EXISTS public.learners ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/002_add_grants_and_rls.sql statement 22
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/002_add_grants_and_rls.sql statement 23
DROP POLICY IF EXISTS "Users can read own profile or instructor read all" ON public.users;

-- supabase/migrations/002_add_grants_and_rls.sql statement 24
CREATE POLICY "Users can read own profile or instructor read all" ON public.users AS PERMISSIVE FOR select TO authenticated USING (auth_provider_id = CAST(auth.uid() AS text) OR email = (auth.jwt() ->> 'email') OR public.is_instructor());

-- supabase/migrations/002_add_grants_and_rls.sql statement 25
DROP POLICY IF EXISTS "Users can insert own profile or instructor insert" ON public.users;

-- supabase/migrations/002_add_grants_and_rls.sql statement 26
CREATE POLICY "Users can insert own profile or instructor insert" ON public.users AS PERMISSIVE FOR insert TO authenticated WITH CHECK ((email = (auth.jwt() ->> 'email') AND role = 'learner') OR public.is_instructor());

-- supabase/migrations/002_add_grants_and_rls.sql statement 27
DROP POLICY IF EXISTS "Users can update own profile or instructor update" ON public.users;

-- supabase/migrations/002_add_grants_and_rls.sql statement 28
CREATE POLICY "Users can update own profile or instructor update" ON public.users AS PERMISSIVE FOR update TO authenticated USING (auth_provider_id = CAST(auth.uid() AS text) OR email = (auth.jwt() ->> 'email') OR public.is_instructor()) WITH CHECK (public.is_instructor() OR ((auth_provider_id = CAST(auth.uid() AS text) OR email = (auth.jwt() ->> 'email')) AND role = 'learner'));

-- supabase/migrations/002_add_grants_and_rls.sql statement 29
DROP POLICY IF EXISTS "Clients read by all" ON public.clients;

-- supabase/migrations/002_add_grants_and_rls.sql statement 30
DROP POLICY IF EXISTS "Clients read by authenticated only" ON public.clients;

-- supabase/migrations/002_add_grants_and_rls.sql statement 31
CREATE POLICY "Clients read by authenticated only" ON public.clients AS PERMISSIVE FOR select TO authenticated USING (TRUE);

-- supabase/migrations/002_add_grants_and_rls.sql statement 32
DROP POLICY IF EXISTS "Clients modified by instructors only" ON public.clients;

-- supabase/migrations/002_add_grants_and_rls.sql statement 33
CREATE POLICY "Clients modified by instructors only" ON public.clients AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/migrations/002_add_grants_and_rls.sql statement 34
DROP POLICY IF EXISTS "Courses read active or instructor read all" ON public.courses;

-- supabase/migrations/002_add_grants_and_rls.sql statement 35
CREATE POLICY "Courses read active or instructor read all" ON public.courses AS PERMISSIVE FOR select TO authenticated USING (status = 'active' OR public.is_instructor());

-- supabase/migrations/002_add_grants_and_rls.sql statement 36
DROP POLICY IF EXISTS "Courses modified by instructors only" ON public.courses;

-- supabase/migrations/002_add_grants_and_rls.sql statement 37
CREATE POLICY "Courses modified by instructors only" ON public.courses AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/migrations/002_add_grants_and_rls.sql statement 38
DROP POLICY IF EXISTS "Classes read active or enrolled or instructor" ON public.classes;

-- supabase/migrations/002_add_grants_and_rls.sql statement 39
CREATE POLICY "Classes read active or enrolled or instructor" ON public.classes AS PERMISSIVE FOR select TO authenticated USING (status = 'active' OR public.is_instructor() OR EXISTS (SELECT 1 FROM public.enrollments AS e INNER JOIN public.learners AS l ON l.id = e.learner_id WHERE e.class_id = classes.id AND l.user_id = public.current_user_id()));

-- supabase/migrations/002_add_grants_and_rls.sql statement 40
DROP POLICY IF EXISTS "Classes modified by instructors only" ON public.classes;

-- supabase/migrations/002_add_grants_and_rls.sql statement 41
CREATE POLICY "Classes modified by instructors only" ON public.classes AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/migrations/002_add_grants_and_rls.sql statement 42
DROP POLICY IF EXISTS "Learners read own record or instructor read all" ON public.learners;

-- supabase/migrations/002_add_grants_and_rls.sql statement 43
CREATE POLICY "Learners read own record or instructor read all" ON public.learners AS PERMISSIVE FOR select TO authenticated USING (user_id = public.current_user_id() OR public.is_instructor());

-- supabase/migrations/002_add_grants_and_rls.sql statement 44
DROP POLICY IF EXISTS "Learners insert own record or instructor insert" ON public.learners;

-- supabase/migrations/002_add_grants_and_rls.sql statement 45
CREATE POLICY "Learners insert own record or instructor insert" ON public.learners AS PERMISSIVE FOR insert TO authenticated WITH CHECK (user_id = public.current_user_id() OR public.is_instructor());

-- supabase/migrations/002_add_grants_and_rls.sql statement 46
DROP POLICY IF EXISTS "Learners update by instructor" ON public.learners;

-- supabase/migrations/002_add_grants_and_rls.sql statement 47
CREATE POLICY "Learners update by instructor" ON public.learners AS PERMISSIVE FOR update TO authenticated USING (public.is_instructor());

-- supabase/migrations/002_add_grants_and_rls.sql statement 48
DROP POLICY IF EXISTS "Enrollments read own or instructor read all" ON public.enrollments;

-- supabase/migrations/002_add_grants_and_rls.sql statement 49
CREATE POLICY "Enrollments read own or instructor read all" ON public.enrollments AS PERMISSIVE FOR select TO authenticated USING (learner_id IN (SELECT id FROM public.learners WHERE user_id = public.current_user_id()) OR public.is_instructor());

-- supabase/migrations/002_add_grants_and_rls.sql statement 50
DROP POLICY IF EXISTS "Enrollments modified by instructors only" ON public.enrollments;

-- supabase/migrations/002_add_grants_and_rls.sql statement 51
CREATE POLICY "Enrollments modified by instructors only" ON public.enrollments AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/migrations/003_create_prompt_attempts.sql statement 1
CREATE TABLE IF NOT EXISTS public.prompt_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), learner_id uuid NOT NULL REFERENCES public.learners (id) ON DELETE CASCADE, class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE, lesson_id text NOT NULL, attempt_number integer NOT NULL DEFAULT 1, prompt_text text NOT NULL, ai_output text NOT NULL, evaluation_json jsonb, model text NOT NULL DEFAULT 'gemini-2.5-flash', latency_ms integer DEFAULT 0, created_at timestamptz DEFAULT now());

-- supabase/migrations/003_create_prompt_attempts.sql statement 2
CREATE INDEX IF NOT EXISTS idx_prompt_attempts_learner ON public.prompt_attempts (learner_id);

-- supabase/migrations/003_create_prompt_attempts.sql statement 3
CREATE INDEX IF NOT EXISTS idx_prompt_attempts_class_lesson ON public.prompt_attempts (class_id, lesson_id);

-- supabase/migrations/003_create_prompt_attempts.sql statement 4
CREATE INDEX IF NOT EXISTS idx_prompt_attempts_created ON public.prompt_attempts (created_at DESC);

-- supabase/migrations/003_create_prompt_attempts.sql statement 5
REVOKE ALL PRIVILEGES ON TABLE public.prompt_attempts FROM anon;

-- supabase/migrations/003_create_prompt_attempts.sql statement 6
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.prompt_attempts TO authenticated;

-- supabase/migrations/003_create_prompt_attempts.sql statement 7
ALTER TABLE public.prompt_attempts ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/003_create_prompt_attempts.sql statement 8
DROP POLICY IF EXISTS "Authenticated users can select prompt attempts" ON public.prompt_attempts;

-- supabase/migrations/003_create_prompt_attempts.sql statement 9
CREATE POLICY "Authenticated users can select prompt attempts" ON public.prompt_attempts AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR learner_id IN (SELECT id FROM public.learners WHERE user_id = public.current_user_id()));

-- supabase/migrations/003_create_prompt_attempts.sql statement 10
DROP POLICY IF EXISTS "Authenticated users can insert prompt attempts" ON public.prompt_attempts;

-- supabase/migrations/003_create_prompt_attempts.sql statement 11
CREATE POLICY "Authenticated users can insert prompt attempts" ON public.prompt_attempts AS PERMISSIVE FOR insert TO authenticated WITH CHECK (public.is_instructor() OR learner_id IN (SELECT id FROM public.learners WHERE user_id = public.current_user_id()));

-- supabase/migrations/003_create_prompt_attempts.sql statement 12
DROP POLICY IF EXISTS "Instructors can delete prompt attempts" ON public.prompt_attempts;

-- supabase/migrations/003_create_prompt_attempts.sql statement 13
CREATE POLICY "Instructors can delete prompt attempts" ON public.prompt_attempts AS PERMISSIVE FOR delete TO authenticated USING (public.is_instructor());

-- supabase/migrations/004_course_content_management.sql statement 1
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS slug text, ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'draft', ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1, ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- supabase/migrations/004_course_content_management.sql statement 3
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'courses_publication_status_check'
      AND conrelid = 'public.courses'::regclass
  ) THEN
    ALTER TABLE public.courses
      ADD CONSTRAINT courses_publication_status_check
      CHECK (publication_status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

-- supabase/migrations/004_course_content_management.sql statement 4
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_slug_unique ON public.courses (slug) WHERE slug IS NOT NULL;

-- supabase/migrations/004_course_content_management.sql statement 5
DROP POLICY IF EXISTS "Courses read active or instructor read all" ON public.courses;

-- supabase/migrations/004_course_content_management.sql statement 6
CREATE POLICY "Courses read active or instructor read all" ON public.courses AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR (status = 'active' AND publication_status = 'published'));

-- supabase/migrations/004_course_content_management.sql statement 7
CREATE TABLE IF NOT EXISTS public.course_modules (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE, title text NOT NULL, description text, position integer NOT NULL DEFAULT 1 CHECK (position > 0), status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT unique_module_position_per_course UNIQUE (course_id, position));

-- supabase/migrations/004_course_content_management.sql statement 8
CREATE INDEX IF NOT EXISTS idx_course_modules_course ON public.course_modules (course_id, position);

-- supabase/migrations/004_course_content_management.sql statement 9
CREATE TABLE IF NOT EXISTS public.lessons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), module_id uuid NOT NULL REFERENCES public.course_modules (id) ON DELETE CASCADE, lesson_key text NOT NULL, title text NOT NULL, badge text, focus_skill text, scenario text, task_goal text, concept_title text, concept_content text, system_instruction text, starter_prompt text, baseline_prompt text, improved_prompt text, sample_input_context text, prompt_placeholder text, expected_output_format text, hints jsonb NOT NULL DEFAULT CAST('[]' AS jsonb), focus_components jsonb NOT NULL DEFAULT CAST('[]' AS jsonb), position integer NOT NULL DEFAULT 1 CHECK (position > 0), status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT unique_lesson_key_per_module UNIQUE (module_id, lesson_key), CONSTRAINT unique_lesson_position_per_module UNIQUE (module_id, position), CONSTRAINT lessons_hints_is_array CHECK (jsonb_typeof(hints) = 'array'), CONSTRAINT lessons_focus_components_is_array CHECK (jsonb_typeof(focus_components) = 'array'));

-- supabase/migrations/004_course_content_management.sql statement 10
CREATE INDEX IF NOT EXISTS idx_lessons_module ON public.lessons (module_id, position);

-- supabase/migrations/004_course_content_management.sql statement 11
CREATE TABLE IF NOT EXISTS public.lesson_rubric_criteria (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lesson_id uuid NOT NULL REFERENCES public.lessons (id) ON DELETE CASCADE, criterion_key text NOT NULL, label text NOT NULL, description text NOT NULL, max_score numeric(5, 2) NOT NULL DEFAULT 2 CHECK (max_score > 0), position integer NOT NULL DEFAULT 1 CHECK (position > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT unique_rubric_key_per_lesson UNIQUE (lesson_id, criterion_key), CONSTRAINT unique_rubric_position_per_lesson UNIQUE (lesson_id, position));

-- supabase/migrations/004_course_content_management.sql statement 12
CREATE INDEX IF NOT EXISTS idx_lesson_rubrics_lesson ON public.lesson_rubric_criteria (lesson_id, position);

-- supabase/migrations/004_course_content_management.sql statement 13
CREATE TABLE IF NOT EXISTS public.lesson_resources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lesson_id uuid NOT NULL REFERENCES public.lessons (id) ON DELETE CASCADE, resource_type text NOT NULL DEFAULT 'text' CHECK (resource_type IN ('text', 'data', 'url', 'file', 'reference')), title text NOT NULL, content text, url text, position integer NOT NULL DEFAULT 1 CHECK (position > 0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT unique_resource_position_per_lesson UNIQUE (lesson_id, position));

-- supabase/migrations/004_course_content_management.sql statement 14
CREATE INDEX IF NOT EXISTS idx_lesson_resources_lesson ON public.lesson_resources (lesson_id, position);

-- supabase/migrations/004_course_content_management.sql statement 15
CREATE TABLE IF NOT EXISTS public.course_instructors (course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE, permission text NOT NULL DEFAULT 'editor' CHECK (permission IN ('owner', 'editor', 'viewer')), assigned_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (course_id, user_id));

-- supabase/migrations/004_course_content_management.sql statement 16
CREATE INDEX IF NOT EXISTS idx_course_instructors_user ON public.course_instructors (user_id);

-- supabase/migrations/004_course_content_management.sql statement 17
ALTER TABLE public.prompt_attempts ADD COLUMN IF NOT EXISTS lesson_ref_id uuid REFERENCES public.lessons (id) ON DELETE SET NULL;

-- supabase/migrations/004_course_content_management.sql statement 18
CREATE INDEX IF NOT EXISTS idx_prompt_attempts_lesson_ref ON public.prompt_attempts (lesson_ref_id);

-- supabase/migrations/004_course_content_management.sql statement 19
DROP TRIGGER IF EXISTS set_timestamp_course_modules ON public.course_modules;

-- supabase/migrations/004_course_content_management.sql statement 20
CREATE TRIGGER set_timestamp_course_modules BEFORE UPDATE ON public.course_modules FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- supabase/migrations/004_course_content_management.sql statement 21
DROP TRIGGER IF EXISTS set_timestamp_lessons ON public.lessons;

-- supabase/migrations/004_course_content_management.sql statement 22
CREATE TRIGGER set_timestamp_lessons BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- supabase/migrations/004_course_content_management.sql statement 23
DROP TRIGGER IF EXISTS set_timestamp_lesson_rubrics ON public.lesson_rubric_criteria;

-- supabase/migrations/004_course_content_management.sql statement 24
CREATE TRIGGER set_timestamp_lesson_rubrics BEFORE UPDATE ON public.lesson_rubric_criteria FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- supabase/migrations/004_course_content_management.sql statement 25
DROP TRIGGER IF EXISTS set_timestamp_lesson_resources ON public.lesson_resources;

-- supabase/migrations/004_course_content_management.sql statement 26
CREATE TRIGGER set_timestamp_lesson_resources BEFORE UPDATE ON public.lesson_resources FOR EACH ROW EXECUTE PROCEDURE public.trigger_set_timestamp();

-- supabase/migrations/004_course_content_management.sql statement 27
REVOKE ALL PRIVILEGES ON TABLE public.course_modules, public.lessons, public.lesson_rubric_criteria, public.lesson_resources, public.course_instructors FROM anon;

-- supabase/migrations/004_course_content_management.sql statement 28
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.course_modules, public.lessons, public.lesson_rubric_criteria, public.lesson_resources, public.course_instructors TO authenticated;

-- supabase/migrations/004_course_content_management.sql statement 29
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/004_course_content_management.sql statement 30
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/004_course_content_management.sql statement 31
ALTER TABLE public.lesson_rubric_criteria ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/004_course_content_management.sql statement 32
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/004_course_content_management.sql statement 33
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/004_course_content_management.sql statement 34
DROP POLICY IF EXISTS "Published modules readable by authenticated" ON public.course_modules;

-- supabase/migrations/004_course_content_management.sql statement 35
CREATE POLICY "Published modules readable by authenticated" ON public.course_modules AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR (status = 'published' AND EXISTS (SELECT 1 FROM public.courses AS c WHERE c.id = course_modules.course_id AND c.status = 'active' AND c.publication_status = 'published')));

-- supabase/migrations/004_course_content_management.sql statement 36
DROP POLICY IF EXISTS "Modules managed by instructors" ON public.course_modules;

-- supabase/migrations/004_course_content_management.sql statement 37
CREATE POLICY "Modules managed by instructors" ON public.course_modules AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/migrations/004_course_content_management.sql statement 38
DROP POLICY IF EXISTS "Published lessons readable by authenticated" ON public.lessons;

-- supabase/migrations/004_course_content_management.sql statement 39
CREATE POLICY "Published lessons readable by authenticated" ON public.lessons AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR (status = 'published' AND EXISTS (SELECT 1 FROM public.course_modules AS m INNER JOIN public.courses AS c ON c.id = m.course_id WHERE m.id = lessons.module_id AND m.status = 'published' AND c.status = 'active' AND c.publication_status = 'published')));

-- supabase/migrations/004_course_content_management.sql statement 40
DROP POLICY IF EXISTS "Lessons managed by instructors" ON public.lessons;

-- supabase/migrations/004_course_content_management.sql statement 41
CREATE POLICY "Lessons managed by instructors" ON public.lessons AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/migrations/004_course_content_management.sql statement 42
DROP POLICY IF EXISTS "Rubrics readable with lesson" ON public.lesson_rubric_criteria;

-- supabase/migrations/004_course_content_management.sql statement 43
CREATE POLICY "Rubrics readable with lesson" ON public.lesson_rubric_criteria AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR EXISTS (SELECT 1 FROM public.lessons AS l INNER JOIN public.course_modules AS m ON m.id = l.module_id INNER JOIN public.courses AS c ON c.id = m.course_id WHERE l.id = lesson_rubric_criteria.lesson_id AND l.status = 'published' AND m.status = 'published' AND c.status = 'active' AND c.publication_status = 'published'));

-- supabase/migrations/004_course_content_management.sql statement 44
DROP POLICY IF EXISTS "Rubrics managed by instructors" ON public.lesson_rubric_criteria;

-- supabase/migrations/004_course_content_management.sql statement 45
CREATE POLICY "Rubrics managed by instructors" ON public.lesson_rubric_criteria AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/migrations/004_course_content_management.sql statement 46
DROP POLICY IF EXISTS "Resources readable with lesson" ON public.lesson_resources;

-- supabase/migrations/004_course_content_management.sql statement 47
CREATE POLICY "Resources readable with lesson" ON public.lesson_resources AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR EXISTS (SELECT 1 FROM public.lessons AS l INNER JOIN public.course_modules AS m ON m.id = l.module_id INNER JOIN public.courses AS c ON c.id = m.course_id WHERE l.id = lesson_resources.lesson_id AND l.status = 'published' AND m.status = 'published' AND c.status = 'active' AND c.publication_status = 'published'));

-- supabase/migrations/004_course_content_management.sql statement 48
DROP POLICY IF EXISTS "Resources managed by instructors" ON public.lesson_resources;

-- supabase/migrations/004_course_content_management.sql statement 49
CREATE POLICY "Resources managed by instructors" ON public.lesson_resources AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/migrations/004_course_content_management.sql statement 50
DROP POLICY IF EXISTS "Course assignments readable by instructors" ON public.course_instructors;

-- supabase/migrations/004_course_content_management.sql statement 51
CREATE POLICY "Course assignments readable by instructors" ON public.course_instructors AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor());

-- supabase/migrations/004_course_content_management.sql statement 52
DROP POLICY IF EXISTS "Course assignments managed by instructors" ON public.course_instructors;

-- supabase/migrations/004_course_content_management.sql statement 53
CREATE POLICY "Course assignments managed by instructors" ON public.course_instructors AS PERMISSIVE FOR all TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 1
CREATE OR REPLACE FUNCTION public.has_active_class_enrollment(target_class_id uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.learners l ON l.id = e.learner_id
    JOIN public.classes c ON c.id = e.class_id
    WHERE e.class_id = target_class_id
      AND l.user_id = public.current_user_id()
      AND e.status = 'active'
      AND c.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public', 'pg_temp';

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 2
CREATE OR REPLACE FUNCTION public.has_active_course_enrollment(target_course_id uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.learners l ON l.id = e.learner_id
    JOIN public.classes c ON c.id = e.class_id
    JOIN public.courses co ON co.id = c.course_id
    WHERE c.course_id = target_course_id
      AND l.user_id = public.current_user_id()
      AND e.status = 'active'
      AND c.status = 'active'
      AND co.status = 'active'
      AND co.publication_status = 'published'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public', 'pg_temp';

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 3
CREATE OR REPLACE FUNCTION public.lesson_belongs_to_class(target_lesson_id uuid, target_class_id uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.classes c ON c.course_id = m.course_id
    WHERE l.id = target_lesson_id
      AND c.id = target_class_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path TO 'public', 'pg_temp';

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 4
REVOKE ALL PRIVILEGES ON FUNCTION public.has_active_class_enrollment (uuid) FROM PUBLIC, anon;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 5
REVOKE ALL PRIVILEGES ON FUNCTION public.has_active_course_enrollment (uuid) FROM PUBLIC, anon;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 6
REVOKE ALL PRIVILEGES ON FUNCTION public.lesson_belongs_to_class (uuid, uuid) FROM PUBLIC, anon;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 7
GRANT EXECUTE ON FUNCTION public.has_active_class_enrollment (uuid) TO authenticated;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 8
GRANT EXECUTE ON FUNCTION public.has_active_course_enrollment (uuid) TO authenticated;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 9
GRANT EXECUTE ON FUNCTION public.lesson_belongs_to_class (uuid, uuid) TO authenticated;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 10
DROP POLICY IF EXISTS "Courses read active or instructor read all" ON public.courses;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 11
CREATE POLICY "Courses read active or instructor read all" ON public.courses AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR (status = 'active' AND publication_status = 'published' AND public.has_active_course_enrollment(id)));

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 12
DROP POLICY IF EXISTS "Classes read active or enrolled or instructor" ON public.classes;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 13
CREATE POLICY "Classes read active or enrolled or instructor" ON public.classes AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR public.has_active_class_enrollment(id));

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 14
DROP POLICY IF EXISTS "Published modules readable by authenticated" ON public.course_modules;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 15
CREATE POLICY "Published modules readable by authenticated" ON public.course_modules AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR (status = 'published' AND public.has_active_course_enrollment(course_id)));

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 16
DROP POLICY IF EXISTS "Published lessons readable by authenticated" ON public.lessons;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 17
CREATE POLICY "Published lessons readable by authenticated" ON public.lessons AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR (status = 'published' AND EXISTS (SELECT 1 FROM public.course_modules AS m WHERE m.id = lessons.module_id AND m.status = 'published' AND public.has_active_course_enrollment(m.course_id))));

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 18
DROP POLICY IF EXISTS "Rubrics readable with lesson" ON public.lesson_rubric_criteria;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 19
CREATE POLICY "Rubrics readable with lesson" ON public.lesson_rubric_criteria AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR EXISTS (SELECT 1 FROM public.lessons AS l INNER JOIN public.course_modules AS m ON m.id = l.module_id WHERE l.id = lesson_rubric_criteria.lesson_id AND l.status = 'published' AND m.status = 'published' AND public.has_active_course_enrollment(m.course_id)));

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 20
DROP POLICY IF EXISTS "Resources readable with lesson" ON public.lesson_resources;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 21
CREATE POLICY "Resources readable with lesson" ON public.lesson_resources AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR EXISTS (SELECT 1 FROM public.lessons AS l INNER JOIN public.course_modules AS m ON m.id = l.module_id WHERE l.id = lesson_resources.lesson_id AND l.status = 'published' AND m.status = 'published' AND public.has_active_course_enrollment(m.course_id)));

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 22
DROP POLICY IF EXISTS "Authenticated users can insert prompt attempts" ON public.prompt_attempts;

-- supabase/migrations/006_enforce_course_enrollment_access.sql statement 23
CREATE POLICY "Authenticated users can insert prompt attempts" ON public.prompt_attempts AS PERMISSIVE FOR insert TO authenticated WITH CHECK (public.is_instructor() OR (learner_id IN (SELECT id FROM public.learners WHERE user_id = public.current_user_id()) AND public.has_active_class_enrollment(class_id) AND (lesson_ref_id IS NULL OR public.lesson_belongs_to_class(lesson_ref_id, class_id))));

-- supabase/migrations/007_user_tutorial_progress.sql statement 1
CREATE TABLE IF NOT EXISTS public.user_tutorial_progress (user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE, tutorial_key text NOT NULL CHECK (tutorial_key ~ '^[a-z0-9_]+$'), completed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, tutorial_key));

-- supabase/migrations/007_user_tutorial_progress.sql statement 2
REVOKE ALL PRIVILEGES ON TABLE public.user_tutorial_progress FROM anon;

-- supabase/migrations/007_user_tutorial_progress.sql statement 3
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_tutorial_progress TO authenticated;

-- supabase/migrations/007_user_tutorial_progress.sql statement 4
ALTER TABLE public.user_tutorial_progress ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/007_user_tutorial_progress.sql statement 5
DROP POLICY IF EXISTS "Users read own tutorial progress" ON public.user_tutorial_progress;

-- supabase/migrations/007_user_tutorial_progress.sql statement 6
CREATE POLICY "Users read own tutorial progress" ON public.user_tutorial_progress AS PERMISSIVE FOR select TO authenticated USING (user_id = public.current_user_id());

-- supabase/migrations/007_user_tutorial_progress.sql statement 7
DROP POLICY IF EXISTS "Users insert own tutorial progress" ON public.user_tutorial_progress;

-- supabase/migrations/007_user_tutorial_progress.sql statement 8
CREATE POLICY "Users insert own tutorial progress" ON public.user_tutorial_progress AS PERMISSIVE FOR insert TO authenticated WITH CHECK (user_id = public.current_user_id());

-- supabase/migrations/007_user_tutorial_progress.sql statement 9
DROP POLICY IF EXISTS "Users update own tutorial progress" ON public.user_tutorial_progress;

-- supabase/migrations/007_user_tutorial_progress.sql statement 10
CREATE POLICY "Users update own tutorial progress" ON public.user_tutorial_progress AS PERMISSIVE FOR update TO authenticated USING (user_id = public.current_user_id()) WITH CHECK (user_id = public.current_user_id());

-- supabase/migrations/010_allow_update_prompt_attempts.sql statement 1
DROP POLICY IF EXISTS "Learners and instructors can update prompt attempts" ON public.prompt_attempts;

-- supabase/migrations/010_allow_update_prompt_attempts.sql statement 2
CREATE POLICY "Learners and instructors can update prompt attempts" ON public.prompt_attempts AS PERMISSIVE FOR update TO authenticated USING (public.is_instructor() OR (learner_id IN (SELECT id FROM public.learners WHERE user_id = public.current_user_id()) AND public.has_active_class_enrollment(class_id))) WITH CHECK (public.is_instructor() OR (learner_id IN (SELECT id FROM public.learners WHERE user_id = public.current_user_id()) AND public.has_active_class_enrollment(class_id)));

-- supabase/migrations/012_public_testing_class_self_enrollment.sql statement 2
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS enrollment_mode text NOT NULL DEFAULT 'instructor' CHECK (enrollment_mode IN ('instructor', 'self_enroll'));

-- supabase/migrations/012_public_testing_class_self_enrollment.sql statement 4
CREATE OR REPLACE FUNCTION public.self_enroll_public_class(target_class_id uuid) RETURNS TABLE (enrollment_id uuid, learner_id uuid, learner_code text, class_id uuid, enrollment_status text) AS $$
DECLARE
  resolved_user_id UUID;
  resolved_learner_id UUID;
  resolved_learner_code TEXT;
  resolved_enrollment_id UUID;
  resolved_status TEXT;
BEGIN
  resolved_user_id := public.current_user_id();
  IF resolved_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated Promptify user profile is required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = resolved_user_id AND u.role = 'learner'
  ) THEN
    RAISE EXCEPTION 'Only learner accounts can self-enroll.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.courses co ON co.id = c.course_id
    WHERE c.id = target_class_id
      AND c.enrollment_mode = 'self_enroll'
      AND c.status = 'active'
      AND c.start_date <= now()
      AND c.end_date >= now()
      AND co.status = 'active'
      AND co.publication_status = 'published'
  ) THEN
    RAISE EXCEPTION 'Class is not available for public self-enrollment.';
  END IF;

  INSERT INTO public.learners (user_id)
  VALUES (resolved_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT l.id, l.learner_code
  INTO resolved_learner_id, resolved_learner_code
  FROM public.learners l
  WHERE l.user_id = resolved_user_id;

  INSERT INTO public.enrollments (learner_id, class_id, status, joined_at, updated_at)
  VALUES (resolved_learner_id, target_class_id, 'active', now(), now())
  ON CONFLICT ON CONSTRAINT unique_learner_class DO UPDATE
  SET status = 'active', joined_at = now(), updated_at = now()
  RETURNING id, status INTO resolved_enrollment_id, resolved_status;

  RETURN QUERY SELECT
    resolved_enrollment_id,
    resolved_learner_id,
    resolved_learner_code,
    target_class_id,
    resolved_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- supabase/migrations/012_public_testing_class_self_enrollment.sql statement 5
REVOKE ALL PRIVILEGES ON FUNCTION public.self_enroll_public_class (uuid) FROM PUBLIC, anon;

-- supabase/migrations/012_public_testing_class_self_enrollment.sql statement 6
GRANT EXECUTE ON FUNCTION public.self_enroll_public_class (uuid) TO authenticated;

-- supabase/migrations/012_public_testing_class_self_enrollment.sql statement 7
DROP POLICY IF EXISTS "Classes read active or enrolled or instructor" ON public.classes;

-- supabase/migrations/012_public_testing_class_self_enrollment.sql statement 8
CREATE POLICY "Classes read active or enrolled or instructor" ON public.classes AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR public.has_active_class_enrollment(id) OR (enrollment_mode = 'self_enroll' AND status = 'active' AND start_date <= now() AND end_date >= now()));

-- supabase/migrations/012_public_testing_class_self_enrollment.sql statement 9
DROP POLICY IF EXISTS "Courses read active or instructor read all" ON public.courses;

-- supabase/migrations/012_public_testing_class_self_enrollment.sql statement 10
CREATE POLICY "Courses read active or instructor read all" ON public.courses AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR (status = 'active' AND publication_status = 'published' AND (public.has_active_course_enrollment(id) OR EXISTS (SELECT 1 FROM public.classes AS c WHERE c.course_id = courses.id AND c.enrollment_mode = 'self_enroll' AND c.status = 'active' AND c.start_date <= now() AND c.end_date >= now()))));

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 2
CREATE TABLE IF NOT EXISTS public.lesson_progress (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), learner_id uuid NOT NULL REFERENCES public.learners (id) ON DELETE CASCADE, class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE, lesson_id uuid NOT NULL REFERENCES public.lessons (id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')), attempts_count integer NOT NULL DEFAULT 0 CHECK (attempts_count >= 0), best_score numeric CHECK (best_score IS NULL OR (best_score >= 0 AND best_score <= 10)), last_attempt_id uuid REFERENCES public.prompt_attempts (id) ON DELETE SET NULL, started_at timestamptz, completed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT lesson_progress_learner_class_lesson_key UNIQUE (learner_id, class_id, lesson_id));

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 3
GRANT SELECT ON TABLE public.lesson_progress TO service_role;

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 4
CREATE INDEX IF NOT EXISTS idx_lesson_progress_learner_class ON public.lesson_progress (learner_id, class_id);

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 5
CREATE INDEX IF NOT EXISTS idx_lesson_progress_class_lesson ON public.lesson_progress (class_id, lesson_id);

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 6
CREATE OR REPLACE FUNCTION public.valid_evaluation_total(payload jsonb) RETURNS numeric AS $$
DECLARE
  score_keys CONSTANT TEXT[] := ARRAY[
    'taskCompletion',
    'groundedness',
    'formatAdherence',
    'constraintCompliance',
    'businessUsability'
  ];
  score_key TEXT;
  score_value NUMERIC;
  score_total NUMERIC := 0;
  declared_total NUMERIC;
BEGIN
  IF payload IS NULL
     OR jsonb_typeof(payload) <> 'object'
     OR jsonb_typeof(payload -> 'scores') <> 'object'
     OR jsonb_typeof(payload -> 'total') <> 'number' THEN
    RETURN NULL;
  END IF;

  declared_total := (payload ->> 'total')::NUMERIC;
  IF declared_total <> trunc(declared_total) OR declared_total < 0 OR declared_total > 10 THEN
    RETURN NULL;
  END IF;

  FOREACH score_key IN ARRAY score_keys LOOP
    IF jsonb_typeof(payload -> 'scores' -> score_key) <> 'number' THEN
      RETURN NULL;
    END IF;
    score_value := (payload -> 'scores' ->> score_key)::NUMERIC;
    IF score_value <> trunc(score_value) OR score_value < 0 OR score_value > 2 THEN
      RETURN NULL;
    END IF;
    score_total := score_total + score_value;
  END LOOP;

  IF declared_total <> score_total THEN
    RETURN NULL;
  END IF;

  RETURN declared_total;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public', 'pg_temp';

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 7
REVOKE ALL PRIVILEGES ON FUNCTION public.valid_evaluation_total (jsonb) FROM PUBLIC, anon, authenticated;

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 8
CREATE OR REPLACE FUNCTION public.sync_lesson_progress_from_prompt_attempt() RETURNS trigger AS $$
DECLARE
  canonical_lesson_id UUID;
  candidate_count INTEGER;
  valid_score NUMERIC;
  event_time TIMESTAMPTZ;
BEGIN
  SELECT
    count(DISTINCT l.id),
    (array_agg(DISTINCT l.id ORDER BY l.id))[1]
  INTO candidate_count, canonical_lesson_id
  FROM public.classes c
  JOIN public.course_modules m ON m.course_id = c.course_id
  JOIN public.lessons l ON l.module_id = m.id
  WHERE c.id = NEW.class_id
    AND (
      (NEW.lesson_ref_id IS NOT NULL AND l.id = NEW.lesson_ref_id)
      OR (
        NEW.lesson_ref_id IS NULL
        AND NEW.lesson_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND l.id = CASE
          WHEN NEW.lesson_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN NEW.lesson_id::UUID ELSE NULL END
      )
      OR (NEW.lesson_ref_id IS NULL AND l.lesson_key = NEW.lesson_id)
    );

  IF candidate_count <> 1 OR canonical_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Prompt attempt cannot be mapped to exactly one lesson in its class course.';
  END IF;

  valid_score := public.valid_evaluation_total(NEW.evaluation_json);

  IF TG_OP = 'INSERT' THEN
    event_time := coalesce(NEW.created_at, now());
    INSERT INTO public.lesson_progress (
      learner_id, class_id, lesson_id, status, attempts_count, best_score,
      last_attempt_id, started_at, completed_at, updated_at
    ) VALUES (
      NEW.learner_id, NEW.class_id, canonical_lesson_id, 'completed', 1, valid_score,
      NEW.id, event_time, event_time, event_time
    )
    ON CONFLICT (learner_id, class_id, lesson_id) DO UPDATE SET
      status = 'completed',
      attempts_count = public.lesson_progress.attempts_count + 1,
      best_score = CASE
        WHEN valid_score IS NULL THEN public.lesson_progress.best_score
        WHEN public.lesson_progress.best_score IS NULL THEN valid_score
        ELSE greatest(public.lesson_progress.best_score, valid_score)
      END,
      last_attempt_id = NEW.id,
      started_at = coalesce(public.lesson_progress.started_at, event_time),
      completed_at = coalesce(public.lesson_progress.completed_at, event_time),
      updated_at = event_time;
  ELSIF TG_OP = 'UPDATE' AND NEW.evaluation_json IS DISTINCT FROM OLD.evaluation_json THEN
    UPDATE public.lesson_progress lp
    SET best_score = CASE
          WHEN valid_score IS NULL THEN lp.best_score
          WHEN lp.best_score IS NULL THEN valid_score
          ELSE greatest(lp.best_score, valid_score)
        END,
        updated_at = now()
    WHERE lp.learner_id = NEW.learner_id
      AND lp.class_id = NEW.class_id
      AND lp.lesson_id = canonical_lesson_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Canonical lesson progress is missing for updated prompt attempt.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 9
REVOKE ALL PRIVILEGES ON FUNCTION public.sync_lesson_progress_from_prompt_attempt () FROM PUBLIC, anon, authenticated;

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 10
DROP TRIGGER IF EXISTS trg_sync_prompt_attempt_progress_insert ON public.prompt_attempts;

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 11
CREATE TRIGGER trg_sync_prompt_attempt_progress_insert AFTER INSERT ON public.prompt_attempts FOR EACH ROW EXECUTE PROCEDURE public.sync_lesson_progress_from_prompt_attempt();

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 12
DROP TRIGGER IF EXISTS trg_sync_prompt_attempt_progress_evaluation ON public.prompt_attempts;

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 13
CREATE TRIGGER trg_sync_prompt_attempt_progress_evaluation AFTER UPDATE OF evaluation_json ON public.prompt_attempts FOR EACH ROW WHEN (new.evaluation_json IS DISTINCT FROM old.evaluation_json) EXECUTE PROCEDURE public.sync_lesson_progress_from_prompt_attempt();

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 16
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 17
REVOKE ALL PRIVILEGES ON TABLE public.lesson_progress FROM PUBLIC, anon;

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 18
GRANT SELECT ON TABLE public.lesson_progress TO authenticated;

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 19
DROP POLICY IF EXISTS "Learners read own lesson progress" ON public.lesson_progress;

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 20
CREATE POLICY "Learners read own lesson progress" ON public.lesson_progress AS PERMISSIVE FOR select TO authenticated USING (public.is_instructor() OR (learner_id IN (SELECT l.id FROM public.learners AS l WHERE l.user_id = public.current_user_id()) AND public.has_active_class_enrollment(class_id)));

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 21
CREATE OR REPLACE FUNCTION public.record_prompt_attempt_and_progress(p_class_id uuid, p_lesson_id uuid, p_prompt_text text, p_ai_output text, p_evaluation_json jsonb = NULL, p_model text = 'unknown', p_latency_ms integer = 0) RETURNS jsonb AS $$
DECLARE
  resolved_user_id UUID;
  resolved_learner_id UUID;
  next_attempt_number INTEGER;
  inserted_attempt public.prompt_attempts%ROWTYPE;
  upserted_progress public.lesson_progress%ROWTYPE;
  event_time TIMESTAMPTZ := now();
BEGIN
  resolved_user_id := public.current_user_id();
  IF resolved_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated Promptify user profile is required.';
  END IF;

  SELECT l.id INTO resolved_learner_id
  FROM public.learners l
  WHERE l.user_id = resolved_user_id;
  IF resolved_learner_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated learner profile is required.';
  END IF;

  IF NOT public.has_active_class_enrollment(p_class_id) THEN
    RAISE EXCEPTION 'Active enrollment is required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.courses co ON co.id = c.course_id
    JOIN public.course_modules m ON m.course_id = co.id
    JOIN public.lessons l ON l.module_id = m.id
    WHERE c.id = p_class_id
      AND l.id = p_lesson_id
      AND c.status = 'active'
      AND co.status = 'active'
      AND co.publication_status = 'published'
      AND m.status = 'published'
      AND l.status = 'published'
  ) THEN
    RAISE EXCEPTION 'Lesson does not belong to the active enrolled class.';
  END IF;

  IF nullif(btrim(p_prompt_text), '') IS NULL OR nullif(btrim(p_ai_output), '') IS NULL THEN
    RAISE EXCEPTION 'Prompt text and AI output are required.';
  END IF;

  -- Serialize attempts for this learner/class/lesson before calculating number.
  PERFORM pg_advisory_xact_lock(
    hashtext(resolved_learner_id::TEXT || ':' || p_class_id::TEXT || ':' || p_lesson_id::TEXT)
  );
  SELECT coalesce(max(pa.attempt_number), 0) + 1
  INTO next_attempt_number
  FROM public.prompt_attempts pa
  WHERE pa.learner_id = resolved_learner_id
    AND pa.class_id = p_class_id
    AND (pa.lesson_ref_id = p_lesson_id OR pa.lesson_id = p_lesson_id::TEXT);

  INSERT INTO public.prompt_attempts (
    learner_id, class_id, lesson_id, lesson_ref_id, attempt_number,
    prompt_text, ai_output, evaluation_json, model, latency_ms, created_at
  ) VALUES (
    resolved_learner_id, p_class_id, p_lesson_id::TEXT, p_lesson_id,
    next_attempt_number, p_prompt_text, p_ai_output, p_evaluation_json,
    coalesce(nullif(btrim(p_model), ''), 'unknown'), greatest(coalesce(p_latency_ms, 0), 0), event_time
  ) RETURNING * INTO inserted_attempt;

  -- The INSERT trigger is the only writer of lesson_progress. Select the row it
  -- synchronized so the client still receives attempt + progress atomically.
  SELECT * INTO upserted_progress
  FROM public.lesson_progress lp
  WHERE lp.learner_id = resolved_learner_id
    AND lp.class_id = p_class_id
    AND lp.lesson_id = p_lesson_id;

  IF upserted_progress.id IS NULL THEN
    RAISE EXCEPTION 'Prompt attempt trigger did not synchronize lesson progress.';
  END IF;

  RETURN jsonb_build_object(
    'attempt', to_jsonb(inserted_attempt),
    'progress', to_jsonb(upserted_progress)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 22
CREATE OR REPLACE FUNCTION public.update_prompt_attempt_evaluation_and_progress(p_attempt_id uuid, p_evaluation_json jsonb) RETURNS jsonb AS $$
DECLARE
  resolved_user_id UUID;
  resolved_learner_id UUID;
  target_attempt public.prompt_attempts%ROWTYPE;
  updated_progress public.lesson_progress%ROWTYPE;
BEGIN
  resolved_user_id := public.current_user_id();
  SELECT l.id INTO resolved_learner_id
  FROM public.learners l
  WHERE l.user_id = resolved_user_id;
  IF resolved_learner_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated learner profile is required.';
  END IF;

  SELECT * INTO target_attempt
  FROM public.prompt_attempts pa
  WHERE pa.id = p_attempt_id
    AND pa.learner_id = resolved_learner_id
    AND pa.lesson_ref_id IS NOT NULL
  FOR UPDATE;
  IF target_attempt.id IS NULL THEN
    RAISE EXCEPTION 'Owned canonical prompt attempt was not found.';
  END IF;

  IF NOT public.has_active_class_enrollment(target_attempt.class_id)
     OR NOT public.lesson_belongs_to_class(target_attempt.lesson_ref_id, target_attempt.class_id) THEN
    RAISE EXCEPTION 'Active lesson access is required.';
  END IF;

  UPDATE public.prompt_attempts
  SET evaluation_json = p_evaluation_json
  WHERE id = target_attempt.id
  RETURNING * INTO target_attempt;

  -- The UPDATE trigger is the only writer of best_score.
  SELECT * INTO updated_progress
  FROM public.lesson_progress lp
  WHERE lp.learner_id = resolved_learner_id
    AND lp.class_id = target_attempt.class_id
    AND lp.lesson_id = target_attempt.lesson_ref_id;

  IF updated_progress.id IS NULL THEN
    RAISE EXCEPTION 'Prompt attempt trigger did not synchronize lesson progress.';
  END IF;

  RETURN jsonb_build_object(
    'attempt', to_jsonb(target_attempt),
    'progress', to_jsonb(updated_progress)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 23
REVOKE ALL PRIVILEGES ON FUNCTION public.record_prompt_attempt_and_progress (uuid, uuid, text, text, jsonb, text, integer) FROM PUBLIC, anon;

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 24
REVOKE ALL PRIVILEGES ON FUNCTION public.update_prompt_attempt_evaluation_and_progress (uuid, jsonb) FROM PUBLIC, anon;

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 25
GRANT EXECUTE ON FUNCTION public.record_prompt_attempt_and_progress (uuid, uuid, text, text, jsonb, text, integer) TO authenticated;

-- supabase/migrations/016_add_server_backed_lesson_progress.sql statement 26
GRANT EXECUTE ON FUNCTION public.update_prompt_attempt_evaluation_and_progress (uuid, jsonb) TO authenticated;

-- supabase/migrations/017_enforce_atomic_progress_writes.sql statement 2
REVOKE INSERT, UPDATE ON TABLE public.prompt_attempts FROM authenticated;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 2
CREATE TABLE public.rebuild_runs (subject uuid NOT NULL, request_id uuid NOT NULL, class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons, prompt text NOT NULL, snapshot jsonb NOT NULL, attempt_id uuid REFERENCES public.prompt_attempts, result jsonb, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (subject, request_id));

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 3
ALTER TABLE public.rebuild_runs ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 4
REVOKE ALL PRIVILEGES ON TABLE public.rebuild_runs FROM anon, authenticated;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 5
GRANT ALL PRIVILEGES ON TABLE public.rebuild_runs TO service_role;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 6
CREATE FUNCTION public.rebuild_begin_run(p_subject uuid, p_class uuid, p_lesson uuid, p_request uuid, p_prompt text, p_snapshot jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE r public.rebuild_runs; inserted integer;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',p_subject::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_subject,'role','authenticated')::text,true);
 IF NOT public.has_active_class_enrollment(p_class) OR NOT EXISTS (
 SELECT 1 FROM classes c JOIN courses co ON co.id=c.course_id JOIN course_modules m ON m.course_id=co.id JOIN lessons l ON l.module_id=m.id
 WHERE c.id=p_class AND l.id=p_lesson AND c.status='active' AND co.status='active' AND co.publication_status='published' AND m.status='published' AND l.status='published') THEN RAISE EXCEPTION 'Access denied'; END IF;
 INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot) VALUES(p_subject,p_request,p_class,p_lesson,p_prompt,p_snapshot) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted = ROW_COUNT;
 SELECT * INTO r FROM rebuild_runs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;
 IF r.prompt<>p_prompt OR r.class_id<>p_class OR r.lesson_id<>p_lesson THEN RAISE EXCEPTION 'Request key conflict'; END IF;
 -- A processing request cannot be replayed into a second provider call.
 IF inserted=0 AND r.result IS NULL THEN RAISE EXCEPTION 'Request processing or uncertain; inspect before retry'; END IF;
 RETURN jsonb_build_object('result',r.result);
END $$;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 7
CREATE FUNCTION public.rebuild_finish_run(p_subject uuid, p_request uuid, p_result jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE r public.rebuild_runs; saved jsonb;
BEGIN
 SELECT * INTO STRICT r FROM rebuild_runs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;
 IF r.result IS NOT NULL THEN RETURN r.result->'saved'; END IF;
 PERFORM set_config('request.jwt.claim.sub',p_subject::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_subject,'role','authenticated')::text,true);
 saved:=public.record_prompt_attempt_and_progress(r.class_id,r.lesson_id,r.prompt,p_result->>'output',NULL,p_result->>'model',(p_result->>'latencyMs')::integer);
 UPDATE rebuild_runs SET attempt_id=(saved->'attempt'->>'id')::uuid,result=p_result||jsonb_build_object('saved',saved) WHERE subject=p_subject AND request_id=p_request;
 RETURN saved;
END $$;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 8
CREATE FUNCTION public.rebuild_save_evaluation(p_subject uuid, p_attempt uuid, p_evaluation jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 PERFORM set_config('request.jwt.claim.sub',p_subject::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_subject,'role','authenticated')::text,true);
 RETURN public.update_prompt_attempt_evaluation_and_progress(p_attempt,p_evaluation);
END $$;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 9
REVOKE ALL PRIVILEGES ON FUNCTION public.rebuild_begin_run (uuid, uuid, uuid, uuid, text, jsonb), public.rebuild_finish_run (uuid, uuid, jsonb), public.rebuild_save_evaluation (uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 10
GRANT EXECUTE ON FUNCTION public.rebuild_begin_run (uuid, uuid, uuid, uuid, text, jsonb), public.rebuild_finish_run (uuid, uuid, jsonb), public.rebuild_save_evaluation (uuid, uuid, jsonb) TO service_role;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 11
REVOKE EXECUTE ON FUNCTION public.record_prompt_attempt_and_progress (uuid, uuid, text, text, jsonb, text, integer), public.update_prompt_attempt_evaluation_and_progress (uuid, jsonb) FROM authenticated;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 12
REVOKE INSERT, UPDATE, DELETE ON TABLE public.prompt_attempts FROM authenticated;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 13
CREATE FUNCTION public.rebuild_can_teach(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
 SELECT EXISTS(SELECT 1 FROM classes c JOIN course_instructors ci ON ci.course_id=c.course_id WHERE c.id=p_class AND ci.user_id=public.current_user_id());
$$;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 14
REVOKE ALL PRIVILEGES ON FUNCTION public.rebuild_can_teach (uuid) FROM PUBLIC, anon;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 15
GRANT EXECUTE ON FUNCTION public.rebuild_can_teach (uuid) TO authenticated;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 16
CREATE FUNCTION public.rebuild_class_attempts(p_class uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF NOT public.rebuild_can_teach(p_class) THEN RAISE EXCEPTION 'Assigned trainer required'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(pa)||jsonb_build_object('learner_name',u.full_name)), '[]'::jsonb) FROM (SELECT * FROM public.prompt_attempts WHERE class_id=p_class ORDER BY created_at DESC LIMIT 100) pa JOIN learners l ON l.id=pa.learner_id JOIN users u ON u.id=l.user_id);
END $$;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 17
REVOKE ALL PRIVILEGES ON FUNCTION public.rebuild_class_attempts (uuid) FROM PUBLIC, anon;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 18
GRANT EXECUTE ON FUNCTION public.rebuild_class_attempts (uuid) TO authenticated;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 19
CREATE TABLE public.trainer_hints (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES classes, learner_id uuid NOT NULL REFERENCES learners, trainer_id uuid NOT NULL DEFAULT public.current_user_id() REFERENCES users, message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now());

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 20
CREATE INDEX ON public.trainer_hints (learner_id, class_id, created_at);

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 21
ALTER TABLE public.trainer_hints ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 22
GRANT SELECT, INSERT ON TABLE public.trainer_hints TO authenticated;

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 23
CREATE POLICY hint_read ON public.trainer_hints AS PERMISSIVE FOR select TO authenticated USING (public.rebuild_can_teach(class_id) OR EXISTS (SELECT 1 FROM learners AS l INNER JOIN enrollments AS e ON e.learner_id = l.id WHERE l.id = trainer_hints.learner_id AND l.user_id = public.current_user_id() AND e.class_id = trainer_hints.class_id AND e.status = 'active'));

-- supabase/migrations/018_rebuild_server_runs_and_hints.sql statement 24
CREATE POLICY hint_send ON public.trainer_hints AS PERMISSIVE FOR insert TO authenticated WITH CHECK (trainer_id = public.current_user_id() AND public.rebuild_can_teach(class_id) AND EXISTS (SELECT 1 FROM enrollments AS e WHERE e.learner_id = trainer_hints.learner_id AND e.class_id = class_id AND e.status = 'active'));

-- supabase/migrations/019_rebuild_hint_enrollment_scope.sql statement 2
ALTER POLICY hint_send ON public.trainer_hints WITH CHECK (trainer_id = public.current_user_id() AND public.rebuild_can_teach(trainer_hints.class_id) AND EXISTS (SELECT 1 FROM public.enrollments AS e WHERE e.learner_id = trainer_hints.learner_id AND e.class_id = trainer_hints.class_id AND e.status = 'active'));

-- supabase/migrations/020_rebuild_profiles_and_class_analytics.sql statement 2
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_confirmed_at timestamptz;

-- supabase/migrations/020_rebuild_profiles_and_class_analytics.sql statement 3
CREATE FUNCTION public.rebuild_my_profile() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE u public.users; department text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO STRICT u FROM public.users WHERE auth_provider_id=auth.uid()::text;
 SELECT c.department INTO department FROM public.classes c JOIN public.enrollments e ON e.class_id=c.id
 JOIN public.learners l ON l.id=e.learner_id
 WHERE l.user_id=u.id AND e.status='active' AND c.status='active' ORDER BY e.joined_at LIMIT 1;
 RETURN jsonb_build_object('full_name',u.full_name,'email',u.email,'role',u.role,
  'department',department,'profile_confirmed_at',u.profile_confirmed_at);
END $$;

-- supabase/migrations/020_rebuild_profiles_and_class_analytics.sql statement 4
CREATE FUNCTION public.rebuild_confirm_profile(p_full_name text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF length(btrim(p_full_name)) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Full name must contain 2–120 characters'; END IF;
 UPDATE public.users SET full_name=btrim(p_full_name),profile_confirmed_at=now()
 WHERE auth_provider_id=auth.uid()::text;
 IF NOT FOUND THEN RAISE EXCEPTION 'Provisioned profile required'; END IF;
 RETURN public.rebuild_my_profile();
END $$;

-- supabase/migrations/020_rebuild_profiles_and_class_analytics.sql statement 5
CREATE FUNCTION public.rebuild_class_analytics(p_class uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF NOT public.rebuild_can_teach(p_class) THEN RAISE EXCEPTION 'Assigned trainer required'; END IF;
 RETURN jsonb_build_object(
  'enrolled', (SELECT count(*) FROM public.enrollments WHERE class_id=p_class AND status='active'),
  'attempts', (SELECT count(*) FROM public.prompt_attempts WHERE class_id=p_class),
  'evaluated', (SELECT count(*) FROM public.prompt_attempts WHERE class_id=p_class AND evaluation_json IS NOT NULL),
  'average_score', (SELECT avg((evaluation_json->>'total')::numeric) FROM public.prompt_attempts
    WHERE class_id=p_class AND jsonb_typeof(evaluation_json->'total')='number'),
  'by_learner', (SELECT coalesce(jsonb_agg(to_jsonb(stats)), '[]'::jsonb) FROM (
    SELECT l.id AS learner_id,u.full_name,count(pa.id) AS attempts,
      max(pa.created_at) AS last_run,
      avg(CASE WHEN jsonb_typeof(pa.evaluation_json->'total')='number' THEN (pa.evaluation_json->>'total')::numeric END) AS average_score
    FROM public.enrollments e JOIN public.learners l ON l.id=e.learner_id JOIN public.users u ON u.id=l.user_id
    LEFT JOIN public.prompt_attempts pa ON pa.learner_id=l.id AND pa.class_id=e.class_id
    WHERE e.class_id=p_class AND e.status='active' GROUP BY l.id,u.full_name ORDER BY u.full_name
  ) stats));
END $$;

-- supabase/migrations/020_rebuild_profiles_and_class_analytics.sql statement 6
REVOKE ALL PRIVILEGES ON FUNCTION public.rebuild_my_profile (), public.rebuild_confirm_profile (text), public.rebuild_class_analytics (uuid) FROM PUBLIC, anon;

-- supabase/migrations/020_rebuild_profiles_and_class_analytics.sql statement 7
GRANT EXECUTE ON FUNCTION public.rebuild_my_profile (), public.rebuild_confirm_profile (text), public.rebuild_class_analytics (uuid) TO authenticated;

-- supabase/migrations/021_rebuild_judge_single_claim.sql statement 2
CREATE TABLE public.rebuild_judge_claims (attempt_id uuid PRIMARY KEY REFERENCES public.prompt_attempts (id), subject uuid NOT NULL, claim_id uuid NOT NULL UNIQUE, claimed_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz);

-- supabase/migrations/021_rebuild_judge_single_claim.sql statement 3
ALTER TABLE public.rebuild_judge_claims ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/021_rebuild_judge_single_claim.sql statement 4
REVOKE ALL PRIVILEGES ON TABLE public.rebuild_judge_claims FROM anon, authenticated;

-- supabase/migrations/021_rebuild_judge_single_claim.sql statement 5
GRANT ALL PRIVILEGES ON TABLE public.rebuild_judge_claims TO service_role;

-- supabase/migrations/021_rebuild_judge_single_claim.sql statement 6
CREATE FUNCTION public.rebuild_claim_judge(p_subject uuid, p_attempt uuid, p_claim uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE attempt public.prompt_attempts; inserted integer;
BEGIN
 SELECT pa.* INTO STRICT attempt FROM public.prompt_attempts pa JOIN public.rebuild_runs r ON r.attempt_id=pa.id
 WHERE pa.id=p_attempt AND r.subject=p_subject FOR UPDATE OF pa;
 IF attempt.evaluation_json IS NOT NULL THEN RETURN jsonb_build_object('status','complete','evaluation',attempt.evaluation_json); END IF;
 INSERT INTO public.rebuild_judge_claims(attempt_id,subject,claim_id) VALUES(p_attempt,p_subject,p_claim) ON CONFLICT(attempt_id) DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 RETURN jsonb_build_object('status',CASE WHEN inserted=1 THEN 'claimed' ELSE 'busy' END);
END $$;

-- supabase/migrations/021_rebuild_judge_single_claim.sql statement 7
CREATE FUNCTION public.rebuild_finish_judge(p_subject uuid, p_attempt uuid, p_claim uuid, p_evaluation jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE claim public.rebuild_judge_claims; saved jsonb;
BEGIN
 SELECT * INTO STRICT claim FROM public.rebuild_judge_claims WHERE attempt_id=p_attempt AND subject=p_subject AND claim_id=p_claim FOR UPDATE;
 IF claim.completed_at IS NOT NULL THEN RETURN (SELECT evaluation_json FROM public.prompt_attempts WHERE id=p_attempt); END IF;
 saved:=public.rebuild_save_evaluation(p_subject,p_attempt,p_evaluation);
 UPDATE public.rebuild_judge_claims SET completed_at=now() WHERE attempt_id=p_attempt;
 RETURN saved;
END $$;

-- supabase/migrations/021_rebuild_judge_single_claim.sql statement 8
REVOKE ALL PRIVILEGES ON FUNCTION public.rebuild_claim_judge (uuid, uuid, uuid), public.rebuild_finish_judge (uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- supabase/migrations/021_rebuild_judge_single_claim.sql statement 9
GRANT EXECUTE ON FUNCTION public.rebuild_claim_judge (uuid, uuid, uuid), public.rebuild_finish_judge (uuid, uuid, uuid, jsonb) TO service_role;

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 2
CREATE FUNCTION public.rebuild_can_manage_class(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.classes c JOIN public.course_instructors ci ON ci.course_id=c.course_id WHERE c.id=p_class AND ci.user_id=public.current_user_id() AND ci.permission IN ('owner','editor'));
$$;

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 3
REVOKE ALL PRIVILEGES ON FUNCTION public.rebuild_can_manage_class (uuid) FROM PUBLIC, anon;

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 4
GRANT EXECUTE ON FUNCTION public.rebuild_can_manage_class (uuid) TO authenticated;

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 5
CREATE TABLE public.workshop_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes, trainer_id uuid NOT NULL REFERENCES public.users DEFAULT public.current_user_id(), request_id uuid NOT NULL, message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (trainer_id, request_id));

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 6
CREATE TABLE public.workshop_message_receipts (message_id uuid NOT NULL REFERENCES public.workshop_messages ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.users, read_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (message_id, user_id));

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 7
CREATE INDEX ON public.workshop_messages (class_id, created_at DESC);

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 8
ALTER TABLE public.workshop_messages ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 9
ALTER TABLE public.workshop_message_receipts ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 10
REVOKE ALL PRIVILEGES ON TABLE public.workshop_messages, public.workshop_message_receipts FROM anon, authenticated;

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 11
CREATE FUNCTION public.rebuild_broadcast(p_class uuid, p_request uuid, p_message text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE existing public.workshop_messages; new_id uuid;
BEGIN
 IF NOT public.rebuild_can_manage_class(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.classes WHERE id=p_class AND status='active') THEN RAISE EXCEPTION 'Class is not active'; END IF;
 INSERT INTO public.workshop_messages(class_id,request_id,message) VALUES(p_class,p_request,btrim(p_message)) ON CONFLICT(trainer_id,request_id) DO NOTHING RETURNING id INTO new_id;
 SELECT * INTO STRICT existing FROM public.workshop_messages WHERE trainer_id=public.current_user_id() AND request_id=p_request;
 IF existing.class_id<>p_class OR existing.message<>btrim(p_message) THEN RAISE EXCEPTION 'Request key conflict'; END IF;
 RETURN existing.id;
END $$;

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 12
CREATE FUNCTION public.rebuild_workshop_inbox(p_class uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT (public.rebuild_can_teach(p_class) OR public.has_active_class_enrollment(p_class)) THEN RAISE EXCEPTION 'Class access required'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(m)||jsonb_build_object('read_at',r.read_at) ORDER BY m.created_at DESC),'[]'::jsonb)
 FROM (SELECT id,message,created_at FROM public.workshop_messages WHERE class_id=p_class ORDER BY created_at DESC LIMIT 30) m
 LEFT JOIN public.workshop_message_receipts r ON r.message_id=m.id AND r.user_id=public.current_user_id());
END $$;

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 13
CREATE FUNCTION public.rebuild_ack_workshop_message(p_message uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE target_class uuid;
BEGIN
 SELECT class_id INTO STRICT target_class FROM public.workshop_messages WHERE id=p_message;
 IF auth.uid() IS NULL OR NOT (public.rebuild_can_teach(target_class) OR public.has_active_class_enrollment(target_class)) THEN RAISE EXCEPTION 'Class access required'; END IF;
 INSERT INTO public.workshop_message_receipts(message_id,user_id) VALUES(p_message,public.current_user_id()) ON CONFLICT DO NOTHING;
END $$;

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 14
REVOKE ALL PRIVILEGES ON FUNCTION public.rebuild_broadcast (uuid, uuid, text), public.rebuild_workshop_inbox (uuid), public.rebuild_ack_workshop_message (uuid) FROM PUBLIC, anon;

-- supabase/migrations/022_rebuild_workshop_broadcast.sql statement 15
GRANT EXECUTE ON FUNCTION public.rebuild_broadcast (uuid, uuid, text), public.rebuild_workshop_inbox (uuid), public.rebuild_ack_workshop_message (uuid) TO authenticated;

-- supabase/migrations/023_rebuild_roster_import.sql statement 2
CREATE TABLE public.rebuild_roster_imports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes, actor_id uuid NOT NULL REFERENCES public.users, request_id uuid NOT NULL, rows_json jsonb NOT NULL, result jsonb, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (actor_id, request_id));

-- supabase/migrations/023_rebuild_roster_import.sql statement 3
ALTER TABLE public.rebuild_roster_imports ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/023_rebuild_roster_import.sql statement 4
REVOKE ALL PRIVILEGES ON TABLE public.rebuild_roster_imports FROM anon, authenticated;

-- supabase/migrations/023_rebuild_roster_import.sql statement 5
CREATE FUNCTION public.rebuild_import_roster(p_class uuid, p_request uuid, p_rows jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE item jsonb; email_value text; name_value text; uid uuid; lid uuid; existing_role text; prior public.rebuild_roster_imports; imported integer:=0; inserted integer;
BEGIN
 IF NOT public.rebuild_can_manage_class(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.classes WHERE id=p_class AND status IN ('active','upcoming')) THEN RAISE EXCEPTION 'Class is closed'; END IF;
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Rows must be an array'; END IF;
 IF jsonb_array_length(p_rows) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Import requires 1 to 500 rows'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) r GROUP BY lower(btrim(r->>'email')) HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate email in import'; END IF;
 INSERT INTO public.rebuild_roster_imports(class_id,actor_id,request_id,rows_json) VALUES(p_class,public.current_user_id(),p_request,p_rows) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 SELECT * INTO STRICT prior FROM public.rebuild_roster_imports WHERE actor_id=public.current_user_id() AND request_id=p_request FOR UPDATE;
 IF prior.class_id<>p_class OR prior.rows_json<>p_rows THEN RAISE EXCEPTION 'Request key conflict'; END IF;
 IF inserted=0 THEN RETURN prior.result; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  email_value:=lower(btrim(item->>'email')); name_value:=btrim(item->>'fullName');
  IF email_value IS NULL OR length(email_value)>254 OR email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR name_value IS NULL OR length(name_value) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Invalid roster row'; END IF;
  -- A class import never changes an existing identity, role or profile name.
  INSERT INTO public.users(email,full_name,role) VALUES(email_value,name_value,'learner') ON CONFLICT(email) DO NOTHING;
  SELECT id,role INTO STRICT uid,existing_role FROM public.users WHERE email=email_value FOR UPDATE;
  IF existing_role<>'learner' THEN RAISE EXCEPTION 'Roster contains a non-learner account'; END IF;
  INSERT INTO public.learners(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
  SELECT id INTO STRICT lid FROM public.learners WHERE user_id=uid;
  INSERT INTO public.enrollments(learner_id,class_id,status) VALUES(lid,p_class,'active') ON CONFLICT(learner_id,class_id) DO NOTHING;
  -- Removed/expired/completed memberships are preserved; explicit lifecycle action is required.
  IF NOT EXISTS(SELECT 1 FROM public.enrollments WHERE learner_id=lid AND class_id=p_class AND status='active') THEN RAISE EXCEPTION 'Existing membership is not active; review before re-enrollment'; END IF;
  imported:=imported+1;
 END LOOP;
 UPDATE public.rebuild_roster_imports SET result=jsonb_build_object('processed',imported,'classId',p_class) WHERE id=prior.id RETURNING * INTO prior;
 RETURN prior.result;
END $$;

-- supabase/migrations/023_rebuild_roster_import.sql statement 6
REVOKE ALL PRIVILEGES ON FUNCTION public.rebuild_import_roster (uuid, uuid, jsonb) FROM PUBLIC, anon;

-- supabase/migrations/023_rebuild_roster_import.sql statement 7
GRANT EXECUTE ON FUNCTION public.rebuild_import_roster (uuid, uuid, jsonb) TO authenticated;

-- supabase/migrations/024_rebuild_versioned_sops.sql statement 2
CREATE TABLE public.rebuild_sop_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes, title text NOT NULL CHECK (length(btrim(title)) BETWEEN 2 AND 160), created_by uuid NOT NULL REFERENCES public.users DEFAULT public.current_user_id(), created_at timestamptz NOT NULL DEFAULT now());

-- supabase/migrations/024_rebuild_versioned_sops.sql statement 3
CREATE TABLE public.rebuild_sop_versions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES public.rebuild_sop_documents, version integer NOT NULL CHECK (version > 0), content text NOT NULL CHECK (length(content) BETWEEN 1 AND 100000), created_by uuid NOT NULL REFERENCES public.users DEFAULT public.current_user_id(), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (document_id, version));

-- supabase/migrations/024_rebuild_versioned_sops.sql statement 4
CREATE TABLE public.rebuild_sop_bindings (class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons, document_id uuid NOT NULL REFERENCES public.rebuild_sop_documents, version_id uuid NOT NULL REFERENCES public.rebuild_sop_versions, PRIMARY KEY (class_id, lesson_id, document_id));

-- supabase/migrations/024_rebuild_versioned_sops.sql statement 5
ALTER TABLE public.rebuild_sop_documents ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/024_rebuild_versioned_sops.sql statement 6
ALTER TABLE public.rebuild_sop_versions ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/024_rebuild_versioned_sops.sql statement 7
ALTER TABLE public.rebuild_sop_bindings ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/024_rebuild_versioned_sops.sql statement 8
REVOKE ALL PRIVILEGES ON TABLE public.rebuild_sop_documents, public.rebuild_sop_versions, public.rebuild_sop_bindings FROM anon, authenticated;

-- supabase/migrations/024_rebuild_versioned_sops.sql statement 9
CREATE FUNCTION public.rebuild_publish_sop(p_class uuid, p_document uuid, p_title text, p_content text, p_lesson uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE doc_id uuid; version_id uuid; version_number integer;
BEGIN
 IF NOT public.rebuild_can_manage_class(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF p_lesson IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE c.id=p_class AND l.id=p_lesson) THEN RAISE EXCEPTION 'Lesson does not belong to class course'; END IF;
 IF p_document IS NULL THEN INSERT INTO public.rebuild_sop_documents(class_id,title) VALUES(p_class,btrim(p_title)) RETURNING id INTO doc_id;
 ELSE SELECT id INTO STRICT doc_id FROM public.rebuild_sop_documents WHERE id=p_document AND class_id=p_class FOR UPDATE; END IF;
 SELECT coalesce(max(version),0)+1 INTO version_number FROM public.rebuild_sop_versions WHERE document_id=doc_id;
 INSERT INTO public.rebuild_sop_versions(document_id,version,content) VALUES(doc_id,version_number,p_content) RETURNING id INTO version_id;
 IF p_lesson IS NOT NULL THEN INSERT INTO public.rebuild_sop_bindings(class_id,lesson_id,document_id,version_id) VALUES(p_class,p_lesson,doc_id,version_id) ON CONFLICT(class_id,lesson_id,document_id) DO UPDATE SET version_id=excluded.version_id; END IF;
 RETURN version_id;
END $$;

-- supabase/migrations/024_rebuild_versioned_sops.sql statement 10
CREATE FUNCTION public.rebuild_class_sops(p_class uuid, p_lesson uuid = NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT(public.rebuild_can_teach(p_class) OR public.has_active_class_enrollment(p_class)) THEN RAISE EXCEPTION 'Class access required'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.title,s.version DESC),'[]'::jsonb) FROM (
 SELECT d.id AS document_id,d.title,v.id AS version_id,v.version,v.content,v.created_at,
 '[SOP:'||v.id::text||':v'||v.version::text||']' AS citation
 FROM public.rebuild_sop_documents d JOIN public.rebuild_sop_versions v ON v.document_id=d.id
 WHERE d.class_id=p_class AND (p_lesson IS NULL OR EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b WHERE b.class_id=p_class AND b.lesson_id=p_lesson AND b.version_id=v.id))
 AND (public.rebuild_can_teach(p_class) OR EXISTS(SELECT 1 FROM public.rebuild_sop_bindings b JOIN public.lessons l ON l.id=b.lesson_id JOIN public.course_modules m ON m.id=l.module_id WHERE b.class_id=p_class AND b.version_id=v.id AND l.status='published' AND m.status='published'))
 ) s);
END $$;

-- supabase/migrations/024_rebuild_versioned_sops.sql statement 11
CREATE FUNCTION public.rebuild_sop_lesson_options(p_class uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF NOT public.rebuild_can_manage_class(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'title',l.title) ORDER BY m.position,l.position),'[]'::jsonb) FROM public.classes c JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE c.id=p_class);
END $$;

-- supabase/migrations/024_rebuild_versioned_sops.sql statement 12
REVOKE ALL PRIVILEGES ON FUNCTION public.rebuild_publish_sop (uuid, uuid, text, text, uuid), public.rebuild_class_sops (uuid, uuid), public.rebuild_sop_lesson_options (uuid) FROM PUBLIC, anon;

-- supabase/migrations/024_rebuild_versioned_sops.sql statement 13
GRANT EXECUTE ON FUNCTION public.rebuild_publish_sop (uuid, uuid, text, text, uuid), public.rebuild_class_sops (uuid, uuid), public.rebuild_sop_lesson_options (uuid) TO authenticated;

-- supabase/migrations/025_rebuild_trainer_audit.sql statement 2
CREATE TABLE public.rebuild_trainer_actions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id uuid NOT NULL REFERENCES public.prompt_attempts, actor_id uuid NOT NULL REFERENCES public.users DEFAULT public.current_user_id(), request_id uuid NOT NULL, action text NOT NULL CHECK (action IN ('note', 'clearance')), reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 2 AND 2000), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (actor_id, request_id));

-- supabase/migrations/025_rebuild_trainer_audit.sql statement 3
ALTER TABLE public.rebuild_trainer_actions ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/025_rebuild_trainer_audit.sql statement 4
REVOKE ALL PRIVILEGES ON TABLE public.rebuild_trainer_actions FROM anon, authenticated;

-- supabase/migrations/025_rebuild_trainer_audit.sql statement 5
CREATE FUNCTION public.rebuild_record_trainer_action(p_attempt uuid, p_request uuid, p_action text, p_reason text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE target_class uuid; result public.rebuild_trainer_actions;
BEGIN
 SELECT class_id INTO STRICT target_class FROM public.prompt_attempts WHERE id=p_attempt;
 IF NOT public.rebuild_can_manage_class(target_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 INSERT INTO public.rebuild_trainer_actions(attempt_id,request_id,action,reason) VALUES(p_attempt,p_request,p_action,btrim(p_reason)) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT result FROM public.rebuild_trainer_actions WHERE actor_id=public.current_user_id() AND request_id=p_request;
 IF result.attempt_id<>p_attempt OR result.action<>p_action OR result.reason<>btrim(p_reason) THEN RAISE EXCEPTION 'Request key conflict'; END IF;
 -- Clearance is an audited trainer decision; it never replaces the AI score or marks automated progress complete.
 RETURN result.id;
END $$;

-- supabase/migrations/025_rebuild_trainer_audit.sql statement 6
CREATE FUNCTION public.rebuild_trainer_action_history(p_attempt uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE target_class uuid;
BEGIN
 SELECT class_id INTO STRICT target_class FROM public.prompt_attempts WHERE id=p_attempt;
 IF auth.uid() IS NULL OR NOT public.rebuild_can_teach(target_class) THEN RAISE EXCEPTION 'Assigned trainer required'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC),'[]'::jsonb) FROM (SELECT id,action,reason,actor_id,created_at FROM public.rebuild_trainer_actions WHERE attempt_id=p_attempt ORDER BY created_at DESC LIMIT 100) a);
END $$;

-- supabase/migrations/025_rebuild_trainer_audit.sql statement 7
REVOKE ALL PRIVILEGES ON FUNCTION public.rebuild_record_trainer_action (uuid, uuid, text, text), public.rebuild_trainer_action_history (uuid) FROM PUBLIC, anon;

-- supabase/migrations/025_rebuild_trainer_audit.sql statement 8
GRANT EXECUTE ON FUNCTION public.rebuild_record_trainer_action (uuid, uuid, text, text), public.rebuild_trainer_action_history (uuid) TO authenticated;

-- supabase/migrations/026_rebuild_message_realtime.sql statement 2
GRANT SELECT ON TABLE public.workshop_messages TO authenticated;

-- supabase/migrations/026_rebuild_message_realtime.sql statement 3
CREATE POLICY workshop_message_read ON public.workshop_messages AS PERMISSIVE FOR select TO authenticated USING (auth.uid() IS NOT NULL AND (public.rebuild_can_teach(class_id) OR public.has_active_class_enrollment(class_id)));

-- supabase/migrations/027_production_ui_contract.sql statement 2
CREATE TABLE public.product_class_grants (user_id uuid NOT NULL REFERENCES public.users, class_id uuid NOT NULL REFERENCES public.classes, permission text NOT NULL CHECK (permission IN ('head', 'contributor')), PRIMARY KEY (user_id, class_id));

-- supabase/migrations/027_production_ui_contract.sql statement 3
CREATE TABLE public.product_studio (class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons, revision integer NOT NULL DEFAULT 1, config jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid NOT NULL REFERENCES public.users, PRIMARY KEY (class_id, lesson_id));

-- supabase/migrations/027_production_ui_contract.sql statement 4
CREATE TABLE public.product_session_controls (class_id uuid PRIMARY KEY REFERENCES public.classes, state text NOT NULL CHECK (state IN ('active', 'frozen', 'ended')), revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid NOT NULL REFERENCES public.users);

-- supabase/migrations/027_production_ui_contract.sql statement 5
CREATE TABLE public.product_sheet_connections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes, sheet_id text NOT NULL CHECK (sheet_id ~ '^[A-Za-z0-9_-]+$'), name text NOT NULL, column_mapping jsonb NOT NULL, status text NOT NULL DEFAULT 'configured', last_synced_at timestamptz, created_by uuid NOT NULL REFERENCES public.users, UNIQUE (class_id, sheet_id));

-- supabase/migrations/027_production_ui_contract.sql statement 6
CREATE TABLE public.product_profile_corrections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users, request_id uuid NOT NULL, reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 2 AND 2000), status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, request_id));

-- supabase/migrations/027_production_ui_contract.sql statement 7
CREATE TABLE public.product_audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid REFERENCES public.classes, actor_id uuid NOT NULL REFERENCES public.users, action text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

-- supabase/migrations/027_production_ui_contract.sql statement 8
DO $$ DECLARE name text; BEGIN
 FOREACH name IN ARRAY ARRAY['product_class_grants','product_studio','product_session_controls','product_sheet_connections','product_profile_corrections','product_audit'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',name);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',name);
 END LOOP;
END $$;

-- supabase/migrations/027_production_ui_contract.sql statement 9
CREATE FUNCTION public.product_can_manage(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.rebuild_can_manage_class(p_class) OR EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin'));
$$;

-- supabase/migrations/027_production_ui_contract.sql statement 10
CREATE FUNCTION public.product_request_correction(p_request uuid, p_reason text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE record public.product_profile_corrections;
BEGIN
 IF auth.uid() IS NULL OR public.current_user_id() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 INSERT INTO public.product_profile_corrections(user_id,request_id,reason) VALUES(public.current_user_id(),p_request,btrim(p_reason)) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT record FROM public.product_profile_corrections WHERE user_id=public.current_user_id() AND request_id=p_request;
 IF record.reason<>btrim(p_reason) THEN RAISE EXCEPTION 'Request conflict'; END IF;
 RETURN record.id;
END $$;

-- supabase/migrations/027_production_ui_contract.sql statement 11
CREATE FUNCTION public.product_save_studio(p_class uuid, p_lesson uuid, p_expected_revision integer, p_config jsonb, p_fields jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE current_revision integer; criterion jsonb; total numeric; field_state text;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE c.id=p_class AND l.id=p_lesson) THEN RAISE EXCEPTION 'Lesson outside course'; END IF;
 PERFORM 1 FROM public.lessons WHERE id=p_lesson FOR UPDATE;
 SELECT revision INTO current_revision FROM public.product_studio WHERE class_id=p_class AND lesson_id=p_lesson FOR UPDATE;
 current_revision:=coalesce(current_revision,0);
 IF current_revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'Revision conflict'; END IF;
 IF jsonb_typeof(p_config->'rubric') IS DISTINCT FROM 'array' OR jsonb_array_length(p_config->'rubric')<>5 THEN RAISE EXCEPTION 'Five criteria required'; END IF;
 IF (SELECT count(DISTINCT c->>'key') FROM jsonb_array_elements(p_config->'rubric') c)<>5 THEN RAISE EXCEPTION 'Unique criteria required'; END IF;
 total:=0;
 FOR criterion IN SELECT value FROM jsonb_array_elements(p_config->'rubric') LOOP
  IF criterion->>'key' NOT IN ('groundedness','persona','format','oneshot','actionability') OR jsonb_typeof(criterion->'weight')<>'number' OR jsonb_typeof(criterion->'active')<>'boolean' THEN RAISE EXCEPTION 'Invalid criterion'; END IF;
  IF (criterion->>'weight')::numeric<0 OR (criterion->>'weight')::numeric>100 OR NOT(criterion->>'active')::boolean AND (criterion->>'weight')::numeric<>0 THEN RAISE EXCEPTION 'Invalid criterion weight'; END IF;
  total:=total+(criterion->>'weight')::numeric;
 END LOOP;
 IF total<>100 THEN RAISE EXCEPTION 'Weights must sum to 100'; END IF;
 IF p_config->>'state' NOT IN ('DRAFT','ACTIVE','SCHEDULED','ARCHIVED') THEN RAISE EXCEPTION 'Invalid lifecycle state'; END IF;
 IF p_config->>'state'='SCHEDULED' AND (nullif(p_config->>'startTime','') IS NULL OR nullif(p_config->>'endTime','') IS NULL OR (p_config->>'endTime')::timestamptz <= (p_config->>'startTime')::timestamptz) THEN RAISE EXCEPTION 'Invalid schedule'; END IF;
 IF length(btrim(p_fields->>'title')) NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION 'Invalid lesson title'; END IF;
 field_state:=CASE p_config->>'state' WHEN 'DRAFT' THEN 'draft' WHEN 'ARCHIVED' THEN 'archived' ELSE 'published' END;
 UPDATE public.lessons SET title=btrim(p_fields->>'title'),scenario=p_fields->>'scenario',task_goal=p_fields->>'task_goal',system_instruction=p_fields->>'system_instruction',starter_prompt=p_fields->>'starter_prompt',sample_input_context=p_fields->>'sample_input_context',status=field_state,updated_at=now() WHERE id=p_lesson;
 INSERT INTO public.product_studio(class_id,lesson_id,revision,config,updated_by) VALUES(p_class,p_lesson,current_revision+1,p_config,public.current_user_id())
 ON CONFLICT(class_id,lesson_id) DO UPDATE SET revision=excluded.revision,config=excluded.config,updated_by=excluded.updated_by,updated_at=now();
 -- Canonical weighted maxima match the active scaffold-rubric selection.
 DELETE FROM public.lesson_rubric_criteria WHERE lesson_id=p_lesson;
 INSERT INTO public.lesson_rubric_criteria(lesson_id,criterion_key,label,description,max_score,position)
 SELECT p_lesson,c->>'key',c->>'label',coalesce(c->>'description',''),(c->>'weight')::numeric/10,ord::integer
 FROM jsonb_array_elements(p_config->'rubric') WITH ORDINALITY AS r(c,ord) WHERE (c->>'active')::boolean AND (c->>'weight')::numeric>0;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'studio.save','Lesson '||p_lesson||' revision '||(current_revision+1));
 RETURN jsonb_build_object('revision',current_revision+1,'lessonId',p_lesson);
END $$;

-- supabase/migrations/027_production_ui_contract.sql statement 12
CREATE FUNCTION public.product_create_lesson(p_class uuid, p_title text, p_key text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE course uuid; module uuid; position_value integer; new_id uuid;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 SELECT course_id INTO STRICT course FROM public.classes WHERE id=p_class;
 PERFORM 1 FROM public.courses WHERE id=course FOR UPDATE;
 SELECT id INTO module FROM public.course_modules WHERE course_id=course ORDER BY position LIMIT 1;
 IF module IS NULL THEN INSERT INTO public.course_modules(course_id,title,position,status) VALUES(course,'Codelabs',1,'published') RETURNING id INTO module; END IF;
 SELECT coalesce(max(position),0)+1 INTO position_value FROM public.lessons WHERE module_id=module;
 INSERT INTO public.lessons(module_id,title,lesson_key,position,status) VALUES(module,btrim(p_title),btrim(p_key),position_value,'draft') RETURNING id INTO new_id;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'lesson.create',new_id::text);
 RETURN new_id;
END $$;

-- supabase/migrations/027_production_ui_contract.sql statement 13
CREATE FUNCTION public.product_create_cohort(p_class uuid, p_code text, p_department text, p_start timestamptz, p_end timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE source public.classes; new_id uuid;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF p_end<=p_start THEN RAISE EXCEPTION 'Invalid schedule'; END IF;
 SELECT * INTO STRICT source FROM public.classes WHERE id=p_class;
 INSERT INTO public.classes(class_code,course_id,client_id,department,start_date,end_date,status,enrollment_mode) VALUES(btrim(p_code),source.course_id,source.client_id,btrim(p_department),p_start,p_end,'upcoming','instructor') RETURNING id INTO new_id;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(new_id,public.current_user_id(),'cohort.create','Created from '||p_class);
 RETURN new_id;
END $$;

-- supabase/migrations/027_production_ui_contract.sql statement 14
CREATE FUNCTION public.product_session_control(p_class uuid, p_state text, p_expected_revision integer, p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE prior public.product_session_controls; next_revision integer;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF p_state NOT IN ('active','frozen','ended') OR length(btrim(p_reason))<2 THEN RAISE EXCEPTION 'Invalid control command'; END IF;
 PERFORM 1 FROM public.classes WHERE id=p_class FOR UPDATE;
 SELECT * INTO prior FROM public.product_session_controls WHERE class_id=p_class FOR UPDATE;
 IF coalesce(prior.revision,0) IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'Revision conflict'; END IF;
 IF prior.state='ended' THEN RAISE EXCEPTION 'Session already ended'; END IF;
 next_revision:=coalesce(prior.revision,0)+1;
 INSERT INTO public.product_session_controls(class_id,state,revision,updated_by) VALUES(p_class,p_state,next_revision,public.current_user_id()) ON CONFLICT(class_id) DO UPDATE SET state=excluded.state,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now();
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'session.'||p_state,btrim(p_reason));
 RETURN jsonb_build_object('state',p_state,'revision',next_revision);
END $$;

-- supabase/migrations/027_production_ui_contract.sql statement 15
CREATE FUNCTION public.product_save_sheet(p_class uuid, p_sheet text, p_name text, p_mapping jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE new_id uuid;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF nullif(p_mapping->>'email','') IS NULL OR nullif(p_mapping->>'fullName','') IS NULL OR nullif(p_mapping->>'department','') IS NULL OR nullif(p_mapping->>'country','') IS NULL THEN RAISE EXCEPTION 'Four roster field mappings required'; END IF;
 INSERT INTO public.product_sheet_connections(class_id,sheet_id,name,column_mapping,created_by) VALUES(p_class,p_sheet,btrim(p_name),p_mapping,public.current_user_id()) ON CONFLICT(class_id,sheet_id) DO UPDATE SET name=excluded.name,column_mapping=excluded.column_mapping RETURNING id INTO new_id;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'roster.configure',new_id::text);
 RETURN new_id;
END $$;

-- supabase/migrations/027_production_ui_contract.sql statement 16
CREATE FUNCTION public.product_guard_new_run() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE control text; cfg jsonb;
BEGIN
 IF EXISTS(SELECT 1 FROM public.rebuild_runs WHERE subject=NEW.subject AND request_id=NEW.request_id) THEN RETURN NEW; END IF;
 SELECT state INTO control FROM public.product_session_controls WHERE class_id=NEW.class_id;
 IF control IN ('frozen','ended') THEN RAISE EXCEPTION 'Session does not accept new runs'; END IF;
 SELECT config INTO cfg FROM public.product_studio WHERE class_id=NEW.class_id AND lesson_id=NEW.lesson_id;
 IF cfg->>'state' IN ('DRAFT','ARCHIVED') THEN RAISE EXCEPTION 'Lab is not active'; END IF;
 IF cfg->>'state'='SCHEDULED' AND (now()<(cfg->>'startTime')::timestamptz OR now()>=(cfg->>'endTime')::timestamptz) THEN RAISE EXCEPTION 'Outside lab schedule'; END IF;
 RETURN NEW;
END $$;

-- supabase/migrations/027_production_ui_contract.sql statement 17
CREATE TRIGGER product_guard_new_run BEFORE INSERT ON public.rebuild_runs FOR EACH ROW EXECUTE PROCEDURE public.product_guard_new_run();

-- supabase/migrations/027_production_ui_contract.sql statement 18
DO $$ BEGIN
 EXECUTE replace(pg_get_functiondef('public.valid_evaluation_total(jsonb)'::regprocedure),
 'FUNCTION public.valid_evaluation_total(', 'FUNCTION public.legacy_valid_evaluation_total(');
END $$;

-- supabase/migrations/027_production_ui_contract.sql statement 19
CREATE OR REPLACE FUNCTION public.valid_evaluation_total(payload jsonb) RETURNS numeric LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp' AS $$
DECLARE item jsonb; total numeric:=0; maxima numeric:=0;
BEGIN
 IF payload->>'contract' IS DISTINCT FROM 'weighted-v1' THEN RETURN public.legacy_valid_evaluation_total(payload); END IF;
 IF jsonb_typeof(payload->'criteria') IS DISTINCT FROM 'array' OR jsonb_typeof(payload->'total') IS DISTINCT FROM 'number' OR jsonb_array_length(payload->'criteria') NOT BETWEEN 1 AND 5 THEN RETURN NULL; END IF;
 IF (SELECT count(DISTINCT c->>'key') FROM jsonb_array_elements(payload->'criteria') c)<>jsonb_array_length(payload->'criteria') THEN RETURN NULL; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(payload->'criteria') LOOP
  IF item->>'key' NOT IN ('groundedness','persona','format','oneshot','actionability') OR jsonb_typeof(item->'score') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'max') IS DISTINCT FROM 'number' THEN RETURN NULL; END IF;
  IF (item->>'score')::numeric<0 OR (item->>'score')::numeric>(item->>'max')::numeric OR (item->>'max')::numeric<=0 THEN RETURN NULL; END IF;
  total:=total+(item->>'score')::numeric; maxima:=maxima+(item->>'max')::numeric;
 END LOOP;
 IF maxima<>10 OR round(total,2)<>(payload->>'total')::numeric THEN RETURN NULL; END IF;
 RETURN round(total,2);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN NULL;
END $$;

-- supabase/migrations/027_production_ui_contract.sql statement 20
REVOKE ALL PRIVILEGES ON FUNCTION public.valid_evaluation_total (jsonb), public.legacy_valid_evaluation_total (jsonb), public.product_guard_new_run () FROM PUBLIC, anon, authenticated;

-- supabase/migrations/027_production_ui_contract.sql statement 21
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('product_can_manage','product_request_correction','product_save_studio','product_create_lesson','product_create_cohort','product_session_control','product_save_sheet') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',item.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',item.signature);
 END LOOP;
END $$;

-- supabase/migrations/028_product_support_and_roster.sql statement 2
ALTER TABLE public.users DROP CONSTRAINT users_role_check;

-- supabase/migrations/028_product_support_and_roster.sql statement 3
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('learner', 'instructor', 'head', 'admin'));

-- supabase/migrations/028_product_support_and_roster.sql statement 4
CREATE TABLE public.product_learner_support (learner_id uuid NOT NULL REFERENCES public.learners, class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons, kind text NOT NULL CHECK (kind IN ('hints', 'solution')), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (learner_id, class_id, lesson_id, kind));

-- supabase/migrations/028_product_support_and_roster.sql statement 5
CREATE TABLE public.product_roster_profiles (user_id uuid NOT NULL REFERENCES public.users, class_id uuid NOT NULL REFERENCES public.classes, country text NOT NULL, department text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, class_id));

-- supabase/migrations/028_product_support_and_roster.sql statement 6
ALTER TABLE public.product_learner_support ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/028_product_support_and_roster.sql statement 7
ALTER TABLE public.product_roster_profiles ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/028_product_support_and_roster.sql statement 8
REVOKE ALL PRIVILEGES ON TABLE public.product_learner_support, public.product_roster_profiles FROM anon, authenticated;

-- supabase/migrations/028_product_support_and_roster.sql statement 9
GRANT ALL PRIVILEGES ON TABLE public.product_learner_support, public.product_roster_profiles TO service_role;

-- supabase/migrations/028_product_support_and_roster.sql statement 10
CREATE FUNCTION public.product_unlock_support(p_class uuid, p_lesson uuid, p_kind text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE learner uuid;
BEGIN
 IF NOT public.has_active_class_enrollment(p_class) OR p_kind NOT IN ('hints','solution') THEN RAISE EXCEPTION 'Active learner required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE c.id=p_class AND l.id=p_lesson AND l.status='published' AND m.status='published') THEN RAISE EXCEPTION 'Published class lesson required'; END IF;
 SELECT id INTO STRICT learner FROM public.learners WHERE user_id=public.current_user_id();
 INSERT INTO public.product_learner_support(learner_id,class_id,lesson_id,kind) VALUES(learner,p_class,p_lesson,p_kind) ON CONFLICT DO NOTHING;
END $$;

-- supabase/migrations/028_product_support_and_roster.sql statement 11
CREATE OR REPLACE FUNCTION public.product_save_sheet(p_class uuid, p_sheet text, p_name text, p_mapping jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE new_id uuid;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF nullif(p_mapping->>'email','') IS NULL OR nullif(p_mapping->>'department','') IS NULL OR nullif(p_mapping->>'country','') IS NULL OR nullif(p_mapping->>'tab','') IS NULL OR nullif(p_mapping->>'range','') IS NULL THEN RAISE EXCEPTION 'Required roster field mappings missing'; END IF;
 INSERT INTO public.product_sheet_connections(class_id,sheet_id,name,column_mapping,created_by) VALUES(p_class,p_sheet,btrim(p_name),p_mapping,public.current_user_id()) ON CONFLICT(class_id,sheet_id) DO UPDATE SET name=excluded.name,column_mapping=excluded.column_mapping RETURNING id INTO new_id;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'roster.configure',new_id::text);
 RETURN new_id;
END $$;

-- supabase/migrations/028_product_support_and_roster.sql statement 12
CREATE FUNCTION public.product_import_roster(p_class uuid, p_request uuid, p_rows jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE item jsonb; prior public.rebuild_roster_imports; uid uuid; lid uuid; actor_role text; class_department text; row_email text; row_name text; count_rows integer:=0; inserted integer;
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 SELECT department INTO STRICT class_department FROM public.classes WHERE id=p_class AND status IN ('active','upcoming');
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid roster size'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) r GROUP BY lower(btrim(r->>'email')) HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate email'; END IF;
 INSERT INTO public.rebuild_roster_imports(class_id,actor_id,request_id,rows_json) VALUES(p_class,public.current_user_id(),p_request,p_rows) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 SELECT * INTO STRICT prior FROM public.rebuild_roster_imports WHERE actor_id=public.current_user_id() AND request_id=p_request FOR UPDATE;
 IF prior.class_id<>p_class OR prior.rows_json<>p_rows THEN RAISE EXCEPTION 'Request key conflict'; END IF;
 IF inserted=0 THEN RETURN prior.result; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  row_email:=lower(btrim(item->>'email')); row_name:=coalesce(btrim(item->>'fullName'),'');
  IF row_email IS NULL OR length(row_email)>254 OR row_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(row_name)>120 OR coalesce(btrim(item->>'department'),'')<>class_department OR nullif(btrim(item->>'country'),'') IS NULL THEN RAISE EXCEPTION 'Invalid scoped roster row'; END IF;
  -- Missing name stays blank until profile confirmation; never infer a name from email.
  INSERT INTO public.users(email,full_name,role) VALUES(row_email,row_name,'learner') ON CONFLICT(email) DO NOTHING;
  SELECT id,role INTO STRICT uid,actor_role FROM public.users WHERE email=row_email FOR UPDATE;
  IF actor_role<>'learner' THEN RAISE EXCEPTION 'Non-learner role in roster'; END IF;
  INSERT INTO public.learners(user_id) VALUES(uid) ON CONFLICT(user_id) DO NOTHING;
  SELECT id INTO STRICT lid FROM public.learners WHERE user_id=uid;
  INSERT INTO public.enrollments(learner_id,class_id,status) VALUES(lid,p_class,'active') ON CONFLICT(learner_id,class_id) DO NOTHING;
  IF NOT EXISTS(SELECT 1 FROM public.enrollments WHERE learner_id=lid AND class_id=p_class AND status='active') THEN RAISE EXCEPTION 'Existing membership requires explicit lifecycle review'; END IF;
  INSERT INTO public.product_roster_profiles(user_id,class_id,country,department) VALUES(uid,p_class,btrim(item->>'country'),class_department) ON CONFLICT(user_id,class_id) DO UPDATE SET country=excluded.country,department=excluded.department,updated_at=now();
  count_rows:=count_rows+1;
 END LOOP;
 UPDATE public.rebuild_roster_imports SET result=jsonb_build_object('processed',count_rows,'classId',p_class) WHERE id=prior.id RETURNING * INTO prior;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'roster.sync',count_rows||' rows');
 RETURN prior.result;
END $$;

-- supabase/migrations/028_product_support_and_roster.sql statement 13
REVOKE ALL PRIVILEGES ON FUNCTION public.product_unlock_support (uuid, uuid, text), public.product_import_roster (uuid, uuid, jsonb) FROM PUBLIC, anon;

-- supabase/migrations/028_product_support_and_roster.sql statement 14
GRANT EXECUTE ON FUNCTION public.product_unlock_support (uuid, uuid, text), public.product_import_roster (uuid, uuid, jsonb) TO authenticated;

-- supabase/migrations/029_product_private_content_and_sandbox.sql statement 2
REVOKE SELECT ON TABLE public.lessons FROM authenticated, anon;

-- supabase/migrations/029_product_private_content_and_sandbox.sql statement 3
DO $$ DECLARE fields text; BEGIN
 SELECT string_agg(quote_ident(column_name),',') INTO fields FROM information_schema.columns
 WHERE table_schema='public' AND table_name='lessons'
 AND column_name NOT IN ('hints','improved_prompt','system_instruction');
 EXECUTE 'GRANT SELECT ('||fields||') ON public.lessons TO authenticated';
END $$;

-- supabase/migrations/029_product_private_content_and_sandbox.sql statement 4
CREATE OR REPLACE FUNCTION public.rebuild_can_manage_class(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
 SELECT 1 FROM public.users u WHERE u.id=public.current_user_id()
 AND (u.role='admin' OR EXISTS(SELECT 1 FROM public.classes c JOIN public.course_instructors ci ON ci.course_id=c.course_id
 WHERE c.id=p_class AND ci.user_id=u.id AND ci.permission IN ('owner','editor'))));
$$;

-- supabase/migrations/029_product_private_content_and_sandbox.sql statement 5
CREATE OR REPLACE FUNCTION public.rebuild_can_teach(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=public.current_user_id()
 AND (u.role='admin' OR EXISTS(SELECT 1 FROM public.classes c JOIN public.course_instructors ci ON ci.course_id=c.course_id WHERE c.id=p_class AND ci.user_id=u.id)));
$$;

-- supabase/migrations/029_product_private_content_and_sandbox.sql statement 6
CREATE TABLE public.product_sandbox_runs (actor_id uuid NOT NULL REFERENCES public.users, request_id uuid NOT NULL, class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons, prompt text NOT NULL, snapshot jsonb NOT NULL, result jsonb, evaluation jsonb, judge_claim uuid, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (actor_id, request_id));

-- supabase/migrations/029_product_private_content_and_sandbox.sql statement 7
ALTER TABLE public.product_sandbox_runs ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/029_product_private_content_and_sandbox.sql statement 8
REVOKE ALL PRIVILEGES ON TABLE public.product_sandbox_runs FROM PUBLIC, anon, authenticated;

-- supabase/migrations/029_product_private_content_and_sandbox.sql statement 9
GRANT ALL PRIVILEGES ON TABLE public.product_sandbox_runs TO service_role;

-- supabase/migrations/029_product_private_content_and_sandbox.sql statement 10
CREATE FUNCTION public.product_limit_ai_run() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE identity uuid; hour_count integer; day_count integer;
BEGIN
 identity:=CASE WHEN TG_TABLE_NAME='rebuild_runs' THEN (to_jsonb(NEW)->>'subject')::uuid ELSE (to_jsonb(NEW)->>'actor_id')::uuid END;
 PERFORM pg_advisory_xact_lock(hashtextextended(identity::text,918));
 IF TG_TABLE_NAME='rebuild_runs' AND EXISTS(SELECT 1 FROM public.rebuild_runs WHERE subject=identity AND request_id=(to_jsonb(NEW)->>'request_id')::uuid) THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='product_sandbox_runs' AND EXISTS(SELECT 1 FROM public.product_sandbox_runs WHERE actor_id=identity AND request_id=(to_jsonb(NEW)->>'request_id')::uuid) THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='rebuild_runs' THEN
  SELECT count(*) FILTER(WHERE created_at>now()-interval '1 hour'),count(*) INTO hour_count,day_count
  FROM public.rebuild_runs WHERE subject=identity AND created_at>now()-interval '24 hours';
 ELSE
  SELECT count(*) FILTER(WHERE created_at>now()-interval '1 hour'),count(*) INTO hour_count,day_count
  FROM public.product_sandbox_runs WHERE actor_id=identity AND created_at>now()-interval '24 hours';
 END IF;
 IF hour_count>=40 OR day_count>=200 THEN RAISE EXCEPTION 'AI run quota exceeded'; END IF;
 RETURN NEW;
END $$;

-- supabase/migrations/029_product_private_content_and_sandbox.sql statement 11
CREATE TRIGGER product_limit_ai_run BEFORE INSERT ON public.rebuild_runs FOR EACH ROW EXECUTE PROCEDURE public.product_limit_ai_run();

-- supabase/migrations/029_product_private_content_and_sandbox.sql statement 12
CREATE TRIGGER product_limit_sandbox_run BEFORE INSERT ON public.product_sandbox_runs FOR EACH ROW EXECUTE PROCEDURE public.product_limit_ai_run();

-- supabase/migrations/029_product_private_content_and_sandbox.sql statement 13
REVOKE ALL PRIVILEGES ON FUNCTION public.product_limit_ai_run () FROM PUBLIC, anon, authenticated;

-- supabase/migrations/030_product_sop_ingestion.sql statement 2
CREATE TABLE public.product_sop_contributions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES public.users, request_id uuid NOT NULL, class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons, document_id uuid REFERENCES public.rebuild_sop_documents, title text NOT NULL CHECK (length(btrim(title)) BETWEEN 2 AND 160), content text NOT NULL CHECK (length(content) BETWEEN 1 AND 100000), metadata jsonb NOT NULL, chunks jsonb NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')), version_id uuid REFERENCES public.rebuild_sop_versions, reviewed_by uuid REFERENCES public.users, review_reason text, indexing_claim uuid, indexed_chunks jsonb, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (actor_id, request_id));

-- supabase/migrations/030_product_sop_ingestion.sql statement 3
CREATE TABLE public.product_sop_chunks (version_id uuid NOT NULL REFERENCES public.rebuild_sop_versions, position integer NOT NULL CHECK (position BETWEEN 1 AND 60), page integer, content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000), embedding jsonb NOT NULL CHECK (jsonb_typeof(embedding) = 'array' AND jsonb_array_length(embedding) = 768), model text NOT NULL DEFAULT 'gemini-embedding-001', indexed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (version_id, position));

-- supabase/migrations/030_product_sop_ingestion.sql statement 4
DO $$ DECLARE item text; BEGIN
 FOREACH item IN ARRAY ARRAY['product_sop_contributions','product_sop_chunks'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',item);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',item);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',item);
 END LOOP;
END $$;

-- supabase/migrations/030_product_sop_ingestion.sql statement 5
CREATE FUNCTION public.product_publish_contribution(p_contribution uuid, p_chunks jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE source public.product_sop_contributions;version_id uuid;
BEGIN
 SELECT * INTO STRICT source FROM public.product_sop_contributions WHERE id=p_contribution FOR UPDATE;
 IF NOT public.product_can_manage(source.class_id) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF source.status='published' THEN RETURN source.version_id; END IF;
 IF source.status<>'pending' THEN RAISE EXCEPTION 'Contribution is not pending'; END IF;
 IF jsonb_typeof(p_chunks) IS DISTINCT FROM 'array' OR jsonb_array_length(p_chunks)<>jsonb_array_length(source.chunks) THEN RAISE EXCEPTION 'Chunk count mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_chunks) c WHERE jsonb_typeof(c->'embedding') IS DISTINCT FROM 'array' OR jsonb_array_length(c->'embedding')<>768 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(source.chunks) s WHERE s->>'position'=c->>'position' AND s->>'content'=c->>'content' AND s->'page' IS NOT DISTINCT FROM c->'page')) THEN RAISE EXCEPTION 'Indexed source mismatch'; END IF;
 version_id:=public.rebuild_publish_sop(source.class_id,source.document_id,source.title,source.content,source.lesson_id);
 INSERT INTO public.product_sop_chunks(version_id,position,page,content,embedding)
 SELECT version_id,(c->>'position')::integer,(c->>'page')::integer,c->>'content',c->'embedding' FROM jsonb_array_elements(p_chunks) c;
 UPDATE public.product_sop_contributions SET status='published',version_id=product_publish_contribution.version_id,reviewed_by=public.current_user_id() WHERE id=p_contribution;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(source.class_id,public.current_user_id(),'sop.publish',source.title||' / '||version_id);
 RETURN version_id;
END $$;

-- supabase/migrations/030_product_sop_ingestion.sql statement 6
REVOKE ALL PRIVILEGES ON FUNCTION public.product_publish_contribution (uuid, jsonb) FROM PUBLIC, anon;

-- supabase/migrations/030_product_sop_ingestion.sql statement 7
GRANT EXECUTE ON FUNCTION public.product_publish_contribution (uuid, jsonb) TO authenticated;

-- supabase/migrations/031_product_sop_publish_fix.sql statement 2
CREATE OR REPLACE FUNCTION public.product_publish_contribution(p_contribution uuid, p_chunks jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE source public.product_sop_contributions;v_version_id uuid;
BEGIN
 SELECT * INTO STRICT source FROM public.product_sop_contributions WHERE id=p_contribution FOR UPDATE;
 IF NOT public.product_can_manage(source.class_id) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF source.status='published' THEN RETURN source.version_id; END IF;
 IF source.status<>'pending' THEN RAISE EXCEPTION 'Contribution is not pending'; END IF;
 IF jsonb_typeof(p_chunks) IS DISTINCT FROM 'array' OR jsonb_array_length(p_chunks)<>jsonb_array_length(source.chunks) THEN RAISE EXCEPTION 'Chunk count mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_chunks) c WHERE jsonb_typeof(c->'embedding') IS DISTINCT FROM 'array' OR jsonb_array_length(c->'embedding')<>768 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(source.chunks) s WHERE s->>'position'=c->>'position' AND s->>'content'=c->>'content' AND s->'page' IS NOT DISTINCT FROM c->'page')) THEN RAISE EXCEPTION 'Indexed source mismatch'; END IF;
 v_version_id:=public.rebuild_publish_sop(source.class_id,source.document_id,source.title,source.content,source.lesson_id);
 INSERT INTO public.product_sop_chunks(version_id,position,page,content,embedding)
 SELECT v_version_id,(c->>'position')::integer,(c->>'page')::integer,c->>'content',c->'embedding' FROM jsonb_array_elements(p_chunks) c;
 UPDATE public.product_sop_contributions SET status='published',version_id=v_version_id,reviewed_by=public.current_user_id() WHERE id=p_contribution;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(source.class_id,public.current_user_id(),'sop.publish',source.title||' / '||v_version_id);
 RETURN v_version_id;
END $$;

-- supabase/migrations/032_product_analytics_governance_and_sync.sql statement 2
CREATE TABLE public.product_domains (client_id uuid NOT NULL REFERENCES public.clients, domain text NOT NULL CHECK (domain ~ '^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$'), active boolean NOT NULL DEFAULT TRUE, updated_by uuid NOT NULL REFERENCES public.users, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (client_id, domain));

-- supabase/migrations/032_product_analytics_governance_and_sync.sql statement 3
CREATE TABLE public.product_sync_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), connection_id uuid NOT NULL REFERENCES public.product_sheet_connections, class_id uuid NOT NULL REFERENCES public.classes, actor_id uuid NOT NULL REFERENCES public.users, request_id uuid NOT NULL, status text NOT NULL CHECK (status IN ('running', 'success', 'failed')), processed integer, result jsonb, error_code text, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, UNIQUE (actor_id, request_id));

-- supabase/migrations/032_product_analytics_governance_and_sync.sql statement 4
CREATE TABLE public.product_governance_config (id boolean PRIMARY KEY DEFAULT TRUE CHECK (id), config jsonb NOT NULL DEFAULT CAST('{}' AS jsonb), revision integer NOT NULL DEFAULT 1, updated_by uuid NOT NULL REFERENCES public.users, updated_at timestamptz NOT NULL DEFAULT now());

-- supabase/migrations/032_product_analytics_governance_and_sync.sql statement 5
DO $$ DECLARE item text; BEGIN FOREACH item IN ARRAY ARRAY['product_domains','product_sync_logs','product_governance_config'] LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',item);EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',item);EXECUTE format('GRANT ALL ON public.%I TO service_role',item);END LOOP;END $$;

-- supabase/migrations/032_product_analytics_governance_and_sync.sql statement 6
CREATE FUNCTION public.product_analytics(p_classes uuid[], p_start timestamptz, p_end timestamptz) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
 WITH attempts AS(SELECT * FROM public.prompt_attempts WHERE class_id=ANY(p_classes) AND created_at>=p_start AND created_at<p_end),
 scored AS(SELECT *,row_number() OVER(PARTITION BY class_id,learner_id,lesson_ref_id ORDER BY created_at,id) first_rank,row_number() OVER(PARTITION BY class_id,learner_id,lesson_ref_id ORDER BY created_at DESC,id DESC) last_rank,count(*) OVER(PARTITION BY class_id,learner_id,lesson_ref_id) scored_count FROM attempts WHERE evaluation_json IS NOT NULL),
 cohorts AS(SELECT c.id,c.department,c.class_code,co.title,c.client_id FROM public.classes c JOIN public.courses co ON co.id=c.course_id WHERE c.id=ANY(p_classes)),
 totals AS(SELECT c.id,c.department,c.class_code,c.title,
 (SELECT count(*) FROM public.enrollments e WHERE e.class_id=c.id AND e.status IN ('active','completed')) enrolled,
 (SELECT count(*) FROM attempts a WHERE a.class_id=c.id) attempts,
 (SELECT avg((a.evaluation_json->>'total')::numeric) FROM scored a WHERE a.class_id=c.id) average_score,
 (SELECT count(*) FROM public.enrollments e WHERE e.class_id=c.id AND e.status IN ('active','completed') AND EXISTS(SELECT 1 FROM public.classes cl JOIN public.course_modules m ON m.course_id=cl.course_id JOIN public.lessons l ON l.module_id=m.id WHERE cl.id=c.id AND m.status='published' AND l.status='published') AND NOT EXISTS(SELECT 1 FROM public.classes cl JOIN public.course_modules m ON m.course_id=cl.course_id JOIN public.lessons l ON l.module_id=m.id WHERE cl.id=c.id AND m.status='published' AND l.status='published' AND NOT EXISTS(SELECT 1 FROM public.lesson_progress lp WHERE lp.class_id=c.id AND lp.learner_id=e.learner_id AND lp.lesson_id=l.id AND lp.status='completed'))) completed
 FROM cohorts c)
 SELECT jsonb_build_object('enrolled',coalesce((SELECT sum(enrolled) FROM totals),0),'completed',coalesce((SELECT sum(completed) FROM totals),0),'attempts',(SELECT count(*) FROM attempts),'evaluated',(SELECT count(*) FROM scored),'average_score',(SELECT avg((evaluation_json->>'total')::numeric) FROM scored),'pre_score',(SELECT avg((evaluation_json->>'total')::numeric) FROM scored WHERE first_rank=1 AND scored_count>1),'post_score',(SELECT avg((evaluation_json->>'total')::numeric) FROM scored WHERE last_rank=1 AND scored_count>1),'paired_tasks',(SELECT count(*) FROM scored WHERE first_rank=1 AND scored_count>1),'classes',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM totals t),'[]'::jsonb),'techniques',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM(SELECT a.lesson_ref_id,l.title,count(*) evaluated,avg((a.evaluation_json->>'total')::numeric) average_score FROM scored a JOIN public.lessons l ON l.id=a.lesson_ref_id GROUP BY a.lesson_ref_id,l.title)t),'[]'::jsonb),'hours_saved',NULL,'annual_roi',NULL);
$$;

-- supabase/migrations/032_product_analytics_governance_and_sync.sql statement 7
REVOKE ALL PRIVILEGES ON FUNCTION public.product_analytics (uuid[], timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

-- supabase/migrations/032_product_analytics_governance_and_sync.sql statement 8
GRANT EXECUTE ON FUNCTION public.product_analytics (uuid[], timestamptz, timestamptz) TO service_role;

-- supabase/migrations/032_product_analytics_governance_and_sync.sql statement 9
CREATE FUNCTION public.product_set_class_access(p_class uuid, p_email text, p_role text, p_permission text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE uid uuid;course uuid;existing_role text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'System administrator required'; END IF;
 IF p_email IS NULL OR p_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR p_role IS NULL OR p_role NOT IN ('instructor','head') OR p_permission IS NULL OR p_permission NOT IN ('owner','editor','viewer') THEN RAISE EXCEPTION 'Invalid access grant'; END IF;
 SELECT course_id INTO STRICT course FROM public.classes WHERE id=p_class;
 INSERT INTO public.users(email,full_name,role) VALUES(lower(btrim(p_email)),'',p_role) ON CONFLICT(email) DO NOTHING;
 SELECT id,role INTO STRICT uid,existing_role FROM public.users WHERE email=lower(btrim(p_email)) FOR UPDATE;
 IF existing_role NOT IN (p_role,'admin') THEN RAISE EXCEPTION 'Existing role conflicts with requested access'; END IF;
 IF p_role='instructor' THEN INSERT INTO public.course_instructors(course_id,user_id,permission) VALUES(course,uid,p_permission) ON CONFLICT(course_id,user_id) DO UPDATE SET permission=excluded.permission;
 ELSE INSERT INTO public.product_class_grants(user_id,class_id,permission) VALUES(uid,p_class,'head') ON CONFLICT(user_id,class_id) DO UPDATE SET permission='head'; END IF;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'access.grant',p_role||' / '||uid||' / '||p_permission);
 RETURN uid;
END $$;

-- supabase/migrations/032_product_analytics_governance_and_sync.sql statement 10
REVOKE ALL PRIVILEGES ON FUNCTION public.product_set_class_access (uuid, text, text, text) FROM PUBLIC, anon;

-- supabase/migrations/032_product_analytics_governance_and_sync.sql statement 11
GRANT EXECUTE ON FUNCTION public.product_set_class_access (uuid, text, text, text) TO authenticated;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 2
CREATE FUNCTION public.product_can_read_class(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.users u JOIN public.classes c ON c.id=p_class WHERE u.id=public.current_user_id()
 AND (u.role='admin' OR public.rebuild_can_teach(c.id) OR EXISTS(SELECT 1 FROM public.product_class_grants g WHERE g.user_id=u.id AND g.class_id=c.id) OR EXISTS(SELECT 1 FROM public.learners l JOIN public.enrollments e ON e.learner_id=l.id WHERE l.user_id=u.id AND e.class_id=c.id AND e.status IN ('active','completed')))
 AND (u.role='admin' OR NOT EXISTS(SELECT 1 FROM public.product_domains d WHERE d.client_id=c.client_id) OR EXISTS(SELECT 1 FROM public.product_domains d WHERE d.client_id=c.client_id AND d.active AND d.domain=split_part(u.email,'@',2))));
$$;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 3
CREATE FUNCTION public.product_can_read_course(p_course uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
 SELECT EXISTS(SELECT 1 FROM public.classes c WHERE c.course_id=p_course AND public.product_can_read_class(c.id));
$$;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 4
CREATE FUNCTION public.product_can_read_lesson(p_lesson uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
 SELECT EXISTS(SELECT 1 FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id WHERE l.id=p_lesson AND public.product_can_read_course(m.course_id) AND ((l.status='published' AND m.status='published') OR EXISTS(SELECT 1 FROM public.classes c WHERE c.course_id=m.course_id AND public.rebuild_can_teach(c.id) AND public.product_can_read_class(c.id))));
$$;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 5
CREATE FUNCTION public.product_can_read_user(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
 SELECT p_user=public.current_user_id() OR EXISTS(SELECT 1 FROM public.users u WHERE u.id=public.current_user_id() AND u.role='admin') OR EXISTS(SELECT 1 FROM public.learners l JOIN public.enrollments e ON e.learner_id=l.id WHERE l.user_id=p_user AND public.rebuild_can_teach(e.class_id) AND public.product_can_read_class(e.class_id));
$$;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 6
DO $$ DECLARE policy record;BEGIN
 FOR policy IN SELECT tablename,policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('clients','courses','classes','users','learners','enrollments','course_modules','lessons','lesson_resources','lesson_rubric_criteria','course_instructors','prompt_attempts') AND cmd IN ('SELECT','ALL') LOOP EXECUTE format('DROP POLICY %I ON public.%I',policy.policyname,policy.tablename);END LOOP;
END $$;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 7
CREATE POLICY product_scoped_read ON public.clients AS PERMISSIVE FOR select TO authenticated USING (EXISTS (SELECT 1 FROM public.classes AS c WHERE c.client_id = clients.id AND public.product_can_read_class(c.id)));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 8
CREATE POLICY product_scoped_read ON public.courses AS PERMISSIVE FOR select TO authenticated USING (public.product_can_read_course(id));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 9
CREATE POLICY product_scoped_read ON public.classes AS PERMISSIVE FOR select TO authenticated USING (public.product_can_read_class(id));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 10
CREATE POLICY product_scoped_read ON public.users AS PERMISSIVE FOR select TO authenticated USING (public.product_can_read_user(id));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 11
CREATE POLICY product_scoped_read ON public.learners AS PERMISSIVE FOR select TO authenticated USING (public.product_can_read_user(user_id));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 12
CREATE POLICY product_scoped_read ON public.enrollments AS PERMISSIVE FOR select TO authenticated USING (public.product_can_read_class(class_id) AND (public.rebuild_can_teach(class_id) OR EXISTS (SELECT 1 FROM public.learners AS l WHERE l.id = enrollments.learner_id AND l.user_id = public.current_user_id())));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 13
CREATE POLICY product_scoped_read ON public.course_modules AS PERMISSIVE FOR select TO authenticated USING (public.product_can_read_course(course_id) AND (status = 'published' OR EXISTS (SELECT 1 FROM public.classes AS c WHERE c.course_id = course_modules.course_id AND public.rebuild_can_teach(c.id))));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 14
CREATE POLICY product_scoped_read ON public.lessons AS PERMISSIVE FOR select TO authenticated USING (public.product_can_read_lesson(id));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 15
CREATE POLICY product_scoped_read ON public.lesson_resources AS PERMISSIVE FOR select TO authenticated USING (public.product_can_read_lesson(lesson_id));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 16
CREATE POLICY product_scoped_read ON public.lesson_rubric_criteria AS PERMISSIVE FOR select TO authenticated USING (public.product_can_read_lesson(lesson_id));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 17
CREATE POLICY product_scoped_read ON public.course_instructors AS PERMISSIVE FOR select TO authenticated USING (user_id = public.current_user_id() OR EXISTS (SELECT 1 FROM public.users AS u WHERE u.id = public.current_user_id() AND u.role = 'admin'));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 18
CREATE POLICY product_scoped_read ON public.prompt_attempts AS PERMISSIVE FOR select TO authenticated USING (public.product_can_read_class(class_id) AND (public.rebuild_can_teach(class_id) OR EXISTS (SELECT 1 FROM public.learners AS l WHERE l.id = prompt_attempts.learner_id AND l.user_id = public.current_user_id())));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 19
REVOKE INSERT, UPDATE, DELETE ON TABLE public.clients, public.courses, public.classes, public.users, public.learners, public.enrollments, public.course_modules, public.lessons, public.lesson_resources, public.lesson_rubric_criteria, public.course_instructors FROM authenticated;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 20
ALTER POLICY hint_send ON public.trainer_hints WITH CHECK (trainer_id = public.current_user_id() AND public.rebuild_can_manage_class(class_id) AND public.product_can_read_class(class_id) AND EXISTS (SELECT 1 FROM public.enrollments AS e WHERE e.learner_id = trainer_hints.learner_id AND e.class_id = trainer_hints.class_id AND e.status = 'active'));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 21
CREATE TABLE public.product_request_budgets (actor_id uuid NOT NULL REFERENCES public.users, operation text NOT NULL, bucket timestamptz NOT NULL, count integer NOT NULL, PRIMARY KEY (actor_id, operation, bucket));

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 22
ALTER TABLE public.product_request_budgets ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 23
REVOKE ALL PRIVILEGES ON TABLE public.product_request_budgets FROM PUBLIC, anon, authenticated;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 24
GRANT ALL PRIVILEGES ON TABLE public.product_request_budgets TO service_role;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 25
CREATE FUNCTION public.product_take_budget(p_actor uuid, p_operation text, p_limit integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE used integer;BEGIN
 IF p_limit NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Invalid budget';END IF;
 INSERT INTO public.product_request_budgets(actor_id,operation,bucket,count) VALUES(p_actor,p_operation,date_trunc('hour',now()),1) ON CONFLICT(actor_id,operation,bucket) DO UPDATE SET count=product_request_budgets.count+1 RETURNING count INTO used;
 RETURN used<=p_limit;
END $$;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 26
REVOKE ALL PRIVILEGES ON FUNCTION public.product_take_budget (uuid, text, integer) FROM PUBLIC, anon, authenticated;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 27
GRANT EXECUTE ON FUNCTION public.product_take_budget (uuid, text, integer) TO service_role;

-- supabase/migrations/033_product_scoped_rls_and_budgets.sql statement 28
DO $$ DECLARE signature regprocedure;BEGIN
 FOREACH signature IN ARRAY ARRAY['public.product_can_read_class(uuid)'::regprocedure,'public.product_can_read_course(uuid)'::regprocedure,'public.product_can_read_lesson(uuid)'::regprocedure,'public.product_can_read_user(uuid)'::regprocedure] LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon',signature);EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',signature);END LOOP;
END $$;

-- supabase/migrations/034_product_drafts_and_rpc_scope.sql statement 2
CREATE OR REPLACE FUNCTION public.rebuild_can_manage_class(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
 SELECT public.product_can_read_class(p_class) AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=public.current_user_id()
 AND (u.role='admin' OR EXISTS(SELECT 1 FROM public.classes c JOIN public.course_instructors ci ON ci.course_id=c.course_id WHERE c.id=p_class AND ci.user_id=u.id AND ci.permission IN ('owner','editor'))));
$$;

-- supabase/migrations/034_product_drafts_and_rpc_scope.sql statement 3
CREATE OR REPLACE FUNCTION public.product_can_manage(p_class uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$ SELECT public.rebuild_can_manage_class(p_class); $$;

-- supabase/migrations/034_product_drafts_and_rpc_scope.sql statement 4
DO $$ DECLARE signature regprocedure;definition text;BEGIN
 FOREACH signature IN ARRAY ARRAY['public.rebuild_class_attempts(uuid)'::regprocedure,'public.rebuild_class_analytics(uuid)'::regprocedure,'public.rebuild_class_sops(uuid,uuid)'::regprocedure,'public.rebuild_sop_lesson_options(uuid)'::regprocedure,'public.rebuild_workshop_inbox(uuid)'::regprocedure] LOOP
  definition:=pg_get_functiondef(signature);
  EXECUTE regexp_replace(definition,'BEGIN',E'BEGIN\n IF NOT public.product_can_read_class(p_class) THEN RAISE EXCEPTION ''Class access required''; END IF;');
 END LOOP;
END $$;

-- supabase/migrations/034_product_drafts_and_rpc_scope.sql statement 5
ALTER POLICY hint_read ON public.trainer_hints USING (public.product_can_read_class(class_id) AND (public.rebuild_can_teach(class_id) OR EXISTS (SELECT 1 FROM public.learners AS l INNER JOIN public.enrollments AS e ON e.learner_id = l.id WHERE l.id = trainer_hints.learner_id AND l.user_id = public.current_user_id() AND e.class_id = trainer_hints.class_id AND e.status = 'active')));

-- supabase/migrations/034_product_drafts_and_rpc_scope.sql statement 6
ALTER POLICY workshop_message_read ON public.workshop_messages USING (public.product_can_read_class(class_id));

-- supabase/migrations/034_product_drafts_and_rpc_scope.sql statement 7
CREATE TABLE public.product_prompt_drafts (user_id uuid NOT NULL REFERENCES public.users, class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons, prompt text NOT NULL CHECK (length(prompt) <= 24000), revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, class_id, lesson_id));

-- supabase/migrations/034_product_drafts_and_rpc_scope.sql statement 8
ALTER TABLE public.product_prompt_drafts ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/034_product_drafts_and_rpc_scope.sql statement 9
REVOKE ALL PRIVILEGES ON TABLE public.product_prompt_drafts FROM PUBLIC, anon, authenticated;

-- supabase/migrations/034_product_drafts_and_rpc_scope.sql statement 10
GRANT ALL PRIVILEGES ON TABLE public.product_prompt_drafts TO service_role;

-- supabase/migrations/034_product_drafts_and_rpc_scope.sql statement 11
CREATE FUNCTION public.product_save_draft(p_class uuid, p_lesson uuid, p_prompt text, p_expected_revision integer) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE prior integer;BEGIN
 IF NOT public.product_can_read_class(p_class) OR NOT public.product_can_read_lesson(p_lesson) OR NOT public.lesson_belongs_to_class(p_lesson,p_class) THEN RAISE EXCEPTION 'Lesson scope required';END IF;
 IF p_prompt IS NULL OR length(p_prompt)>24000 THEN RAISE EXCEPTION 'Invalid draft';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(public.current_user_id()::text||p_class::text||p_lesson::text,919));
 SELECT revision INTO prior FROM public.product_prompt_drafts WHERE user_id=public.current_user_id() AND class_id=p_class AND lesson_id=p_lesson FOR UPDATE;
 IF coalesce(prior,0) IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'Draft revision conflict';END IF;
 INSERT INTO public.product_prompt_drafts(user_id,class_id,lesson_id,prompt,revision) VALUES(public.current_user_id(),p_class,p_lesson,p_prompt,coalesce(prior,0)+1) ON CONFLICT(user_id,class_id,lesson_id) DO UPDATE SET prompt=excluded.prompt,revision=excluded.revision,updated_at=now();
 RETURN coalesce(prior,0)+1;
END $$;

-- supabase/migrations/034_product_drafts_and_rpc_scope.sql statement 12
REVOKE ALL PRIVILEGES ON FUNCTION public.product_save_draft (uuid, uuid, text, integer) FROM PUBLIC, anon;

-- supabase/migrations/034_product_drafts_and_rpc_scope.sql statement 13
GRANT EXECUTE ON FUNCTION public.product_save_draft (uuid, uuid, text, integer) TO authenticated;

-- supabase/migrations/035_product_weighted_completion.sql statement 2
ALTER TABLE public.prompt_attempts ADD COLUMN production_pass_threshold numeric CHECK (production_pass_threshold BETWEEN 0 AND 10);

-- supabase/migrations/035_product_weighted_completion.sql statement 3
CREATE FUNCTION public.product_capture_attempt_threshold() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE threshold numeric;
BEGIN
 SELECT coalesce((snapshot->>'production_pass_threshold')::numeric,8) INTO threshold FROM public.rebuild_runs
 WHERE subject=auth.uid() AND request_id=nullif(current_setting('promptify.request_id',true),'')::uuid
 AND class_id=NEW.class_id AND lesson_id=NEW.lesson_ref_id;
 NEW.production_pass_threshold:=threshold;
 RETURN NEW;
END $$;

-- supabase/migrations/035_product_weighted_completion.sql statement 4
REVOKE ALL PRIVILEGES ON FUNCTION public.product_capture_attempt_threshold () FROM PUBLIC, anon, authenticated;

-- supabase/migrations/035_product_weighted_completion.sql statement 5
CREATE TRIGGER product_attempt_threshold BEFORE INSERT ON public.prompt_attempts FOR EACH ROW EXECUTE PROCEDURE public.product_capture_attempt_threshold();

-- supabase/migrations/035_product_weighted_completion.sql statement 6
DO $$ DECLARE definition text; BEGIN
 definition:=pg_get_functiondef('public.rebuild_finish_run(uuid,uuid,jsonb)'::regprocedure);
 definition:=replace(definition,'saved:=public.record_prompt_attempt_and_progress', 'PERFORM set_config(''promptify.request_id'',p_request::text,true); saved:=public.record_prompt_attempt_and_progress');
 IF position('promptify.request_id' in definition)=0 THEN RAISE EXCEPTION 'Unexpected finish-run definition'; END IF;
 EXECUTE definition;
END $$;

-- supabase/migrations/035_product_weighted_completion.sql statement 7
CREATE OR REPLACE FUNCTION public.sync_lesson_progress_from_prompt_attempt() RETURNS trigger AS $$
DECLARE
  canonical_lesson_id UUID;
  candidate_count INTEGER;
  valid_score NUMERIC;
  event_time TIMESTAMPTZ;
  passed BOOLEAN;
BEGIN
  SELECT
    count(DISTINCT l.id),
    (array_agg(DISTINCT l.id ORDER BY l.id))[1]
  INTO candidate_count, canonical_lesson_id
  FROM public.classes c
  JOIN public.course_modules m ON m.course_id = c.course_id
  JOIN public.lessons l ON l.module_id = m.id
  WHERE c.id = NEW.class_id
    AND (
      (NEW.lesson_ref_id IS NOT NULL AND l.id = NEW.lesson_ref_id)
      OR (
        NEW.lesson_ref_id IS NULL
        AND NEW.lesson_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND l.id = CASE
          WHEN NEW.lesson_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN NEW.lesson_id::UUID ELSE NULL END
      )
      OR (NEW.lesson_ref_id IS NULL AND l.lesson_key = NEW.lesson_id)
    );

  IF candidate_count <> 1 OR canonical_lesson_id IS NULL THEN
    RAISE EXCEPTION 'Prompt attempt cannot be mapped to exactly one lesson in its class course.';
  END IF;

  valid_score := public.valid_evaluation_total(NEW.evaluation_json);
  passed := NEW.production_pass_threshold IS NULL OR coalesce(valid_score >= NEW.production_pass_threshold, false);

  IF TG_OP = 'INSERT' THEN
    event_time := coalesce(NEW.created_at, now());
    INSERT INTO public.lesson_progress (
      learner_id, class_id, lesson_id, status, attempts_count, best_score,
      last_attempt_id, started_at, completed_at, updated_at
    ) VALUES (
      NEW.learner_id, NEW.class_id, canonical_lesson_id, CASE WHEN passed THEN 'completed' ELSE 'in_progress' END, 1, valid_score,
      NEW.id, event_time, CASE WHEN passed THEN event_time ELSE NULL END, event_time
    )
    ON CONFLICT (learner_id, class_id, lesson_id) DO UPDATE SET
      status = CASE WHEN passed OR public.lesson_progress.status = 'completed' THEN 'completed' ELSE 'in_progress' END,
      attempts_count = public.lesson_progress.attempts_count + 1,
      best_score = CASE
        WHEN valid_score IS NULL THEN public.lesson_progress.best_score
        WHEN public.lesson_progress.best_score IS NULL THEN valid_score
        ELSE greatest(public.lesson_progress.best_score, valid_score)
      END,
      last_attempt_id = NEW.id,
      started_at = coalesce(public.lesson_progress.started_at, event_time),
      completed_at = coalesce(public.lesson_progress.completed_at, CASE WHEN passed THEN event_time ELSE NULL END),
      updated_at = event_time;
  ELSIF TG_OP = 'UPDATE' AND NEW.evaluation_json IS DISTINCT FROM OLD.evaluation_json THEN
    UPDATE public.lesson_progress lp
    SET status = CASE WHEN passed OR lp.status = 'completed' THEN 'completed' ELSE 'in_progress' END,
        completed_at = coalesce(lp.completed_at, CASE WHEN passed THEN now() ELSE NULL END),
        best_score = CASE
          WHEN valid_score IS NULL THEN lp.best_score
          WHEN lp.best_score IS NULL THEN valid_score
          ELSE greatest(lp.best_score, valid_score)
        END,
        updated_at = now()
    WHERE lp.learner_id = NEW.learner_id
      AND lp.class_id = NEW.class_id
      AND lp.lesson_id = canonical_lesson_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Canonical lesson progress is missing for updated prompt attempt.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp';

-- supabase/migrations/036_product_enterprise_requests.sql statement 2
CREATE TABLE public.product_enterprise_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL UNIQUE, company text NOT NULL CHECK (length(company) BETWEEN 2 AND 200), tax_id text NOT NULL DEFAULT '' CHECK (length(tax_id) <= 80), employees text NOT NULL CHECK (employees IN ('50 - 200 staff', '200 - 1,000 staff', '1,000+ staff')), email text NOT NULL CHECK (length(email) <= 254), status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed')), created_at timestamptz NOT NULL DEFAULT now());

-- supabase/migrations/036_product_enterprise_requests.sql statement 3
ALTER TABLE public.product_enterprise_requests ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/036_product_enterprise_requests.sql statement 4
REVOKE ALL PRIVILEGES ON TABLE public.product_enterprise_requests FROM PUBLIC, anon, authenticated;

-- supabase/migrations/036_product_enterprise_requests.sql statement 5
GRANT ALL PRIVILEGES ON TABLE public.product_enterprise_requests TO service_role;

-- supabase/migrations/036_product_enterprise_requests.sql statement 6
CREATE INDEX product_enterprise_email_time ON public.product_enterprise_requests (email, created_at);

-- supabase/migrations/036_product_enterprise_requests.sql statement 7
CREATE FUNCTION public.product_submit_enterprise_request(p_request uuid, p_company text, p_tax text, p_employees text, p_email text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE saved uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(lower(p_email)));
 SELECT id INTO saved FROM product_enterprise_requests WHERE request_id=p_request AND email=lower(p_email);
 IF saved IS NOT NULL THEN RETURN jsonb_build_object('saved',true); END IF;
 IF EXISTS(SELECT 1 FROM product_enterprise_requests WHERE email=lower(p_email) AND created_at>now()-interval '24 hours') THEN
  RETURN jsonb_build_object('saved',true);
 END IF;
 INSERT INTO product_enterprise_requests(request_id,company,tax_id,employees,email)
 VALUES(p_request,btrim(p_company),btrim(p_tax),p_employees,lower(p_email));
 RETURN jsonb_build_object('saved',true);
END $$;

-- supabase/migrations/036_product_enterprise_requests.sql statement 8
REVOKE ALL PRIVILEGES ON FUNCTION public.product_submit_enterprise_request (uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- supabase/migrations/036_product_enterprise_requests.sql statement 9
GRANT EXECUTE ON FUNCTION public.product_submit_enterprise_request (uuid, text, text, text, text) TO service_role;

-- supabase/migrations/038_product_roster_worker.sql statement 2
ALTER TABLE public.product_sheet_connections ADD COLUMN auto_sync boolean NOT NULL DEFAULT FALSE;

-- supabase/migrations/038_product_roster_worker.sql statement 3
ALTER TABLE public.product_sheet_connections ADD COLUMN last_attempt_at timestamptz;

-- supabase/migrations/038_product_roster_worker.sql statement 4
CREATE FUNCTION public.product_claim_roster_sync() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE conn public.product_sheet_connections; log_id uuid; request_id uuid:=gen_random_uuid();
BEGIN
 UPDATE public.product_sync_logs SET status='failed',error_code='worker_timeout',finished_at=now()
 WHERE status='running' AND created_at<now()-interval '5 minutes';
 SELECT s.* INTO conn FROM public.product_sheet_connections s JOIN public.classes c ON c.id=s.class_id
 JOIN public.users u ON u.id=s.created_by
 WHERE s.auto_sync AND c.status IN ('active','upcoming') AND u.auth_provider_id IS NOT NULL
 AND coalesce(s.last_attempt_at,s.last_synced_at,'epoch'::timestamptz)<now()-interval '15 minutes'
 AND NOT EXISTS(SELECT 1 FROM public.product_sync_logs l WHERE l.connection_id=s.id AND l.status='running')
 ORDER BY coalesce(s.last_attempt_at,s.last_synced_at,'epoch'::timestamptz),s.id
 LIMIT 1 FOR UPDATE OF s SKIP LOCKED;
 IF conn.id IS NULL THEN RETURN NULL; END IF;
 UPDATE public.product_sheet_connections SET last_attempt_at=now() WHERE id=conn.id;
 INSERT INTO public.product_sync_logs(connection_id,class_id,actor_id,request_id,status)
 VALUES(conn.id,conn.class_id,conn.created_by,request_id,'running') RETURNING id INTO log_id;
 RETURN jsonb_build_object('logId',log_id,'sheetId',conn.sheet_id,'mapping',conn.column_mapping,
 'department',(SELECT department FROM public.classes WHERE id=conn.class_id));
END $$;

-- supabase/migrations/038_product_roster_worker.sql statement 5
CREATE FUNCTION public.product_finish_roster_sync(p_log uuid, p_rows jsonb, p_error text = NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE entry public.product_sync_logs; subject uuid; imported jsonb;
BEGIN
 SELECT * INTO STRICT entry FROM public.product_sync_logs WHERE id=p_log FOR UPDATE;
 IF entry.status<>'running' THEN RETURN entry.result; END IF;
 IF p_error IS NOT NULL THEN
  UPDATE public.product_sync_logs SET status='failed',error_code=left(p_error,80),finished_at=now() WHERE id=p_log;
  RETURN jsonb_build_object('status','failed');
 END IF;
 SELECT auth_provider_id INTO STRICT subject FROM public.users WHERE id=entry.actor_id;
 IF subject IS NULL THEN RAISE EXCEPTION 'Verified connection owner required'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',subject,'role','authenticated')::text,true);
 -- Preserve the existing editor, department, active-class and domain checks.
 imported:=public.product_import_roster(entry.class_id,entry.request_id,p_rows);
 UPDATE public.product_sheet_connections SET status='synced',last_synced_at=now() WHERE id=entry.connection_id;
 UPDATE public.product_sync_logs SET status='success',processed=(imported->>'processed')::integer,
 result=imported,finished_at=now() WHERE id=p_log;
 RETURN imported;
END $$;

-- supabase/migrations/038_product_roster_worker.sql statement 6
CREATE FUNCTION public.product_set_sheet_auto_sync(p_class uuid, p_connection uuid, p_enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 UPDATE public.product_sheet_connections SET auto_sync=p_enabled,created_by=public.current_user_id(),last_attempt_at=NULL
 WHERE id=p_connection AND class_id=p_class;
 IF NOT FOUND THEN RAISE EXCEPTION 'Scoped connection required'; END IF;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason)
 VALUES(p_class,public.current_user_id(),'roster.auto_sync',p_connection||' / '||p_enabled);
END $$;

-- supabase/migrations/038_product_roster_worker.sql statement 7
REVOKE ALL PRIVILEGES ON FUNCTION public.product_claim_roster_sync (), public.product_finish_roster_sync (uuid, jsonb, text) FROM PUBLIC, anon, authenticated;

-- supabase/migrations/038_product_roster_worker.sql statement 8
GRANT EXECUTE ON FUNCTION public.product_claim_roster_sync (), public.product_finish_roster_sync (uuid, jsonb, text) TO service_role;

-- supabase/migrations/038_product_roster_worker.sql statement 9
REVOKE ALL PRIVILEGES ON FUNCTION public.product_set_sheet_auto_sync (uuid, uuid, boolean) FROM PUBLIC, anon;

-- supabase/migrations/038_product_roster_worker.sql statement 10
GRANT EXECUTE ON FUNCTION public.product_set_sheet_auto_sync (uuid, uuid, boolean) TO authenticated;

-- supabase/migrations/039_product_roster_scheduler.sql statement 4
CREATE TABLE public.product_worker_invocations (nonce uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());

-- supabase/migrations/039_product_roster_scheduler.sql statement 5
ALTER TABLE public.product_worker_invocations ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/039_product_roster_scheduler.sql statement 6
REVOKE ALL PRIVILEGES ON TABLE public.product_worker_invocations FROM PUBLIC, anon, authenticated;

-- supabase/migrations/039_product_roster_scheduler.sql statement 7
GRANT ALL PRIVILEGES ON TABLE public.product_worker_invocations TO service_role;

-- supabase/migrations/039_product_roster_scheduler.sql statement 8
CREATE FUNCTION public.product_accept_worker_invocation(p_nonce uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE affected integer;
BEGIN
 DELETE FROM public.product_worker_invocations WHERE created_at<now()-interval '7 days';
 INSERT INTO public.product_worker_invocations(nonce) VALUES(p_nonce) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN affected=1;
END $$;

-- supabase/migrations/039_product_roster_scheduler.sql statement 9
REVOKE ALL PRIVILEGES ON FUNCTION public.product_accept_worker_invocation (uuid) FROM PUBLIC, anon, authenticated;

-- supabase/migrations/039_product_roster_scheduler.sql statement 10
GRANT EXECUTE ON FUNCTION public.product_accept_worker_invocation (uuid) TO service_role;

-- supabase/migrations/040_product_public_basic.sql statement 3
CREATE FUNCTION public.product_enroll_basic(p_subject uuid, p_email text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE person public.users; learner uuid; cohort uuid;
BEGIN
 IF p_subject IS NULL OR p_email IS NULL OR p_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Verified identity required'; END IF;
 SELECT c.id INTO STRICT cohort FROM public.classes c JOIN public.courses co ON co.id=c.course_id
 WHERE co.slug='promptify-public-basic' AND c.status='active' AND c.enrollment_mode='self_enroll';
 INSERT INTO public.users(email,full_name,role,auth_provider_id) VALUES(lower(btrim(p_email)),'','learner',p_subject::text) ON CONFLICT(email) DO NOTHING;
 SELECT * INTO STRICT person FROM public.users WHERE email=lower(btrim(p_email)) FOR UPDATE;
 IF person.auth_provider_id IS NOT NULL AND person.auth_provider_id<>p_subject::text THEN RAISE EXCEPTION 'Identity conflict'; END IF;
 IF person.role<>'learner' THEN RAISE EXCEPTION 'A learner account is required for Basic enrollment'; END IF;
 UPDATE public.users SET auth_provider_id=p_subject::text WHERE id=person.id AND auth_provider_id IS NULL;
 INSERT INTO public.learners(user_id) VALUES(person.id) ON CONFLICT(user_id) DO NOTHING;
 SELECT id INTO STRICT learner FROM public.learners WHERE user_id=person.id;
 INSERT INTO public.enrollments(class_id,learner_id,status) VALUES(cohort,learner,'active') ON CONFLICT(class_id,learner_id) DO NOTHING;
 RETURN cohort;
END $$;

-- supabase/migrations/040_product_public_basic.sql statement 4
REVOKE ALL PRIVILEGES ON FUNCTION public.product_enroll_basic (uuid, text) FROM PUBLIC, anon, authenticated;

-- supabase/migrations/040_product_public_basic.sql statement 5
GRANT EXECUTE ON FUNCTION public.product_enroll_basic (uuid, text) TO service_role;

-- supabase/migrations/040_product_public_basic.sql statement 6
CREATE FUNCTION public.product_limit_basic_run() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE count_today integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.courses co ON co.id=c.course_id WHERE c.id=NEW.class_id AND co.slug='promptify-public-basic') THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.subject::text,918));
 IF EXISTS(SELECT 1 FROM public.rebuild_runs WHERE subject=NEW.subject AND request_id=NEW.request_id) THEN RETURN NEW; END IF;
 SELECT count(*) INTO count_today FROM public.rebuild_runs r JOIN public.classes c ON c.id=r.class_id JOIN public.courses co ON co.id=c.course_id
 WHERE r.subject=NEW.subject AND co.slug='promptify-public-basic' AND r.created_at>=date_trunc('day',now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh';
 IF count_today>=10 THEN RAISE EXCEPTION 'Basic daily execution quota exceeded'; END IF;
 RETURN NEW;
END $$;

-- supabase/migrations/040_product_public_basic.sql statement 7
REVOKE ALL PRIVILEGES ON FUNCTION public.product_limit_basic_run () FROM PUBLIC, anon, authenticated;

-- supabase/migrations/040_product_public_basic.sql statement 8
CREATE TRIGGER product_basic_quota BEFORE INSERT ON public.rebuild_runs FOR EACH ROW EXECUTE PROCEDURE public.product_limit_basic_run();

-- supabase/migrations/042_product_awards_and_attendance.sql statement 2
CREATE TABLE public.product_attendance (class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons, learner_id uuid NOT NULL REFERENCES public.learners, present boolean NOT NULL, recorded_by uuid NOT NULL REFERENCES public.users, reason text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (class_id, lesson_id, learner_id));

-- supabase/migrations/042_product_awards_and_attendance.sql statement 3
CREATE TABLE public.product_awards (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons, learner_id uuid NOT NULL REFERENCES public.learners, award_key text NOT NULL, kind text NOT NULL CHECK (kind IN ('badge', 'certificate')), title text NOT NULL, issuer text NOT NULL, evidence jsonb NOT NULL, issued_at timestamptz NOT NULL DEFAULT now(), UNIQUE (class_id, lesson_id, learner_id, award_key));

-- supabase/migrations/042_product_awards_and_attendance.sql statement 4
ALTER TABLE public.product_attendance ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/042_product_awards_and_attendance.sql statement 5
ALTER TABLE public.product_awards ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/042_product_awards_and_attendance.sql statement 6
REVOKE ALL PRIVILEGES ON TABLE public.product_attendance, public.product_awards FROM PUBLIC, anon, authenticated;

-- supabase/migrations/042_product_awards_and_attendance.sql statement 7
GRANT ALL PRIVILEGES ON TABLE public.product_attendance, public.product_awards TO service_role;

-- supabase/migrations/042_product_awards_and_attendance.sql statement 8
CREATE FUNCTION public.product_refresh_awards(p_class uuid, p_learner uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE setting record; badge jsonb; scores jsonb; score numeric; completed integer; required integer; average_score numeric;
 minimum_score numeric; needs_attendance boolean; attendance_count integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_class::text||p_learner::text,942));
 IF NOT EXISTS(SELECT 1 FROM public.enrollments WHERE class_id=p_class AND learner_id=p_learner AND status IN ('active','completed')) THEN RETURN; END IF;
 SELECT jsonb_object_agg(lesson_id::text,best),count(*),avg(best) INTO scores,completed,average_score FROM(
 SELECT a.lesson_ref_id lesson_id,max(public.valid_evaluation_total(a.evaluation_json)) best FROM public.prompt_attempts a
 JOIN public.lessons l ON l.id=a.lesson_ref_id JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id AND c.id=a.class_id
 WHERE a.class_id=p_class AND a.learner_id=p_learner AND a.production_pass_threshold IS NOT NULL
 AND public.valid_evaluation_total(a.evaluation_json)>=a.production_pass_threshold AND l.status='published' AND m.status='published'
 GROUP BY a.lesson_ref_id) passed;
 SELECT count(*) INTO required FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id WHERE c.id=p_class AND l.status='published' AND m.status='published';
 SELECT count(*) INTO attendance_count FROM public.product_attendance a JOIN public.lessons l ON l.id=a.lesson_id JOIN public.course_modules m ON m.id=l.module_id JOIN public.classes c ON c.course_id=m.course_id AND c.id=a.class_id
 WHERE a.class_id=p_class AND a.learner_id=p_learner AND a.present AND l.status='published' AND m.status='published';
 FOR setting IN SELECT s.lesson_id,s.config FROM public.product_studio s JOIN public.lessons l ON l.id=s.lesson_id WHERE s.class_id=p_class AND l.status='published' LOOP
  score:=(scores->>setting.lesson_id::text)::numeric;
  IF coalesce(setting.config#>>'{awards,issuance,badgeOnPass}','false')='true' AND score IS NOT NULL THEN
   FOR badge IN SELECT value FROM jsonb_array_elements(coalesce(setting.config#>'{awards,badges}','[]')) LOOP
    IF badge->>'status'='ACTIVE' AND length(btrim(coalesce(badge->>'name','')))>0 AND length(coalesce(badge->>'id',''))>0 THEN
     INSERT INTO public.product_awards(class_id,lesson_id,learner_id,award_key,kind,title,issuer,evidence)
     VALUES(p_class,setting.lesson_id,p_learner,'badge:'||(badge->>'id'),'badge',badge->>'name','Promptify',
     jsonb_build_object('rule','passed_lesson','score',score,'studio_revision',(SELECT revision FROM public.product_studio WHERE class_id=p_class AND lesson_id=setting.lesson_id))) ON CONFLICT DO NOTHING;
    END IF;
   END LOOP;
  END IF;
  minimum_score:=coalesce((setting.config#>>'{awards,issuance,minimumAverageScore}')::numeric,8);
  needs_attendance:=coalesce((setting.config#>>'{awards,issuance,requireAttendance}')::boolean,true);
  IF coalesce(setting.config#>>'{awards,issuance,certificateOnCompletion}','false')='true' AND required>0 AND completed=required
   AND average_score>=minimum_score AND (NOT needs_attendance OR attendance_count=required)
   AND length(btrim(coalesce(setting.config#>>'{awards,certificate,title}','')))>0
   AND length(btrim(coalesce(setting.config#>>'{awards,certificate,issuer}','')))>0 THEN
   INSERT INTO public.product_awards(class_id,lesson_id,learner_id,award_key,kind,title,issuer,evidence)
   VALUES(p_class,setting.lesson_id,p_learner,'certificate','certificate',setting.config#>>'{awards,certificate,title}',setting.config#>>'{awards,certificate,issuer}',
   jsonb_build_object('rule','completed_published_course','completed_lessons',completed,'average_score',average_score,
   'minimum_average_score',minimum_score,'attendance_required',needs_attendance,'attendance_count',attendance_count,'lesson_scores',scores)) ON CONFLICT DO NOTHING;
  END IF;
 END LOOP;
END $$;

-- supabase/migrations/042_product_awards_and_attendance.sql statement 9
CREATE FUNCTION public.product_awards_after_attempt() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN IF NEW.production_pass_threshold IS NOT NULL AND NEW.evaluation_json IS NOT NULL THEN PERFORM public.product_refresh_awards(NEW.class_id,NEW.learner_id); END IF; RETURN NEW; END $$;

-- supabase/migrations/042_product_awards_and_attendance.sql statement 10
CREATE TRIGGER product_awards_after_attempt AFTER INSERT OR UPDATE OF evaluation_json ON public.prompt_attempts FOR EACH ROW EXECUTE PROCEDURE public.product_awards_after_attempt();

-- supabase/migrations/042_product_awards_and_attendance.sql statement 11
CREATE FUNCTION public.product_record_attendance(p_class uuid, p_lesson uuid, p_learner uuid, p_present boolean, p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF NOT public.product_can_manage(p_class) OR p_present IS NULL OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 2 AND 500 THEN RAISE EXCEPTION 'Assigned editor and attendance reason required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.enrollments e JOIN public.classes c ON c.id=e.class_id JOIN public.course_modules m ON m.course_id=c.course_id JOIN public.lessons l ON l.module_id=m.id WHERE e.class_id=p_class AND e.learner_id=p_learner AND e.status IN ('active','completed') AND l.id=p_lesson) THEN RAISE EXCEPTION 'Attendance scope denied'; END IF;
 INSERT INTO public.product_attendance(class_id,lesson_id,learner_id,present,recorded_by,reason) VALUES(p_class,p_lesson,p_learner,p_present,public.current_user_id(),btrim(p_reason))
 ON CONFLICT(class_id,lesson_id,learner_id) DO UPDATE SET present=excluded.present,reason=excluded.reason,recorded_by=excluded.recorded_by,updated_at=now();
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'attendance.record',p_learner||' / '||p_lesson||' / '||p_present||' / '||btrim(p_reason));
 PERFORM public.product_refresh_awards(p_class,p_learner);
END $$;

-- supabase/migrations/042_product_awards_and_attendance.sql statement 12
REVOKE ALL PRIVILEGES ON FUNCTION public.product_refresh_awards (uuid, uuid), public.product_awards_after_attempt () FROM PUBLIC, anon, authenticated;

-- supabase/migrations/042_product_awards_and_attendance.sql statement 13
GRANT EXECUTE ON FUNCTION public.product_refresh_awards (uuid, uuid) TO service_role;

-- supabase/migrations/042_product_awards_and_attendance.sql statement 14
REVOKE ALL PRIVILEGES ON FUNCTION public.product_record_attendance (uuid, uuid, uuid, boolean, text) FROM PUBLIC, anon;

-- supabase/migrations/042_product_awards_and_attendance.sql statement 15
GRANT EXECUTE ON FUNCTION public.product_record_attendance (uuid, uuid, uuid, boolean, text) TO authenticated;

-- supabase/migrations/043_product_studio_deep_validation.sql statement 2
CREATE FUNCTION public.product_validate_studio_config() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp' AS $$
DECLARE cfg jsonb:=NEW.config; field text; row jsonb; rule jsonb;
BEGIN
 IF jsonb_typeof(cfg) IS DISTINCT FROM 'object' OR octet_length(cfg::text)>300000 THEN RAISE EXCEPTION 'Invalid Studio configuration size'; END IF;
 FOREACH field IN ARRAY ARRAY['pillar','branch','competencies','startTime','endTime'] LOOP
  IF jsonb_typeof(cfg->field) IS DISTINCT FROM 'string' OR length(cfg->>field)>20000 THEN RAISE EXCEPTION 'Invalid Studio text field'; END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['departments','objectives','variables','scaffold','materials'] LOOP
  IF jsonb_typeof(cfg->field) IS DISTINCT FROM 'array' OR jsonb_array_length(cfg->field)>100 THEN RAISE EXCEPTION 'Invalid Studio array'; END IF;
  FOR row IN SELECT value FROM jsonb_array_elements(cfg->field) LOOP
   IF field IN ('departments','objectives') THEN
    IF jsonb_typeof(row) IS DISTINCT FROM 'string' OR length(row#>>'{}')>2000 THEN RAISE EXCEPTION 'Invalid Studio list item'; END IF;
   ELSE
    IF jsonb_typeof(row) IS DISTINCT FROM 'object' OR octet_length(row::text)>100000 THEN RAISE EXCEPTION 'Invalid Studio object'; END IF;
    IF field='scaffold' AND jsonb_typeof(row->'active') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid scaffold state'; END IF;
   END IF;
  END LOOP;
 END LOOP;
 IF jsonb_typeof(cfg->'awards') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid award settings'; END IF;
 IF cfg#>'{awards,passThreshold}' IS NOT NULL AND (jsonb_typeof(cfg#>'{awards,passThreshold}')<>'number' OR (cfg#>>'{awards,passThreshold}')::numeric NOT BETWEEN 0 AND 10) THEN RAISE EXCEPTION 'Invalid passing threshold'; END IF;
 rule:=cfg#>'{awards,issuance}';
 IF rule IS NOT NULL THEN
  IF jsonb_typeof(rule)<>'object' OR jsonb_typeof(rule->'minimumAverageScore') IS DISTINCT FROM 'number' OR (rule->>'minimumAverageScore')::numeric NOT BETWEEN 0 AND 10 THEN RAISE EXCEPTION 'Invalid award score rule'; END IF;
  FOREACH field IN ARRAY ARRAY['badgeOnPass','certificateOnCompletion','requireAttendance'] LOOP
   IF jsonb_typeof(rule->field) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid award rule'; END IF;
  END LOOP;
 END IF;
 FOREACH field IN ARRAY ARRAY['badges','gamificationLinks'] LOOP
  IF cfg#>ARRAY['awards',field] IS NOT NULL THEN
   IF jsonb_typeof(cfg#>ARRAY['awards',field])<>'array' OR jsonb_array_length(cfg#>ARRAY['awards',field])>100 THEN RAISE EXCEPTION 'Invalid award list'; END IF;
   FOR row IN SELECT value FROM jsonb_array_elements(cfg#>ARRAY['awards',field]) LOOP
    IF jsonb_typeof(row)<>'object' OR EXISTS(SELECT 1 FROM jsonb_each(row) entry WHERE jsonb_typeof(entry.value)<>'string' OR length(entry.value#>>'{}')>20000) THEN RAISE EXCEPTION 'Invalid award list item'; END IF;
   END LOOP;
  END IF;
 END LOOP;
 IF cfg#>'{awards,certificate}' IS NOT NULL AND (jsonb_typeof(cfg#>'{awards,certificate}')<>'object' OR EXISTS(SELECT 1 FROM jsonb_each(cfg#>'{awards,certificate}') entry WHERE jsonb_typeof(entry.value)<>'string' OR length(entry.value#>>'{}')>20000)) THEN RAISE EXCEPTION 'Invalid certificate settings'; END IF;
 RETURN NEW;
END $$;

-- supabase/migrations/043_product_studio_deep_validation.sql statement 3
REVOKE ALL PRIVILEGES ON FUNCTION public.product_validate_studio_config () FROM PUBLIC, anon, authenticated;

-- supabase/migrations/043_product_studio_deep_validation.sql statement 4
CREATE TRIGGER product_validate_studio_config BEFORE INSERT OR UPDATE ON public.product_studio FOR EACH ROW EXECUTE PROCEDURE public.product_validate_studio_config();

-- supabase/migrations/044_product_atomic_policies.sql statement 2
CREATE FUNCTION public.product_save_class(p_class uuid, p_status text, p_reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF NOT public.product_can_manage(p_class) THEN RAISE EXCEPTION 'Assigned editor required'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('active','upcoming','completed','archived') OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Valid lifecycle and audit reason required'; END IF;
 UPDATE public.classes SET status=p_status WHERE id=p_class;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'cohort.lifecycle',btrim(p_reason));
END $$;

-- supabase/migrations/044_product_atomic_policies.sql statement 3
CREATE FUNCTION public.product_save_domain(p_class uuid, p_domain text, p_active boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE client uuid; normalized text:=lower(btrim(p_domain));
BEGIN
 IF NOT public.product_can_manage(p_class) OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'Administrator required'; END IF;
 IF normalized IS NULL OR length(normalized)>253 OR normalized !~ '^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$' OR p_active IS NULL THEN RAISE EXCEPTION 'Valid domain policy required'; END IF;
 SELECT client_id INTO STRICT client FROM public.classes WHERE id=p_class;
 INSERT INTO public.product_domains(client_id,domain,active,updated_by,updated_at) VALUES(client,normalized,p_active,public.current_user_id(),now()) ON CONFLICT(client_id,domain) DO UPDATE SET active=excluded.active,updated_by=excluded.updated_by,updated_at=now();
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'domain.policy',normalized||' / '||CASE WHEN p_active THEN 'active' ELSE 'disabled' END);
END $$;

-- supabase/migrations/044_product_atomic_policies.sql statement 4
CREATE FUNCTION public.product_validate_studio_nested() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp' AS $$
DECLARE field text; expected text; row jsonb; entry record;
BEGIN
 FOREACH field IN ARRAY ARRAY['variables','scaffold','materials'] LOOP
  FOR row IN SELECT value FROM jsonb_array_elements(NEW.config->field) LOOP
   FOREACH expected IN ARRAY CASE field WHEN 'variables' THEN ARRAY['name','type','sample','mappedTo'] WHEN 'scaffold' THEN ARRAY['id','name','tag','rubricKey'] ELSE ARRAY['id','type','name','url','version','updated','log'] END LOOP
    IF jsonb_typeof(row->expected) IS DISTINCT FROM 'string' OR length(row->>expected)>20000 THEN RAISE EXCEPTION 'Invalid Studio nested field'; END IF;
   END LOOP;
   IF field='materials' AND coalesce(row->>'url','')<>'' AND row->>'url' !~ '^https?://[^[:space:]]+$' THEN RAISE EXCEPTION 'Invalid material URL'; END IF;
  END LOOP;
 END LOOP;
 IF NEW.config#>'{awards,gamificationLinks}' IS NOT NULL THEN
  FOR row IN SELECT value FROM jsonb_array_elements(NEW.config#>'{awards,gamificationLinks}') LOOP
   IF coalesce(row->>'url','')<>'' AND row->>'url' !~ '^https?://[^[:space:]]+$' THEN RAISE EXCEPTION 'Invalid game URL'; END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;

-- supabase/migrations/044_product_atomic_policies.sql statement 5
CREATE TRIGGER product_validate_studio_nested BEFORE INSERT OR UPDATE ON public.product_studio FOR EACH ROW EXECUTE PROCEDURE public.product_validate_studio_nested();

-- supabase/migrations/044_product_atomic_policies.sql statement 6
REVOKE ALL PRIVILEGES ON FUNCTION public.product_save_class (uuid, text, text), public.product_save_domain (uuid, text, boolean), public.product_validate_studio_nested () FROM PUBLIC, anon;

-- supabase/migrations/044_product_atomic_policies.sql statement 7
GRANT EXECUTE ON FUNCTION public.product_save_class (uuid, text, text), public.product_save_domain (uuid, text, boolean) TO authenticated;

-- supabase/migrations/045_product_rotation_approvals.sql statement 2
CREATE TABLE public.product_rotation_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes, provider text NOT NULL CHECK (provider IN ('gemini', 'sheets')), source_fingerprint text NOT NULL CHECK (source_fingerprint ~ '^[a-f0-9]{64}$'), requested_by uuid NOT NULL REFERENCES public.users, reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 1000), status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'applied', 'cancelled')), created_at timestamptz NOT NULL DEFAULT now(), applied_at timestamptz, deployment_id text);

-- supabase/migrations/045_product_rotation_approvals.sql statement 3
CREATE TABLE public.product_rotation_approvals (request_id uuid NOT NULL REFERENCES public.product_rotation_requests, user_id uuid NOT NULL REFERENCES public.users, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (request_id, user_id));

-- supabase/migrations/045_product_rotation_approvals.sql statement 4
ALTER TABLE public.product_rotation_requests ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/045_product_rotation_approvals.sql statement 5
ALTER TABLE public.product_rotation_approvals ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/045_product_rotation_approvals.sql statement 6
REVOKE ALL PRIVILEGES ON TABLE public.product_rotation_requests, public.product_rotation_approvals FROM PUBLIC, anon, authenticated;

-- supabase/migrations/045_product_rotation_approvals.sql statement 7
GRANT ALL PRIVILEGES ON TABLE public.product_rotation_requests, public.product_rotation_approvals TO service_role;

-- supabase/migrations/045_product_rotation_approvals.sql statement 8
CREATE FUNCTION public.product_request_rotation(p_class uuid, p_provider text, p_fingerprint text, p_reason text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$ DECLARE request uuid;BEGIN
 IF NOT public.product_can_manage(p_class) OR NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'Administrator required';END IF;
 INSERT INTO public.product_rotation_requests(class_id,provider,source_fingerprint,requested_by,reason) VALUES(p_class,p_provider,p_fingerprint,public.current_user_id(),p_reason) RETURNING id INTO request;
 INSERT INTO public.product_rotation_approvals(request_id,user_id) VALUES(request,public.current_user_id());
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(p_class,public.current_user_id(),'credential.rotation.request',p_provider||' / '||request);
 RETURN request;
END $$;

-- supabase/migrations/045_product_rotation_approvals.sql statement 9
CREATE FUNCTION public.product_approve_rotation(p_request uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$ DECLARE request public.product_rotation_requests;BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=public.current_user_id() AND role='admin') THEN RAISE EXCEPTION 'Administrator required';END IF;
 SELECT * INTO STRICT request FROM public.product_rotation_requests WHERE id=p_request FOR UPDATE;
 IF NOT public.product_can_manage(request.class_id) OR request.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'Rotation is not awaiting approval';END IF;
 INSERT INTO public.product_rotation_approvals(request_id,user_id) VALUES(p_request,public.current_user_id()) ON CONFLICT DO NOTHING;
 IF (SELECT count(*) FROM public.product_rotation_approvals WHERE request_id=p_request)>=2 THEN UPDATE public.product_rotation_requests SET status='approved' WHERE id=p_request RETURNING * INTO request; END IF;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(request.class_id,public.current_user_id(),'credential.rotation.approve',p_request::text);
 RETURN request.status;
END $$;

-- supabase/migrations/045_product_rotation_approvals.sql statement 10
REVOKE ALL PRIVILEGES ON FUNCTION public.product_request_rotation (uuid, text, text, text), public.product_approve_rotation (uuid) FROM PUBLIC, anon;

-- supabase/migrations/045_product_rotation_approvals.sql statement 11
GRANT EXECUTE ON FUNCTION public.product_request_rotation (uuid, text, text, text), public.product_approve_rotation (uuid) TO authenticated;

-- supabase/migrations/046_product_isolated_trial_curriculum.sql statement 3
CREATE OR REPLACE FUNCTION public.product_limit_basic_run() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE count_today integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.classes c JOIN public.courses co ON co.id=c.course_id WHERE c.id=NEW.class_id AND co.slug IN ('promptify-public-basic','intrepid-trial-basic')) THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.subject::text,918));
 IF EXISTS(SELECT 1 FROM public.rebuild_runs WHERE subject=NEW.subject AND request_id=NEW.request_id) THEN RETURN NEW; END IF;
 SELECT count(*) INTO count_today FROM public.rebuild_runs r JOIN public.classes c ON c.id=r.class_id JOIN public.courses co ON co.id=c.course_id
 WHERE r.subject=NEW.subject AND co.slug IN ('promptify-public-basic','intrepid-trial-basic') AND r.created_at>=date_trunc('day',now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh';
 IF count_today>=10 THEN RAISE EXCEPTION 'Basic daily execution quota exceeded'; END IF;
 RETURN NEW;
END $$;

-- supabase/migrations/047_product_rotation_application_audit.sql statement 2
CREATE FUNCTION public.product_finish_rotation(p_request uuid, p_fingerprint text, p_deployment text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
DECLARE request public.product_rotation_requests;
BEGIN
 IF coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Operator service role required'; END IF;
 IF p_deployment !~ '^https://promptify-rebuild-[a-z0-9-]+[.]vercel[.]app$' THEN RAISE EXCEPTION 'Verified deployment URL required'; END IF;
 SELECT * INTO STRICT request FROM public.product_rotation_requests WHERE id=p_request FOR UPDATE;
 IF request.status<>'approved' OR request.source_fingerprint<>p_fingerprint OR (SELECT count(DISTINCT user_id) FROM public.product_rotation_approvals WHERE request_id=p_request)<2 THEN RAISE EXCEPTION 'Two current approvals required'; END IF;
 UPDATE public.product_rotation_requests SET status='applied',applied_at=now(),deployment_id=p_deployment WHERE id=p_request;
 INSERT INTO public.product_audit(class_id,actor_id,action,reason) VALUES(request.class_id,request.requested_by,'credential.rotation.applied',p_request::text||' / '||p_deployment);
END $$;

-- supabase/migrations/047_product_rotation_application_audit.sql statement 3
REVOKE ALL PRIVILEGES ON FUNCTION public.product_finish_rotation (uuid, text, text) FROM PUBLIC, anon, authenticated;

-- supabase/migrations/047_product_rotation_application_audit.sql statement 4
GRANT EXECUTE ON FUNCTION public.product_finish_rotation (uuid, text, text) TO service_role;

-- supabase/migrations/048_learner_prompt_library.sql statement 2
CREATE TABLE public.product_prompt_library (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES public.users, class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons, attempt_id uuid REFERENCES public.prompt_attempts, request_id uuid NOT NULL, title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200), prompt text NOT NULL CHECK (length(prompt) BETWEEN 1 AND 24000), settings jsonb NOT NULL DEFAULT '{}', variables jsonb NOT NULL DEFAULT '[]', score numeric, status text NOT NULL DEFAULT 'personal' CHECK (status IN ('personal', 'pending', 'approved', 'rejected')), reviewed_by uuid REFERENCES public.users, review_reason text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (owner_id, request_id));

-- supabase/migrations/048_learner_prompt_library.sql statement 3
ALTER TABLE public.product_prompt_library ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/048_learner_prompt_library.sql statement 4
REVOKE ALL PRIVILEGES ON TABLE public.product_prompt_library FROM PUBLIC, anon, authenticated;

-- supabase/migrations/048_learner_prompt_library.sql statement 5
GRANT ALL PRIVILEGES ON TABLE public.product_prompt_library TO service_role;

-- supabase/migrations/048_learner_prompt_library.sql statement 6
CREATE TABLE public.product_learner_context (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES public.users, class_id uuid NOT NULL REFERENCES public.classes, lesson_id uuid NOT NULL REFERENCES public.lessons, title text NOT NULL, content text NOT NULL CHECK (length(content) BETWEEN 1 AND 100000), content_hash text NOT NULL, UNIQUE (owner_id, class_id, lesson_id, content_hash), chunks jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

-- supabase/migrations/048_learner_prompt_library.sql statement 7
ALTER TABLE public.product_learner_context ENABLE ROW LEVEL SECURITY ;

-- supabase/migrations/048_learner_prompt_library.sql statement 8
REVOKE ALL PRIVILEGES ON TABLE public.product_learner_context FROM PUBLIC, anon, authenticated;

-- supabase/migrations/048_learner_prompt_library.sql statement 9
GRANT ALL PRIVILEGES ON TABLE public.product_learner_context TO service_role;

-- supabase/migrations/048_learner_prompt_library.sql statement 10
ALTER TABLE public.product_learner_support ADD COLUMN reflection text;

-- supabase/migrations/048_learner_prompt_library.sql statement 11
CREATE FUNCTION public.product_unlock_support_reflected(p_class uuid, p_lesson uuid, p_kind text, p_reflection text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$
BEGIN
 IF p_kind='solution' AND (p_reflection IS NULL OR length(btrim(p_reflection))<20 OR length(p_reflection)>1000) THEN RAISE EXCEPTION 'Reflection required'; END IF;
 PERFORM public.product_unlock_support(p_class,p_lesson,p_kind);
 IF p_kind='solution' THEN UPDATE public.product_learner_support SET reflection=btrim(p_reflection) WHERE learner_id=(SELECT id FROM public.learners WHERE user_id=public.current_user_id()) AND class_id=p_class AND lesson_id=p_lesson AND kind=p_kind; END IF;
END $$;

-- supabase/migrations/048_learner_prompt_library.sql statement 12
REVOKE ALL PRIVILEGES ON FUNCTION public.product_unlock_support (uuid, uuid, text) FROM authenticated;

-- supabase/migrations/048_learner_prompt_library.sql statement 13
REVOKE ALL PRIVILEGES ON FUNCTION public.product_unlock_support_reflected (uuid, uuid, text, text) FROM PUBLIC, anon;

-- supabase/migrations/048_learner_prompt_library.sql statement 14
GRANT EXECUTE ON FUNCTION public.product_unlock_support_reflected (uuid, uuid, text, text) TO authenticated;

-- supabase/migrations/049_learner_library_category_and_replay.sql statement 2
ALTER TABLE public.product_prompt_library ADD COLUMN category text NOT NULL DEFAULT 'General' CHECK (length(btrim(category)) BETWEEN 1 AND 160);

-- supabase/migrations/049_learner_library_category_and_replay.sql statement 3
CREATE OR REPLACE FUNCTION public.rebuild_begin_run(p_subject uuid, p_class uuid, p_lesson uuid, p_request uuid, p_prompt text, p_snapshot jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $$

DECLARE r public.rebuild_runs; inserted integer;

BEGIN

 PERFORM set_config('request.jwt.claim.sub',p_subject::text,true);

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_subject,'role','authenticated')::text,true);

 IF NOT public.has_active_class_enrollment(p_class) OR NOT EXISTS (

 SELECT 1 FROM classes c JOIN courses co ON co.id=c.course_id JOIN course_modules m ON m.course_id=co.id JOIN lessons l ON l.module_id=m.id

 WHERE c.id=p_class AND l.id=p_lesson AND c.status='active' AND co.status='active' AND co.publication_status='published' AND m.status='published' AND l.status='published') THEN RAISE EXCEPTION 'Access denied'; END IF;

 INSERT INTO rebuild_runs(subject,request_id,class_id,lesson_id,prompt,snapshot) VALUES(p_subject,p_request,p_class,p_lesson,p_prompt,p_snapshot) ON CONFLICT DO NOTHING;

 GET DIAGNOSTICS inserted = ROW_COUNT;

 SELECT * INTO r FROM rebuild_runs WHERE subject=p_subject AND request_id=p_request FOR UPDATE;

 IF r.prompt<>p_prompt OR r.class_id<>p_class OR r.lesson_id<>p_lesson OR (r.snapshot->'generation_settings') IS DISTINCT FROM (p_snapshot->'generation_settings') OR (r.snapshot->'learner_context_ids') IS DISTINCT FROM (p_snapshot->'learner_context_ids') THEN RAISE EXCEPTION 'Request key conflict'; END IF;

 -- A processing request cannot be replayed into a second provider call.

 IF inserted=0 AND r.result IS NULL THEN RAISE EXCEPTION 'Request processing or uncertain; inspect before retry'; END IF;

 RETURN jsonb_build_object('result',r.result);

END $$;
-- Cloud adaptation: backend-only trusted-service policies (NOT learner policies).
-- No browser, analyst, instructor or learner may receive service_role membership.
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT schemaname,tablename FROM pg_tables WHERE schemaname='public' LOOP
  EXECUTE format('CREATE POLICY gcp_trusted_backend ON %I.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',t.schemaname,t.tablename);
 END LOOP;
END $$;
-- Supabase normally provisions trusted-service grants outside repo migrations.
-- Recreate that backend-only capability explicitly; no BYPASSRLS required.
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
-- Prevent default PUBLIC function execution; explicit source role grants remain.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA auth FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
-- Identity adapter table: preserve business UUIDs and old auth UUID subjects.
-- external_subject is opaque text; never cast a Firebase/Google subject to UUID.
CREATE TABLE public.gcp_identity_bindings (
 issuer text NOT NULL, external_subject text NOT NULL,
 user_id uuid NOT NULL REFERENCES public.users(id),
 legacy_subject uuid NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(issuer,external_subject), UNIQUE(user_id,issuer)
);
ALTER TABLE public.gcp_identity_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcp_identity_bindings FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.gcp_identity_bindings TO service_role;
CREATE POLICY gcp_identity_backend ON public.gcp_identity_bindings TO service_role USING(true) WITH CHECK(true);
