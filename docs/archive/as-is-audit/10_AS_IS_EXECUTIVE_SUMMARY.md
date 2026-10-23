# As-Is Executive Summary

> Audit ngày 2026-10-05 · local `main` · commit `06a45056dac2cd0f1c7396b675495fd34364f4c9`. Local chậm hơn tracking `origin/main` 4 commit tại thời điểm audit; không fetch/checkout. Đây là trạng thái code và SQL trong repo, không phải chứng nhận DB/deployment production. Không sử dụng Refined BRD hoặc tài liệu future/proposal.

## Product hiện tại trong 8 dòng

1. Promptify là webapp học/thực hành prompt cho người dùng nghiệp vụ, chạy React SPA.
2. Learner dùng Google OAuth, vào class đã enroll hoặc public class có self-enroll RPC.
3. Class gắn một course và client; course chứa modules/lessons đã publish.
4. Bài học hiện mount Hybrid workspace với theory/task/data/editor/output/evaluation.
5. Live AI gọi server API OpenAI ưu tiên, Gemini fallback khi không có OpenAI key.
6. Run live lưu attempt và lesson_progress qua RPC/trigger; completed là persisted run, không mastery.
7. Instructor/admin cùng shell, quản lý learners/enrollments/course content và xem DB-derived KPI/activity snapshot.
8. History/library/assistance vẫn browser-local; coach/structure/PII là rules, simulation/compare demo được phân biệt.

## Stack / DB / feature count

React19 + TS5.7 + Vite6 + Tailwind3 + Supabase Auth/Data API/Postgres + Vercel API + OpenAI/Gemini; dải version khai báo trong package.json. **14 public tables**, baseline schema.sql + **16 migrations 002–017**. Identity→learner→enrollment→class→course→module→lesson; attempts event + lesson_progress aggregate; tutorial own-account state; instructor assignments metadata không enforce riêng.

Inventory audit **33 capability: 21 Real / 9 Partial / 3 Mock**. Real nghĩa code path có implementation, chưa chứng nhận deploy. Mock gồm hai sample runtime modes/compare và reminder legacy unmounted; không gọi đó là email thật.

## Strongest parts

- Separate learner/instructor role routing theo DB, verified JWT và RLS thay vì role browser tự đặt.
- Canonical UUID curriculum chain và enrollment course authorization trong SQL.
- Atomic RPC + sync trigger bảo đảm attempt/progress transaction, advisory lock numbering và deterministic backfill.
- Judge contract được validate chặt hơn ở client/server; SQL validator có missing-key NULL gap, không bảo đảm mọi malformed evaluation đều bị loại khỏi best_score.
- Simulation có guard không gửi fake output vào Judge và không ghi completion; tutorial scoped DB theo account/screen.

## Weakest parts / 5 major debt groups

1. Access inconsistencies: public read→API gate, clock expiration không enforce chung, global instructor scope.
2. Assessment provenance: score/output/context do client submit; completed chỉ là run persisted.
3. Browser data isolation và UI wiring/state: history/library shared storage, library không nạp editor, async score/save divergence.
4. Curriculum/schema/migration drift: seed fallback và DB có thể khác course, baseline không final,016/017 coupled rollout.
5. Test/build/scaling boundary: fixtures stale, source regex nhiều, API không typechecked build, instructor collection aggregation client.

CRITICAL: không có finding đủ bằng chứng để gán. HIGH findings là static code/SQL conclusions, chưa exploit production. Details/evidence ở08 và07.

## Test/build

tsc PASS, Vite build PASS; hoàn tất **19/22 local scripts PASS / 3 FAIL / 5 SKIP**. Access test lần đầu pass rồi fail (fallback ID collision nghi ngờ có cơ sở). Public class assertion stale; vertical slice đòi seeds/demo role cũ. Không có % test coverage đo được, không SQL/runtime production verification.

## Human confirmation còn thiếu

- Deployed commit nào và DB đã apply đến migration nào, đặc biệt016/017?
- Instructor global quyền tất cả client/course có phải chính sách được chấp nhận; course_instructors được dùng ngoài repo không?
- Completed nghĩa đã chạy bài hay đạt năng lực; threshold UI7/10 và enrollment.completed có ý nghĩa quản lý thế nào?
- Class end_date là thông tin hay phải thu hồi access; có job/manual process ngoài repo không?
- Score có dùng đánh giá chính thức hay feedback practice; client-supplied score có được chấp nhận?
- History/library browser dùng chung account có phù hợp và có dữ liệu nhạy cảm thực không?
- Supabase/Vercel settings, OAuth redirect, provider keys/models/quota, data row counts/content production hiện tại?

Đây là audit độc lập của code local. Không Gap Analysis, target architecture, BRD/PRD/SAD mới hoặc implementation trong pha này.

## SQL validator caveat

HIGH SQL-01: valid_evaluation_total dùng <> với jsonb_typeof trên key thiếu, SQL NULL có thể làm incomplete scores được trả declared total hợp lệ. Phân tích static; chưa execute DB. Details ở03/07/08.
