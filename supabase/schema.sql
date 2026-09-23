-- ==============================================================================
-- PROMPTIFY MVP DATABASE SCHEMA (PostgreSQL / Supabase)
-- ==============================================================================

-- 1. USERS TABLE
-- Lưu thông tin người dùng được xác thực (Google OAuth hoặc hệ thống)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'instructor', 'admin')),
  auth_provider_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CLIENTS TABLE
-- Doanh nghiệp hoặc tổ chức đối tác (VD: Agribank, Doanh nghiệp SME)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. COURSES TABLE
-- Khóa học/Nội dung đào tạo có thể tái sử dụng cho nhiều lớp
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CLASSES TABLE
-- Lớp học cụ thể: một lần triển khai Course cho một Client tại Department nhất định
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_code TEXT UNIQUE NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  department TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'completed', 'archived')),
  enrollment_mode TEXT NOT NULL DEFAULT 'instructor' CHECK (enrollment_mode IN ('instructor', 'self_enroll')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. LEARNERS TABLE & CODE SEQUENCE
-- Học viên có mã định danh kinh doanh duy nhất (LRN-000001, LRN-000002, ...)
CREATE SEQUENCE IF NOT EXISTS learner_code_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_learner_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'LRN-' || LPAD(nextval('learner_code_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS learners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_code TEXT UNIQUE NOT NULL DEFAULT generate_learner_code(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ENROLLMENTS TABLE
-- Quan hệ nhiều-nhiều giữa Learner và Class
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'removed', 'expired')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_learner_class UNIQUE (learner_id, class_id)
);

-- INDEXES CHO HIỆU NĂNG TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_classes_course ON classes(course_id);
CREATE INDEX IF NOT EXISTS idx_classes_client ON classes(client_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_learner ON enrollments(learner_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- TRIGGER TỰ ĐỘNG CẬP NHẬT updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_users ON users;
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_courses ON courses;
CREATE TRIGGER set_timestamp_courses
BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_enrollments ON enrollments;
CREATE TRIGGER set_timestamp_enrollments
BEFORE UPDATE ON enrollments
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- ==============================================================================
-- SEED DATA (Mẫu thực tế Agribank & Khối Doanh nghiệp)
-- ==============================================================================

-- 1. Thêm Users mẫu (1 Instructor, 3 Learners)
INSERT INTO users (id, email, full_name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'nam.nh@agribank.com.vn', 'Nguyễn Hoàng Nam', 'instructor'),
  ('00000000-0000-0000-0000-000000000002', 'linh.pham@agribank.com.vn', 'Linh Phạm', 'learner'),
  ('00000000-0000-0000-0000-000000000003', 'minh.tran@agribank.com.vn', 'Minh Trần', 'learner'),
  ('00000000-0000-0000-0000-000000000004', 'phuong.nguyen@enterprise.com', 'Phương Nguyễn', 'learner')
ON CONFLICT (email) DO NOTHING;

-- 2. Thêm Clients (Doanh nghiệp đối tác)
INSERT INTO clients (id, name, industry) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Agribank Việt Nam', 'Ngân hàng & Tài chính'),
  ('22222222-2222-2222-2222-222222222222', 'Enterprise Business Users', 'Doanh nghiệp & Dịch vụ')
ON CONFLICT DO NOTHING;

-- 3. Thêm Courses (Khóa đào tạo có thể tái sử dụng)
INSERT INTO courses (id, title, description, status, created_by) VALUES
  (
    '33333333-3333-3333-3333-333333333331',
    'Prompt Engineering for Business Users & Non-techs',
    'Chương trình chuẩn hóa kỹ năng điều khiển AI cho cán bộ văn phòng: Viết prompt có cấu trúc, trích xuất bảng Markdown và chống ảo giác.',
    'active',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    'AI Thẩm định & Phân tích Tín dụng Doanh nghiệp',
    'Ứng dụng Prompting trong tóm tắt hồ sơ vay vốn, phân tích báo cáo tài chính và trích xuất chỉ số rủi ro.',
    'active',
    '00000000-0000-0000-0000-000000000001'
  )
ON CONFLICT DO NOTHING;

-- 4. Thêm Classes (Triển khai cho từng Client & Phòng ban)
INSERT INTO classes (id, class_code, course_id, client_id, department, start_date, end_date, status) VALUES
  (
    '44444444-4444-4444-4444-444444444441',
    'AGRI-COMM-2026-01',
    '33333333-3333-3333-3333-333333333331',
    '11111111-1111-1111-1111-111111111111',
    'Ban Truyền thông & Thương hiệu',
    NOW() - INTERVAL '2 hours',
    NOW() + INTERVAL '6 hours',
    'active'
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    'AGRI-CREDIT-2026-02',
    '33333333-3333-3333-3333-333333333332',
    '11111111-1111-1111-1111-111111111111',
    'Khối Quản lý & Thẩm định Tín dụng',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '2 days',
    'active'
  ),
  (
    '44444444-4444-4444-4444-444444444443',
    'CORP-GEN-2026-03',
    '33333333-3333-3333-3333-333333333331',
    '22222222-2222-2222-2222-222222222222',
    'Văn phòng Tổng hợp & CSKH',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '3 days',
    'upcoming'
  )
ON CONFLICT (class_code) DO NOTHING;

-- 5. Thêm Learners (Mã LRN-000001, LRN-000002, ...)
INSERT INTO learners (id, learner_code, user_id) VALUES
  ('55555555-5555-5555-5555-555555555551', 'LRN-000001', '00000000-0000-0000-0000-000000000002'),
  ('55555555-5555-5555-5555-555555555552', 'LRN-000002', '00000000-0000-0000-0000-000000000003'),
  ('55555555-5555-5555-5555-555555555553', 'LRN-000003', '00000000-0000-0000-0000-000000000004')
ON CONFLICT (user_id) DO NOTHING;

-- 6. Thêm Enrollments (Ghi danh vào lớp)
INSERT INTO enrollments (id, learner_id, class_id, status) VALUES
  (
    '66666666-6666-6666-6666-666666666661',
    '55555555-5555-5555-5555-555555555551',
    '44444444-4444-4444-4444-444444444441',
    'active'
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '55555555-5555-5555-5555-555555555552',
    '44444444-4444-4444-4444-444444444442',
    'active'
  ),
  (
    '66666666-6666-6666-6666-666666666663',
    '55555555-5555-5555-5555-555555555553',
    '44444444-4444-4444-4444-444444444443',
    'active'
  )
ON CONFLICT (learner_id, class_id) DO NOTHING;

-- ==============================================================================
-- 7. THU HỒI TOÀN BỘ QUYỀN CỦA ROLE ANON (Không expose business data cho anon)
-- ==============================================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.learner_code_seq TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE 
  public.clients, 
  public.courses, 
  public.classes 
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE 
  public.users, 
  public.learners, 
  public.enrollments 
TO authenticated;

-- ==============================================================================
-- 8. HELPER FUNCTIONS CHO ROW LEVEL SECURITY (RLS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE (auth_provider_id = auth.uid()::text OR email = auth.jwt() ->> 'email')
      AND role IN ('instructor', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.users
  WHERE (auth_provider_id = auth.uid()::text OR email = auth.jwt() ->> 'email')
  LIMIT 1;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.is_instructor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_instructor() TO authenticated;

REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;

-- ==============================================================================
-- 9. TRIGGER CHỐNG PRIVILEGE ESCALATION TRÊN BẢNG users
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_user_privilege_escalation()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_check_user_privilege_escalation ON public.users;
CREATE TRIGGER trg_check_user_privilege_escalation
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE public.check_user_privilege_escalation();

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS CHO BẢNG USERS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile or instructor read all" ON users;
CREATE POLICY "Users can read own profile or instructor read all"
ON users FOR SELECT TO authenticated
USING (
  auth_provider_id = auth.uid()::text 
  OR email = auth.jwt() ->> 'email'
  OR public.is_instructor()
);

DROP POLICY IF EXISTS "Users can insert own profile or instructor insert" ON users;
CREATE POLICY "Users can insert own profile or instructor insert"
ON users FOR INSERT TO authenticated
WITH CHECK (
  (email = auth.jwt() ->> 'email' AND role = 'learner')
  OR public.is_instructor()
);

DROP POLICY IF EXISTS "Users can update own profile or instructor update" ON users;
CREATE POLICY "Users can update own profile or instructor update"
ON users FOR UPDATE TO authenticated
USING (
  auth_provider_id = auth.uid()::text 
  OR email = auth.jwt() ->> 'email'
  OR public.is_instructor()
)
WITH CHECK (
  public.is_instructor()
  OR (
    (auth_provider_id = auth.uid()::text OR email = auth.jwt() ->> 'email')
    AND role = 'learner'
  )
);

-- -----------------------------------------------------------------------------
-- RLS CHO BẢNG CLIENTS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Clients read by all" ON clients;
DROP POLICY IF EXISTS "Clients read by authenticated only" ON clients;
CREATE POLICY "Clients read by authenticated only"
ON clients FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Clients modified by instructors only" ON clients;
CREATE POLICY "Clients modified by instructors only"
ON clients FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

-- -----------------------------------------------------------------------------
-- RLS CHO BẢNG COURSES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Courses read active or instructor read all" ON courses;
CREATE POLICY "Courses read active or instructor read all"
ON courses FOR SELECT TO authenticated
USING (status = 'active' OR public.is_instructor());

DROP POLICY IF EXISTS "Courses modified by instructors only" ON courses;
CREATE POLICY "Courses modified by instructors only"
ON courses FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

-- -----------------------------------------------------------------------------
-- RLS CHO BẢNG CLASSES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Classes read active or enrolled or instructor" ON classes;
CREATE POLICY "Classes read active or enrolled or instructor"
ON classes FOR SELECT TO authenticated
USING (
  status = 'active' 
  OR public.is_instructor()
  OR EXISTS (
    SELECT 1 FROM enrollments e
    JOIN learners l ON l.id = e.learner_id
    WHERE e.class_id = classes.id AND l.user_id = public.current_user_id()
  )
);

DROP POLICY IF EXISTS "Classes modified by instructors only" ON classes;
CREATE POLICY "Classes modified by instructors only"
ON classes FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

-- -----------------------------------------------------------------------------
-- RLS CHO BẢNG LEARNERS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Learners read own record or instructor read all" ON learners;
CREATE POLICY "Learners read own record or instructor read all"
ON learners FOR SELECT TO authenticated
USING (
  user_id = public.current_user_id()
  OR public.is_instructor()
);

DROP POLICY IF EXISTS "Learners insert own record or instructor insert" ON learners;
CREATE POLICY "Learners insert own record or instructor insert"
ON learners FOR INSERT TO authenticated
WITH CHECK (
  user_id = public.current_user_id()
  OR public.is_instructor()
);

DROP POLICY IF EXISTS "Learners update by instructor" ON learners;
CREATE POLICY "Learners update by instructor"
ON learners FOR UPDATE TO authenticated
USING (public.is_instructor());

-- -----------------------------------------------------------------------------
-- RLS CHO BẢNG ENROLLMENTS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enrollments read own or instructor read all" ON enrollments;
CREATE POLICY "Enrollments read own or instructor read all"
ON enrollments FOR SELECT TO authenticated
USING (
  learner_id IN (SELECT id FROM learners WHERE user_id = public.current_user_id())
  OR public.is_instructor()
);

DROP POLICY IF EXISTS "Enrollments modified by instructors only" ON enrollments;
CREATE POLICY "Enrollments modified by instructors only"
ON enrollments FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

-- Tải lại PostgREST schema cache để áp dụng ngay lập tức
NOTIFY pgrst, 'reload schema';
