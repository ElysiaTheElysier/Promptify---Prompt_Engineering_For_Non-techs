# 03 — Decision log

Cập nhật 06/10/2026; bổ sung D37–D44 ngày 22/10/2026. CONFIRMED = nguồn trực tiếp xác nhận; PROPOSED = đề xuất/diễn giải chưa duyệt; OPEN = chưa chốt/mâu thuẫn; OUT = ngoài Phase 1, không loại vĩnh viễn.

## Nguồn và authority

- **S1:** [ghi chú 05/10/2026](archive/business-drafts/STAKEHOLDER_NOTES_2026-10-05.txt). Chỉ phần **“Đức’s thoughts”** có ưu tiên cao nhất.
- **S1-R:** Structured Refinement/summary/checklist/customer journeys/user stories trong cùng tệp; diễn giải, không có authority ngang thoughts.
- **S1-B / S1-P:** BRD 2.0 / PRD 1.0 trong tệp S1; chi tiết không được thoughts hỗ trợ là đề xuất, không tự confirmed.
- **S2:** [brief implementation plan trực tiếp người dùng](archive/old-plans/IMPLEMENTATION_PLAN_BRIEF_2026-10-06.txt). Căn cứ bổ sung phạm vi Phase 1/bản hiện tại độc lập. Chỉ dẫn consolidation mới nhất thay yêu cầu tạo file ở docs/rebuild và format phản hồi cũ.
- **S3 — Quyết định mới trực tiếp người dùng, 06/10/2026:** usable pilot đến 23/10/2026; Google Sheet roster bắt buộc (Email, Full Name, Business Function/Department, Country); ưu tiên scope pilot thật. Nguồn là yêu cầu cập nhật plan trong chat này, không tạo attachment/tài liệu mới. S3 thay phần chưa chốt deadline/nguồn roster ở S1/S2; cơ chế sync/quota chưa được xác nhận.
- **A:** [01_CURRENT_STATE.md](archive/as-is-audit/01_CURRENT_STATE-2026-10-06.md) và audit gốc được dẫn tại đó, CURRENT-AS-IS; không override business direction.
- BRD/PRD/gap/UX cũ trong archive chỉ là lịch sử.

Không có xác nhận mới vì bản AI ghi finalized/P0/checkbox. Không đủ evidence xác định tác giả từng đoạn tổng hợp; xử lý các đoạn đó là diễn giải chưa được stakeholder xác nhận.

## Stakeholder decisions / ngoài phạm vi

| Decision | Status | Source | Notes |
| --- | --- | --- | --- |
| D01 — Internal Intrepid, sản phẩm nhỏ phù hợp nguồn lực | CONFIRMED | S1: Thu hẹp phạm vi | 27 functions/6 countries/~550 SOP là bối cảnh; không đồng nghĩa rollout đồng loạt |
| D02 — Learner, Vo Tu Duc/Trainer, Head/Admin/PIC | CONFIRMED | S1: số loại user | Đức là trainer duy nhất; không thêm persona System Admin từ BRD |
| D03 — Corporate SSO, roster/profile confirmation, department zone | CONFIRMED | S1: Người học; S2 §1/4 | Email/name/function/country; Head chỉ phòng ban mình; provider/domain exact chưa chốt |
| D04 — SOP/sample data, form Head gửi/cập nhật, Đức quản lý course/cohort | CONFIRMED | S1: SOPs, Người dạy, Người hỗ trợ | Không suy ra auto-ingest/RAG toàn bộ |
| D05 — Reporting/impact và library prompt chung | CONFIRMED | S1: reporting/business metrics/library | KPI/permissions cụ thể chưa chốt |
| D06 — Tất cả Intrepid users paid; không payment/subscription | CONFIRMED | S1: Phần thanh toán; S2 §1/6 | Không BASIC/FREE funnel |
| D07 — Credential chung Intrepid trong GCP, dùng trên Promptify bởi user Intrepid | CONFIRMED | S1: Phần API key; S2 §1 | Backend-controlled theo S2; chưa chốt loại credential/runtime |
| D08 — Ưu tiên EN, hỗ trợ EN/VI qua i18n | CONFIRMED | S1: bản tiếng Anh và đa ngôn ngữ | Không xác nhận i18next library |
| D09 — Bản hiện tại độc lập, Intrepid chuẩn bị riêng | CONFIRMED | S2 §2 | Cách tách repo/deploy/DB còn OPEN |
| D24 — Google Sheet roster Phase 1 | CONFIRMED | S3, 06/10/2026: Google Sheet là nguồn roster bắt buộc | Tối thiểu Email, Full Name, Business Function/Department, Country; Trainer/Admin sửa Sheet → sync/import → pre-onboard → login/match/confirm → đúng zone. Sheet không là database chính; cơ chế đọc/sync và interval vẫn D33, chưa confirmed |
| D34 — Usable pilot deadline 23/10/2026 | CONFIRMED | S3: quyết định deadline trực tiếp người dùng ngày 06/10/2026 | Ngày theo Asia/Saigon; ngày 23 phải có bản dùng end-to-end. Thay ghi nhận chưa có deadline; không phải xác nhận đã có code hoặc mọi milestone chắc chắn hoàn thành |
| D35 — Minimum usable pilot và ưu tiên scope | CONFIRMED | S3: Definition of usable / Scope / Cut List | Sheet→login/match/confirm/zone→assigned lesson/context→AI/output/feedback→rerun/compare→persisted progress; Trainer course/lesson/context/progress, Head own-department progress. Không cắt roster/login/routing/learning/AI/persistence/isolation |
| D10 — Multi-tenant/clone/branding doanh nghiệp khác | OUT | S1: Giai đoạn Mở rộng; S2 §6 | Hướng Phase 2 đã nêu; không xây Agribank/white-label Phase 1 |
| D11 — Public/BASIC/FREE/payment/Partner/revenue sharing | OUT | S2 §6; S1 internal/paid | Thay phạm vi thương mại rộng của BRD/gap cũ |
| D12 — ERP writeback/automation phức tạp | OUT | S2 §6 | Codelab automation không tự thành app scope |

## AI-generated proposals / technical decisions chưa duyệt

Mọi reuse, data delta, cơ chế sync và lịch milestone trong 02 là AI-generated PROPOSED. Riêng nguồn Google Sheet (D24), hạn usable pilot (D34) và minimum scope (D35) là CONFIRMED bởi S3. Các chi tiết từ bản tổng hợp S1-R/B/P không được coi là stakeholder decisions.

| Decision | Status | Source | Notes |
| --- | --- | --- | --- |
| D13 — Giữ React/Vite/Supabase/Vercel | PROPOSED | A; đề xuất consolidation | Reuse nền hiện có để giảm scope; target platform chưa duyệt |
| D14 — SSO provider/domain allowlist exact | OPEN | S1 SSO; S1-R/B/P Google/@intrepid.asia; A Google OAuth | Cần IT xác nhận provider và domain hợp lệ |
| D15 — GCP provider/model/runtime/credential | OPEN | S1 GCP; S1-R/B/P Vertex/service account; A OpenAI/Gemini | API key và service-account credential không đồng nhất; chưa chốt secret store |
| D16 — Ô key và privacy | OPEN | S1 yêu cầu ô key + privacy; S2 backend-side | Đề xuất masked identifier/connection status; không mặc định lộ raw secret |
| D17 — SSE/streaming bắt buộc | PROPOSED | S1-B/P; A response hoàn chỉnh rồi animate; S3 cut list | AFTER PILOT nếu không cần; non-streaming output thật đủ pilot, hoạt ảnh không là SSE |
| D18 — SOP ingestion/reference/upload/video processing | OPEN | S1 nguồn SOP/form; A text/URL resources | Đề xuất curated references trước; không mặc định RAG/vector DB/auto-video |
| D19 — Mastery/rubric/KPI số/completion | OPEN | S1 reporting; S1-B/P 80%/85%, 100%/14 ngày, 30–50%; A persisted run | Các số chưa confirmed/có bất nhất; RCTCF không tự thay current Judge |
| D20 — Quota/rate-limit/usage mechanism | OPEN | S1 privacy; S1-B/P 20 req/min, 50k/session, Redis | Privacy confirmed; các số/cơ chế chưa approved |
| D21 — Library scope/curation/owner permissions | OPEN | S1 shared library; S1-P department; A browser-local; S3 cut list | Chi tiết vẫn chưa chốt; full library AFTER PILOT, không chặn minimum pilot |
| D22 — Analytics storage/metrics/access | OPEN | S1 reporting/impact; A snapshot; S3 minimum flow | Basic progress Trainer/Head MUST HAVE; advanced analytics AFTER PILOT. Không gọi completed run là mastery |
| D23 — Membership và profile correction | OPEN | S1 function/country; A weak identity | Một hay nhiều functions/countries, ai duyệt sửa? Không cho tự tăng quyền |
| D25 — SOP/sample-data privacy/retention/provider policy | OPEN | S1 dữ liệu thực/key privacy; A chưa pipeline | Chốt dữ liệu được phép, người duyệt, quyền truy cập |
| D26 — Canonical context/provenance/persistence boundary | PROPOSED | A client-supplied score/SQL-01; đề xuất consolidation | Server-controlled result; reuse UI/contract phù hợp; chưa duyệt cơ chế |
| D27 — i18n implementation/content và WCAG target | OPEN | S1 EN/VI; S1-P i18next/WCAG 2.1 AA; S3 cut list | Giữ EN/VI thiết yếu; advanced polish AFTER PILOT. Library/standard exact và owner dịch chưa chốt |
| D28 — Deployment độc lập | OPEN | S2 bản cũ độc lập; S3 deadline | Repo/branch/deploy/DB isolation chưa chọn; cần chốt M1. Deadline đã CONFIRMED tại D34; không dùng sprint 4 tuần cũ |
| D29 — Next.js 14/Fastify/Express/Shadcn/Redis/Secret Manager | PROPOSED | S1-B/P | Không là target architecture được duyệt |
| D30 — Dynamic theme/Admin Theme Customizer | OUT | S1 Phase 2; S1-P theme engine | Không đưa Phase 1 để chuẩn bị scale |
| D31 — Option 2 / 100-minute Masterclass | OPEN | S1 phần curriculum sau BRD/PRD: tạm chọn, NEED TO REVIEW | Ghi nhận lựa chọn tạm; không confirmed syllabus cuối/automation scope |
| D32 — 1.150+ nhân viên, nhu cầu AI >80%, budget/SLA | OPEN | S1-B/P và gap cũ | Chưa có nguồn thoughts cho số liệu; không acceptance |
| D33 — Google Sheet connector/sync mechanics/interval | PROPOSED | Đề xuất AI theo S3: reliability, dễ demo/debug, ít infrastructure | Private server-side read-only + explicit Sync now; fallback authorized Sheet-export CSV dùng cùng validate/preview/idempotent import nếu access API chưa sẵn sàng M1. Chọn một đường trước coding connector. Interval, auto-sync, Redis/worker vẫn chưa confirmed; background sync AFTER PILOT |
| D36 — Lịch 5 milestones/capacity/pilot size | PROPOSED | Đề xuất AI từ S3, dependency A | M1 06–08, M2 09–12, M3 13–16, M4 17–20, M5 21–23/10; đây là kế hoạch, không chứng nhận delivery. Capacity cuối tuần, named owners và số departments/users cần xác nhận sớm |

## Quyết định sau 06/10/2026 (bổ sung ngày 22/10/2026)

Thêm hai trạng thái: **IMPLEMENTED** = có trong code/staging kèm evidence, nhưng không tìm thấy văn bản stakeholder phê duyệt (nguồn là chỉ dẫn của người dùng trong các phiên làm việc, ghi lại trong handoff/evidence); **S4** = chỉ dẫn trực tiếp của người dùng ngày 22/10/2026 trong phiên hợp nhất repository.

| Decision | Status | Source | Notes |
| --- | --- | --- | --- |
| D37 — Runtime Intrepid trên GCP: Firebase Hosting/Auth, Cloud Run, Cloud SQL Postgres 18 + pgvector, GCS, Firestore (chỉ dùng để báo thay đổi), Vertex AI | IMPLEMENTED (staging) | [governance 18/10](evidence/GCP_DEPLOYMENT_GOVERNANCE_2026-10-18.md), `apps/promptify-intrepid/gcp/` | Thay thế D13 (React/Vite/Supabase/Vercel). D15 (GCP runtime/credential) đã được trả lời trên thực tế. Production chưa tồn tại |
| D38 — Tách repo thành 2 app độc lập (12/10) | SUPERSEDED bởi D39 | [separation report](archive/repository/SEPARATION_REPORT-2026-10-12.md) | — |
| D39 — Chỉ hỗ trợ Promptify Intrepid; gỡ MVP khỏi repo | CONFIRMED (S4) | Phiên hợp nhất 22/10/2026 | MVP vẫn còn trong git history (`src/` tại `d7ac9d1`), `design-drafts/pre-separation` và backup local. Xem [archive/legacy-mvp](archive/legacy-mvp/README.md) |
| D40 — Mọi generation/Judge dùng `gemini-3.8-flash`, Judge `parallel-v1` (1 Supervisor + 5 tiêu chí), chấm `weighted-v1` thang 0–10 | IMPLEMENTED (staging) | `apps/promptify-intrepid/gcp/staging-ai.json`, [parity 22/10](evidence/STAGING_FEATURE_DOC_PARITY_2026-10-22.md) | Thay giả định "Pro" trong test log. Không đổi model/hợp đồng chấm khi chưa có duyệt riêng |
| D41 — Workspace V7 ba cột (context/prompt/result) | IMPLEMENTED | [parity 22/10](evidence/STAGING_FEATURE_DOC_PARITY_2026-10-22.md) | Thay yêu cầu dual-pane của test log |
| D42 — Roster: Google Sheets read-only, sync thủ công đã chạy live; thu hồi enrollment khi người học vắng mặt trong snapshot đầy đủ | IMPLEMENTED (staging) | [lifecycle 21/10](STAGING_LIFECYCLE_LEARNER_ACCEPTANCE_2026-10-21.md) | Thực hiện D33. Sync theo lịch vẫn OPEN (Scheduler PAUSED) |
| D43 — Hàng đợi provider toàn hệ thống / thiết kế lại Judge | OPEN | [proposal 22/10](proposals/STAGING_GEMINI_CAPACITY_LATENCY_PROPOSAL_2026-10-22.md) | Cần SLO và ngân sách trước khi làm |
| D44 — Public/Basic tier (migration 040/041, `enrollBasic`) | OPEN | Code so với D11 | Có trong code dù D11 xếp ngoài Phase 1; cần chủ sản phẩm quyết định |


## Cách dùng và archive

Bốn active docs duy nhất trong docs:

- **00:** xác định target product, scope và business constraints đã confirmed.
- **01:** hiểu implementation hiện tại, reuse và truy audit evidence.
- **02:** review thứ tự thực hiện/dependencies trước coding.
- **03:** kiểm nguồn, trạng thái quyết định và các điểm cần chốt.

Archive là lịch sử/evidence, không còn authority active. 23 tài liệu cũ được di chuyển nguyên byte, giữ Word/audit đầy đủ. Link tương đối trong tài liệu lịch sử có thể phản ánh vị trí cũ; tra đường dẫn mới bằng bảng dưới hoặc link evidence ở 01. Hai TXT nguồn được sao chép nguyên văn để không phụ thuộc attachment ngoài repo.

Phạm vi hợp nhất là docs/. README/handoff ở root và curriculum Markdown ngoài docs giữ nguyên như tài liệu vận hành/học liệu của bản hiện tại; không dùng làm product authority cho Intrepid. Application code và design drafts giữ nguyên.

## Tài liệu đã archive

| Đường dẫn cũ trong docs | Đường dẫn mới |
| --- | --- |
| as-is-audit/01_SYSTEM_OVERVIEW.md | [01_SYSTEM_OVERVIEW.md](archive/as-is-audit/01_SYSTEM_OVERVIEW.md) |
| as-is-audit/02_FEATURE_INVENTORY.md | [02_FEATURE_INVENTORY.md](archive/as-is-audit/02_FEATURE_INVENTORY.md) |
| as-is-audit/03_DATABASE_AND_SQL.md | [03_DATABASE_AND_SQL.md](archive/as-is-audit/03_DATABASE_AND_SQL.md) |
| as-is-audit/04_CURRENT_ARCHITECTURE.md | [04_CURRENT_ARCHITECTURE.md](archive/as-is-audit/04_CURRENT_ARCHITECTURE.md) |
| as-is-audit/05_USER_FLOWS.md | [05_USER_FLOWS.md](archive/as-is-audit/05_USER_FLOWS.md) |
| as-is-audit/06_AI_FLOW.md | [06_AI_FLOW.md](archive/as-is-audit/06_AI_FLOW.md) |
| as-is-audit/07_ACCESS_CONTROL.md | [07_ACCESS_CONTROL.md](archive/as-is-audit/07_ACCESS_CONTROL.md) |
| as-is-audit/08_TECH_DEBT_AND_RISKS.md | [08_TECH_DEBT_AND_RISKS.md](archive/as-is-audit/08_TECH_DEBT_AND_RISKS.md) |
| as-is-audit/09_TEST_AND_RUNTIME_STATUS.md | [09_TEST_AND_RUNTIME_STATUS.md](archive/as-is-audit/09_TEST_AND_RUNTIME_STATUS.md) |
| as-is-audit/10_AS_IS_EXECUTIVE_SUMMARY.md | [10_AS_IS_EXECUTIVE_SUMMARY.md](archive/as-is-audit/10_AS_IS_EXECUTIVE_SUMMARY.md) |
| as-is-audit/CURRENT_STATE_MANIFEST.md | [CURRENT_STATE_MANIFEST.md](archive/as-is-audit/CURRENT_STATE_MANIFEST.md) |
| Promptify_Data_Dictionary_and_Data_Flow_2026-09-24.docx | [Promptify_Data_Dictionary_and_Data_Flow_2026-09-24.docx](archive/as-is-audit/Promptify_Data_Dictionary_and_Data_Flow_2026-09-24.docx) |
| rebuild/02_BRD_V2_DRAFT.md | [02_BRD_V2_DRAFT.md](archive/business-drafts/02_BRD_V2_DRAFT.md) |
| BRD_Promptify_Current_State_2026-10-03.md | [BRD_Promptify_Current_State_2026-10-03.md](archive/business-drafts/BRD_Promptify_Current_State_2026-10-03.md) |
| BRD_Promptify_Quan_ly_du_an.docx | [BRD_Promptify_Quan_ly_du_an.docx](archive/business-drafts/BRD_Promptify_Quan_ly_du_an.docx) |
| BRD_Promptify_theo_mau_2026-10-03.docx | [BRD_Promptify_theo_mau_2026-10-03.docx](archive/business-drafts/BRD_Promptify_theo_mau_2026-10-03.docx) |
| PRD_Promptify_Current_State_2026-10-03.md | [PRD_Promptify_Current_State_2026-10-03.md](archive/business-drafts/PRD_Promptify_Current_State_2026-10-03.md) |
| PRD_Promptify_Quan_ly_du_an.docx | [PRD_Promptify_Quan_ly_du_an.docx](archive/business-drafts/PRD_Promptify_Quan_ly_du_an.docx) |
| PROMPTIFY_UX_DIRECTION_V2.md | [PROMPTIFY_UX_DIRECTION_V2.md](archive/business-drafts/PROMPTIFY_UX_DIRECTION_V2.md) |
| rebuild/01_GAP_ANALYSIS.md | [01_GAP_ANALYSIS.md](archive/gap-analysis/01_GAP_ANALYSIS.md) |
| Bao_cao_doi_chieu_Promptify_voi_PRD_2026-09-26.docx | [Bao_cao_doi_chieu_Promptify_voi_PRD_2026-09-26.docx](archive/gap-analysis/Bao_cao_doi_chieu_Promptify_voi_PRD_2026-09-26.docx) |
| Promptify_MVP_Completion_2026-09-24.docx | [Promptify_MVP_Completion_2026-09-24.docx](archive/old-plans/Promptify_MVP_Completion_2026-09-24.docx) |
| server-backed-progress-rollout.md | [server-backed-progress-rollout.md](archive/old-plans/server-backed-progress-rollout.md) |

## Bản lưu nguồn bổ sung

- [STAKEHOLDER_NOTES_2026-10-05.txt](archive/business-drafts/STAKEHOLDER_NOTES_2026-10-05.txt): nguyên văn attachment có thoughts/summary/BRD/PRD/curriculum.
- [IMPLEMENTATION_PLAN_BRIEF_2026-10-06.txt](archive/old-plans/IMPLEMENTATION_PLAN_BRIEF_2026-10-06.txt): nguyên văn brief cũ, chỉ dẫn consolidation mới nhất thắng khi xung đột.
