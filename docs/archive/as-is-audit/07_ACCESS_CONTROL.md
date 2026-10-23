# As-Is Access Control

> Audit ngày 2026-10-05 · local `main` · commit `06a45056dac2cd0f1c7396b675495fd34364f4c9`. Local chậm hơn tracking `origin/main` 4 commit tại thời điểm audit; không fetch/checkout. Đây là trạng thái code và SQL trong repo, không phải chứng nhận DB/deployment production. Không sử dụng Refined BRD hoặc tài liệu future/proposal.

## 1. Layers

| Layer | Enforced now | Limit |
| --- | --- | --- |
| Supabase Auth | Google OAuth, verified JWT via getUser on AI APIs | Console OAuth settings chưa xác minh |
| App role | users.role learner/instructor/admin | Cached view/role không cấp DB rights |
| Learner navigation | active enrollment lookup, class check, authorized lesson URL | Static curriculum fallback; UI state không security boundary |
| Content RLS | active class enrollment + published course/module/lesson | Helpers không kiểm start/end dates |
| Instructor RLS | is_instructor global role | Không course/client assignment isolation |
| API guard | Bearer auth, class SELECT, UUID lesson/course match | Read permission public class rộng hơn enrollment; nonUUID/missing lesson skipped |
| Attempt create/retry RPC | resolves current learner, active access, ownership/canonical course, transaction | Input content/evaluation client supplied |
| Grant 017 | deny direct INSERT/UPDATE attempts | Requires production applied017; DELETE instructor vẫn được |

## 2. Important security findings

### HIGH AC-01 — Class SELECT không đồng nghĩa enrollment

Migration012 cho mọi authenticated user nhìn public class trong date window. assertAiLessonAccess query class qua RLS, rồi bỏ lesson check khi lessonId thiếu hoặc non-UUID. Vì vậy user có JWT hợp lệ nhưng chưa enroll public class có đường qua guard với nonUUID lessonId. UUID lesson vẫn cần lessons RLS và course match; create attempt RPC vẫn cần enrollment nên không suy diễn write bypass. Đây là kết luận code/SQL phối hợp, chưa exploit test trên live.

### HIGH AC-02 — Expiration partial

Self-enroll RPC kiểm start_date<=now<=end_date; has_active_class_enrollment chỉ enrollment.status=active và class.status=active. Active course helper và record RPC không enforce clock expiration. Không thấy job tự đổi expired/class status. Vì vậy enrollment active/class active có thể còn DB/API access sau end_date. ExpirationBanner file không được App import; App có text “18:00 hôm nay” và 4/8h fallback không là backend restriction.

### HIGH AC-03 — Score provenance

Owner có thể gọi record/retry RPC với evaluation hợp lệ do họ tự xây. JSON validator không chứng minh provider signed result; phần trăm completion cũng chỉ dựa persisted nonempty output. Đây là quyền write hiện tại có kiểm owner, nhưng học tập/điểm không đáng tin như assessment được server kiểm chứng.

### Broad scope AC-04

is_instructor() true cho instructor/admin ở bất kỳ class/course/client. course_instructors permission viewer/editor/owner được khai báo nhưng policy không tham chiếu assignment. Không khẳng định đây là bug nếu global instructor là chính sách chấp nhận; cần human xác nhận scope. Learner vẫn được SELECT tất cả clients do USING(true) authenticated; clients không là tenant membership boundary.

### Identity AC-05

public.users không FK trực tiếp auth.users, auth_provider_id nullable/nonunique. Helpers OR email/provider id + LIMIT1. UPDATE privilege trigger chống learner đổi role/email/id/bound id, nhưng INSERT policy own email role learner không kiểm auth_provider_id=auth.uid. Data integrity/misbinding cần xác nhận bằng controlled staging test, không khẳng định đã takeover.

## 3. Effective RLS after ordered chain

Các block sau là CREATE POLICY cuối cùng cùng tên trong schema→002→…→017. 017 còn giữ policies nhưng thay table grants; không được bỏ qua grants khi đọc hiệu lực. Không có DROP-only policy không recreate trong chain đã inventory.

`supabase/migrations/002_add_grants_and_rls.sql:126`

```sql
CREATE POLICY "Users can read own profile or instructor read all"
ON public.users FOR SELECT TO authenticated
USING (
  auth_provider_id = auth.uid()::text 
  OR email = auth.jwt() ->> 'email'
  OR public.is_instructor()
);
```

`supabase/migrations/002_add_grants_and_rls.sql:136`

```sql
CREATE POLICY "Users can insert own profile or instructor insert"
ON public.users FOR INSERT TO authenticated
WITH CHECK (
  (email = auth.jwt() ->> 'email' AND role = 'learner')
  OR public.is_instructor()
);
```

`supabase/migrations/002_add_grants_and_rls.sql:145`

```sql
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
```

`supabase/migrations/002_add_grants_and_rls.sql:167`

```sql
CREATE POLICY "Clients read by authenticated only"
ON public.clients FOR SELECT TO authenticated
USING (true);
```

`supabase/migrations/002_add_grants_and_rls.sql:173`

```sql
CREATE POLICY "Clients modified by instructors only"
ON public.clients FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());
```

`supabase/migrations/012_public_testing_class_self_enrollment.sql:99`

```sql
CREATE POLICY "Courses read active or instructor read all"
ON public.courses FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR (
    status = 'active'
    AND publication_status = 'published'
    AND (
      public.has_active_course_enrollment(id)
      OR EXISTS (
        SELECT 1
        FROM public.classes c
        WHERE c.course_id = courses.id
          AND c.enrollment_mode = 'self_enroll'
          AND c.status = 'active'
          AND c.start_date <= now()
          AND c.end_date >= now()
      )
    )
  )
);
```

`supabase/migrations/002_add_grants_and_rls.sql:190`

```sql
CREATE POLICY "Courses modified by instructors only"
ON public.courses FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());
```

`supabase/migrations/012_public_testing_class_self_enrollment.sql:85`

```sql
CREATE POLICY "Classes read active or enrolled or instructor"
ON public.classes FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR public.has_active_class_enrollment(id)
  OR (
    enrollment_mode = 'self_enroll'
    AND status = 'active'
    AND start_date <= now()
    AND end_date >= now()
  )
);
```

`supabase/migrations/002_add_grants_and_rls.sql:215`

```sql
CREATE POLICY "Classes modified by instructors only"
ON public.classes FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());
```

`supabase/migrations/002_add_grants_and_rls.sql:226`

```sql
CREATE POLICY "Learners read own record or instructor read all"
ON public.learners FOR SELECT TO authenticated
USING (
  user_id = public.current_user_id()
  OR public.is_instructor()
);
```

`supabase/migrations/002_add_grants_and_rls.sql:235`

```sql
CREATE POLICY "Learners insert own record or instructor insert"
ON public.learners FOR INSERT TO authenticated
WITH CHECK (
  user_id = public.current_user_id()
  OR public.is_instructor()
);
```

`supabase/migrations/002_add_grants_and_rls.sql:244`

```sql
CREATE POLICY "Learners update by instructor"
ON public.learners FOR UPDATE TO authenticated
USING (public.is_instructor());
```

`supabase/migrations/002_add_grants_and_rls.sql:254`

```sql
CREATE POLICY "Enrollments read own or instructor read all"
ON public.enrollments FOR SELECT TO authenticated
USING (
  learner_id IN (SELECT id FROM public.learners WHERE user_id = public.current_user_id())
  OR public.is_instructor()
);
```

`supabase/migrations/002_add_grants_and_rls.sql:263`

```sql
CREATE POLICY "Enrollments modified by instructors only"
ON public.enrollments FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());
```

`supabase/migrations/003_create_prompt_attempts.sql:37`

```sql
CREATE POLICY "Authenticated users can select prompt attempts"
  ON public.prompt_attempts FOR SELECT
  TO authenticated
  USING (
    public.is_instructor()
    OR learner_id IN (
      SELECT id FROM public.learners WHERE user_id = public.current_user_id()
    )
  );
```

`supabase/migrations/006_enforce_course_enrollment_access.sql:151`

```sql
CREATE POLICY "Authenticated users can insert prompt attempts"
ON public.prompt_attempts FOR INSERT TO authenticated
WITH CHECK (
  public.is_instructor()
  OR (
    learner_id IN (
      SELECT id FROM public.learners WHERE user_id = public.current_user_id()
    )
    AND public.has_active_class_enrollment(class_id)
    AND (
      lesson_ref_id IS NULL
      OR public.lesson_belongs_to_class(lesson_ref_id, class_id)
    )
  )
);
```

`supabase/migrations/003_create_prompt_attempts.sql:59`

```sql
CREATE POLICY "Instructors can delete prompt attempts"
  ON public.prompt_attempts FOR DELETE
  TO authenticated
  USING (
    public.is_instructor()
  );
```

`supabase/migrations/006_enforce_course_enrollment_access.sql:89`

```sql
CREATE POLICY "Published modules readable by authenticated"
ON public.course_modules FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR (
    status = 'published'
    AND public.has_active_course_enrollment(course_id)
  )
);
```

`supabase/migrations/004_course_content_management.sql:213`

```sql
CREATE POLICY "Modules managed by instructors"
ON public.course_modules FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());
```

`supabase/migrations/006_enforce_course_enrollment_access.sql:100`

```sql
CREATE POLICY "Published lessons readable by authenticated"
ON public.lessons FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR (
    status = 'published'
    AND EXISTS (
      SELECT 1
      FROM public.course_modules m
      WHERE m.id = lessons.module_id
        AND m.status = 'published'
        AND public.has_active_course_enrollment(m.course_id)
    )
  )
);
```

`supabase/migrations/004_course_content_management.sql:238`

```sql
CREATE POLICY "Lessons managed by instructors"
ON public.lessons FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());
```

`supabase/migrations/006_enforce_course_enrollment_access.sql:117`

```sql
CREATE POLICY "Rubrics readable with lesson"
ON public.lesson_rubric_criteria FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE l.id = lesson_rubric_criteria.lesson_id
      AND l.status = 'published'
      AND m.status = 'published'
      AND public.has_active_course_enrollment(m.course_id)
  )
);
```

`supabase/migrations/004_course_content_management.sql:262`

```sql
CREATE POLICY "Rubrics managed by instructors"
ON public.lesson_rubric_criteria FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());
```

`supabase/migrations/006_enforce_course_enrollment_access.sql:133`

```sql
CREATE POLICY "Resources readable with lesson"
ON public.lesson_resources FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE l.id = lesson_resources.lesson_id
      AND l.status = 'published'
      AND m.status = 'published'
      AND public.has_active_course_enrollment(m.course_id)
  )
);
```

`supabase/migrations/004_course_content_management.sql:286`

```sql
CREATE POLICY "Resources managed by instructors"
ON public.lesson_resources FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());
```

`supabase/migrations/004_course_content_management.sql:292`

```sql
CREATE POLICY "Course assignments readable by instructors"
ON public.course_instructors FOR SELECT TO authenticated
USING (public.is_instructor());
```

`supabase/migrations/004_course_content_management.sql:297`

```sql
CREATE POLICY "Course assignments managed by instructors"
ON public.course_instructors FOR ALL TO authenticated
USING (public.is_instructor())
WITH CHECK (public.is_instructor());
```

`supabase/migrations/007_user_tutorial_progress.sql:14`

```sql
CREATE POLICY "Users read own tutorial progress"
ON public.user_tutorial_progress FOR SELECT TO authenticated
USING (user_id = public.current_user_id());
```

`supabase/migrations/007_user_tutorial_progress.sql:19`

```sql
CREATE POLICY "Users insert own tutorial progress"
ON public.user_tutorial_progress FOR INSERT TO authenticated
WITH CHECK (user_id = public.current_user_id());
```

`supabase/migrations/007_user_tutorial_progress.sql:24`

```sql
CREATE POLICY "Users update own tutorial progress"
ON public.user_tutorial_progress FOR UPDATE TO authenticated
USING (user_id = public.current_user_id())
WITH CHECK (user_id = public.current_user_id());
```

`supabase/migrations/010_allow_update_prompt_attempts.sql:3`

```sql
CREATE POLICY "Learners and instructors can update prompt attempts"
ON public.prompt_attempts FOR UPDATE TO authenticated
USING (
  public.is_instructor()
  OR (
    learner_id IN (
      SELECT id FROM public.learners WHERE user_id = public.current_user_id()
    )
    AND public.has_active_class_enrollment(class_id)
  )
)
WITH CHECK (
  public.is_instructor()
  OR (
    learner_id IN (
      SELECT id FROM public.learners WHERE user_id = public.current_user_id()
    )
    AND public.has_active_class_enrollment(class_id)
  )
);
```

`supabase/migrations/016_add_server_backed_lesson_progress.sql:323`

```sql
CREATE POLICY "Learners read own lesson progress"
ON public.lesson_progress FOR SELECT TO authenticated
USING (
  public.is_instructor()
  OR (
    learner_id IN (
      SELECT l.id FROM public.learners l WHERE l.user_id = public.current_user_id()
    )
    AND public.has_active_class_enrollment(class_id)
  )
);
```

## 4. Grants và function boundary

Authenticated có baseline business/content DML subject to RLS; tutorial SELECT/INSERT/UPDATE; attempt003 SELECT/INSERT/UPDATE/DELETE rồi017 revoke INSERT/UPDATE; lesson_progress SELECT only. Role service_role có explicit SELECT lesson_progress và Supabase elevated behavior nằm ngoài learner JWT path; không sử dụng service key để audit. Core security helpers và self-enroll/progress RPCs EXECUTE authenticated, revoked PUBLIC/anon; validator/sync trigger revoked authenticated callable access. Search_path public,pg_temp fixed trên SECURITY DEFINER routines.

Attempt SELECT owner/instructor không active access gate; progress SELECT owner+active class hoặc instructor. Learner có thể còn đọc attempts của mình sau enrollment removed theo SQL, trong khi App chặn lesson navigation. Removal không xóa user/learner/attempts. Không thấy scheduled expiry, rate limiter, input PII hard block, API canonical rubric fetch, score-signature check.

Không chạy RLS/security exploit hoặc sửa policies; effective policies này cần đối chiếu catalog deployed trước khi dùng làm production certification.

## SQL-01 — HIGH: Missing-key gap trong valid_evaluation_total

Nguồn: `supabase/migrations/016_add_server_backed_lesson_progress.sql:48` và `:62`. Đây là phân tích static theo SQL NULL/PLpgSQL IF, **chưa thực thi trên Postgres**.

Các checks `jsonb_typeof(payload -> 'scores') <> 'object'` và `jsonb_typeof(payload -> 'scores' -> score_key) <> 'number'` không dùng `IS DISTINCT FROM` hoặc presence check. Key không tồn tại cho SQL NULL; phép `NULL <> value` trả NULL. PL/pgSQL IF chỉ vào nhánh khi điều kiện TRUE, không khi NULL. score_value/score_total trở thành NULL; final `declared_total <> score_total` cũng NULL và không RAISE/RETURN NULL. Nếu total hợp lệ được khai báo (ví dụ `{ "total": 10 }`, hoặc scores thiếu một key), function có đường RETURN declared_total=10.

Client/server validator TypeScript từ chối payload này, nhưng authenticated caller có thể bỏ qua frontend và gọi record/retry RPC trực tiếp. SQL function vì vậy không là contract gate tương đương TypeScript; có thể góp best_score từ incomplete evaluation. Đây là rủi ro riêng với score provenance: ngay cả shape gate còn có lỗ missing-key. JSON explicit null bị jsonb_typeof trả string 'null' và khác missing SQL NULL; không trộn hai trường hợp.

Không sửa SQL, không gọi RPC để kiểm trên production. Cần human xác nhận migration deployed và disposable Postgres runtime verification ở pha được phép. Static regex test progress đang assert có câu check, không kiểm semantics NULL.
