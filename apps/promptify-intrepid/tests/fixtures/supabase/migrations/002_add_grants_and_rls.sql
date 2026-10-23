-- ==============================================================================
-- MIGRATION: 002_add_grants_and_rls.sql
-- Mục đích: Security Hardening, Ngăn Privilege Escalation, Bảo mật RLS
-- Hoàn toàn IDEMPOTENT: Chạy an toàn trên database đã có sẵn bảng & seed data.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. THU HỒI TOÀN BỘ QUYỀN CỦA ROLE ANON (Không expose business data cho anon)
-- ------------------------------------------------------------------------------

-- Thu hồi toàn bộ quyền trên bảng, sequence và hàm của anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- Role anon chỉ có quyền kết nối schema nhưng KHÔNG được đọc/ghi bất kỳ bảng nào
GRANT USAGE ON SCHEMA public TO authenticated;

-- Role authenticated (đã đăng nhập) được cấp quyền gọi sequence và thao tác bảng
-- (Mọi thao tác đều bị kiểm soát nghiêm ngặt bởi RLS bên dưới)
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

-- ------------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS (SECURITY DEFINER + HARDENED SEARCH_PATH)
-- ------------------------------------------------------------------------------

-- Kiểm tra xem user hiện tại có phải là instructor / admin không
-- Cố định search_path = public, pg_temp để chống search_path hijacking
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

-- Lấy ID của user hiện tại trong bảng public.users
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

-- Chỉ cấp quyền execute cho authenticated, cấm hoàn toàn anon
REVOKE ALL ON FUNCTION public.is_instructor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_instructor() TO authenticated;

REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. BẢO VỆ CHỐNG PRIVILEGE ESCALATION BẰNG TRIGGER TRÊN BẢNG users
-- ------------------------------------------------------------------------------

-- Trigger ngăn chặn learner tự nâng quyền (đổi role, id, email, auth_provider_id)
CREATE OR REPLACE FUNCTION public.check_user_privilege_escalation()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_check_user_privilege_escalation ON public.users;
CREATE TRIGGER trg_check_user_privilege_escalation
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE public.check_user_privilege_escalation();

-- ------------------------------------------------------------------------------
-- 4. KÍCH HOẠT ROW LEVEL SECURITY (RLS) TRÊN CẢ 6 BẢNG
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. RLS POLICIES: users
-- ------------------------------------------------------------------------------

-- SELECT: Người dùng đã đăng nhập chỉ đọc profile của mình; Instructor đọc danh sách
DROP POLICY IF EXISTS "Users can read own profile or instructor read all" ON public.users;
CREATE POLICY "Users can read own profile or instructor read all"
ON public.users FOR SELECT TO authenticated
USING (
  auth_provider_id = auth.uid()::text 
  OR email = auth.jwt() ->> 'email'
  OR public.is_instructor()
);

-- INSERT: User mới đăng nhập chỉ được tạo với role='learner'; Instructor mới được tạo role khác
DROP POLICY IF EXISTS "Users can insert own profile or instructor insert" ON public.users;
CREATE POLICY "Users can insert own profile or instructor insert"
ON public.users FOR INSERT TO authenticated
WITH CHECK (
  (email = auth.jwt() ->> 'email' AND role = 'learner')
  OR public.is_instructor()
);

-- UPDATE: Learner chỉ cập nhật record của chính mình và role bắt buộc phải là 'learner'
DROP POLICY IF EXISTS "Users can update own profile or instructor update" ON public.users;
CREATE POLICY "Users can update own profile or instructor update"
ON public.users FOR UPDATE TO authenticated
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

-- ------------------------------------------------------------------------------
-- 6. RLS POLICIES: clients
-- ------------------------------------------------------------------------------

-- SELECT: Chỉ người dùng đã đăng nhập (authenticated) mới được đọc
DROP POLICY IF EXISTS "Clients read by all" ON public.clients;
DROP POLICY IF EXISTS "Clients read by authenticated only" ON public.clients;
CREATE POLICY "Clients read by authenticated only"
ON public.clients FOR SELECT TO authenticated
USING (true);

-- CUD: Chỉ Instructor mới được thêm/sửa/xóa client
DROP POLICY IF EXISTS "Clients modified by instructors only" ON public.clients;
CREATE POLICY "Clients modified by instructors only"
ON public.clients FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

-- ------------------------------------------------------------------------------
-- 7. RLS POLICIES: courses
-- ------------------------------------------------------------------------------

-- SELECT: Chỉ authenticated đọc khóa học active hoặc Instructor đọc toàn bộ
DROP POLICY IF EXISTS "Courses read active or instructor read all" ON public.courses;
CREATE POLICY "Courses read active or instructor read all"
ON public.courses FOR SELECT TO authenticated
USING (status = 'active' OR public.is_instructor());

-- CUD: Chỉ Instructor mới được thêm/sửa/archive khóa học
DROP POLICY IF EXISTS "Courses modified by instructors only" ON public.courses;
CREATE POLICY "Courses modified by instructors only"
ON public.courses FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

-- ------------------------------------------------------------------------------
-- 8. RLS POLICIES: classes
-- ------------------------------------------------------------------------------

-- SELECT: Authenticated đọc lớp active hoặc lớp mình có enroll; Instructor đọc toàn bộ
DROP POLICY IF EXISTS "Classes read active or enrolled or instructor" ON public.classes;
CREATE POLICY "Classes read active or enrolled or instructor"
ON public.classes FOR SELECT TO authenticated
USING (
  status = 'active' 
  OR public.is_instructor()
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.learners l ON l.id = e.learner_id
    WHERE e.class_id = classes.id AND l.user_id = public.current_user_id()
  )
);

-- CUD: Chỉ Instructor mới được quản lý lớp
DROP POLICY IF EXISTS "Classes modified by instructors only" ON public.classes;
CREATE POLICY "Classes modified by instructors only"
ON public.classes FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

-- ------------------------------------------------------------------------------
-- 9. RLS POLICIES: learners
-- ------------------------------------------------------------------------------

-- SELECT: Học viên chỉ đọc mã LRN-XXXXXX của chính mình; Instructor đọc danh sách
DROP POLICY IF EXISTS "Learners read own record or instructor read all" ON public.learners;
CREATE POLICY "Learners read own record or instructor read all"
ON public.learners FOR SELECT TO authenticated
USING (
  user_id = public.current_user_id()
  OR public.is_instructor()
);

-- INSERT: Tự tạo learner khi đăng nhập hoặc Instructor tạo
DROP POLICY IF EXISTS "Learners insert own record or instructor insert" ON public.learners;
CREATE POLICY "Learners insert own record or instructor insert"
ON public.learners FOR INSERT TO authenticated
WITH CHECK (
  user_id = public.current_user_id()
  OR public.is_instructor()
);

-- UPDATE: Chỉ Instructor mới có quyền cập nhật learner
DROP POLICY IF EXISTS "Learners update by instructor" ON public.learners;
CREATE POLICY "Learners update by instructor"
ON public.learners FOR UPDATE TO authenticated
USING (public.is_instructor());

-- ------------------------------------------------------------------------------
-- 10. RLS POLICIES: enrollments
-- ------------------------------------------------------------------------------

-- SELECT: Học viên chỉ đọc enrollment của mình; Instructor đọc toàn bộ
DROP POLICY IF EXISTS "Enrollments read own or instructor read all" ON public.enrollments;
CREATE POLICY "Enrollments read own or instructor read all"
ON public.enrollments FOR SELECT TO authenticated
USING (
  learner_id IN (SELECT id FROM public.learners WHERE user_id = public.current_user_id())
  OR public.is_instructor()
);

-- CUD: Chỉ Instructor mới được thêm/sửa/xóa enrollment
DROP POLICY IF EXISTS "Enrollments modified by instructors only" ON public.enrollments;
CREATE POLICY "Enrollments modified by instructors only"
ON public.enrollments FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());

-- ------------------------------------------------------------------------------
-- 11. THÔNG BÁO CHO POSTGREST RELOAD SCHEMA CACHE
-- ------------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';
