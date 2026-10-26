# ISSUES REGISTER — bổ sung LIVE (23/10/2026)

Mã `Lxx` là phát hiện của đợt này; `Ixx` là mã trong `docs/audits/ISSUES_REGISTER.md` (bộ gốc). Không có P0 (không thấy rò dữ liệu chéo tenant hay mất dữ liệu đang xảy ra).
Mức: **P1** phải sửa trước production · **P2** nên sửa sớm · **P3** dọn dẹp/cải thiện.

## A. Lỗi đã xác nhận (confirmed defects)

| Mã | Mức | Lỗi | File | Bằng chứng / tình huống | Sửa nhỏ nhất | Cách kiểm chứng |
|---|---|---|---|---|---|---|
| L01 | **P1** | Một bước Judge chậm làm hỏng cả job; thử lại chạy lại cả 6 lời gọi | `parallelJudgeService.ts:12-14,38,115-119`; `rebuildRunService.ts:299` | **LIVE** job `f7a3fc37ff2f` 23/10: 3 lần dispatch × 270s, mỗi lần 4–5/6 bước xong trong 2–13s, 1 bước treo 97–270s → 18 lời gọi, 0 điểm, học viên chờ ~15 phút | Timeout riêng mỗi bước ~20–25s + 1 lần thử lại bước đó (permit mới); lưu kết quả bước đã hợp lệ theo (attempt, generation, stage) để dispatch sau chỉ chạy bước thiếu (đụng fencing 015 – phối hợp) | Test mock tiêm độ trễ 1 bước; sau đó mẫu LIVE có giới hạn: p95 và số lời gọi/điểm |
| L02 | **P1** | Pool SQL tự khoá; lỗi bị nuốt thành "không có quyền" | `cloudPostgresService.ts:12-19,35`; PSS:108,162-163; `cloudDatabaseService.ts:91` | CODE (tự kiểm lại) + I01 OFFLINE. 5 snapshot đồng thời/instance → chờ 10s → `can_manage=false` → giảng viên 403 | Chạy kiểm tra quyền và 2 truy vấn reader **sau** khi `withServiceScope` trả về (hoặc dùng truy vấn service theo user id); không biến lỗi `rpc` thành `false` | Pool giả `max=2`, 2 snapshot đồng thời của giảng viên |
| L03 | **P1** | Tới 500 kết nối SQL trên DB 2 vCPU ZONAL, 0 alert | Cấu hình Cloud Run/Cloud SQL | LIVE: maxScale 100 × PGPOOL 5; ZONAL; 0 alert policy | Đặt `maxScale` sao cho maxScale×5 < `max_connections` − dự phòng (đọc giá trị thật); alert 5xx, kết nối DB, CPU, độ sâu queue Judge, job `failed`; cân nhắc HA trước production | `SHOW max_connections`; k6 với provider giả |
| L04 | P2 | Sandbox AI của giảng viên **không trừ budget**; lỗi provider để lại dòng "processing" vĩnh viễn | PSS:441-478 (insert :455) | CODE: lặp `sandboxGenerate` với requestId mới → chi phí Gemini không giới hạn; retry cùng requestId → 409 mãi | `product_take_budget(actor,'ai.sandbox',N)`; xoá/đánh dấu lỗi dòng khi lỗi không phải timeout; `withProviderScope` theo user | Test: lần N+1 trả 429; lỗi provider rồi retry thành công |
| L05 | P2 | Đổi trạng thái lab từ Workshop luôn lỗi 409 | `ProductionWorkshopSource.tsx` `updateLabStatus`; `006_studio_class_scope.sql` (`p_fields`) | CODE: gửi `saveStudio` không có `fields` → RPC báo "Invalid lesson title" → 409 chung chung | Gửi kèm `fields` hiện tại (như Studio) và bỏ khoá `revision` thừa | Test UI/HTTP; thử trên staging |
| L06 | P2 | Mỗi request AI xác thực Firebase 3–4 lần (gọi mạng `checkRevoked`) | `firebaseServerIdentityService.ts:14`; `apiAuthorizationService.ts:32`; `rebuildRunService.ts:24`; `generationStreamService.ts:30` | CODE | Nhớ kết quả xác thực theo token trong một request (`AsyncLocalStorage`); gọi `assertAiLessonAccess` một lần trong `resolve` | Đếm `recordRequestTime('auth')`/request: 3–4 → 1 |
| L07 | P2 | "Resolve" yêu cầu truy cập không cấp quyền; không có cách thêm 1 học viên ngoài Sheet | `mentorFeedbackService.ts:66` | **LIVE**: `duc.vo@intrepid.asia` bị từ chối; trả `{saved:true}` kể cả 0 dòng, không audit | Đổi nhãn nút thành "Đánh dấu đã xử lý" + hướng dẫn thêm vào Sheet, hoặc thêm hành động "Thêm vào roster" có audit | Test resolve + học viên đăng nhập được |
| L08 | P2 | Học viên hết hạn vẫn gọi `searchSop` (embedding tốn phí); ghi danh `completed`/lớp đóng băng vẫn ghi được (upload ngữ cảnh, nộp SOP, thư viện) | PSS:21, 98, 279-341 | CODE | Thêm `searchSop` (có query) vào `READ_ONLY_BLOCKED`; quyết định sản phẩm: `completed` là chỉ đọc? | Test learner_safeguards mở rộng |
| L09 | P2 | Prompt chào hỏi/lạc đề vẫn tốn 6 lời gọi Judge | `parallelJudgeService.ts:85-101`; bộ lọc chỉ ở `productionAiService.ts:152` | CODE | Áp bộ lọc chào hỏi sẵn có cho `parallel-v1` (0 lời gọi, 0 điểm) | `verify_judge_strategies.ts` |
| L10 | P2 | Không có xoá/lưu trữ/giới hạn thời gian lưu dữ liệu học viên | Toàn hệ thống | CODE: không có job hay API xoá | Quyết định chính sách lưu trữ (câu hỏi PO), rồi job xoá theo hạn + quy trình xoá theo yêu cầu | Test job trên PGlite |
| L11 | P2 | Thiếu `JUDGE_STRATEGY` → Judge âm thầm dùng đường cũ 1 lời gọi; thiếu `GEMINI_MODEL` → Generator dùng `gemini-2.5-flash` | `productionAiService.ts:33,142-149`; PSS:198; `rebuildRunService.ts:130` | CODE (= I12) | Hằng số model duy nhất, không mặc định ngầm; thiếu cấu hình → lỗi khởi động; bổ sung `.env.example` | Test khởi động thiếu biến |
| L12 | P3 | Judge async không truyền ngôn ngữ học viên | `rebuildRunService.ts:294` | CODE (tự kiểm lại). Ảnh hưởng nhỏ vì kết quả có `feedback.en/vi` | Lưu ngôn ngữ vào job/snapshot và truyền vào `judgeInput` | Unit test |
| L13 | P3 | `privateHint` bỏ qua `requestId` (bấm 2 lần → 2 hint); broadcast tạo UUID mới mỗi lần bấm | PSS:525; `ProductionWorkshopSource.tsx:19` | CODE | Dùng requestId như broadcast; giữ UUID theo nội dung soạn | Test idempotency |
| L14 | P3 | `requestHint`/`resetAiSession` chỉ kiểm bài thuộc khoá học, không kiểm bài đang hiển thị (DRAFT/khoá) | PSS:479-497 | CODE | Dùng cùng kiểm tra "bài có trong snapshot" như các action khác | Test với bài DRAFT |
| L15 | P3 | `/internal/judge` chỉ dựa token job, không OIDC | `cloudRunServer.ts:106` | CODE | Thêm `workerAuthorized` (OIDC Cloud Tasks) | Test 401 khi thiếu OIDC |

## B. Vấn đề hiệu năng tái hiện được
- L01 (đuôi Judge, LIVE) · L09 (lời gọi thừa) · ngữ cảnh SOP gửi 5 lần (OFFLINE 5,52×) · Judge 3 job đồng thời (LIVE) · snapshot ~39+N câu lệnh, poll 5–15s (CODE + LIVE p95 2,5s; = I11) · poll trạng thái Judge 5 transaction có `FOR UPDATE` (CODE).

## C. Rủi ro kiến trúc
- L02, L03 · không có admission toàn cục (I06) · mã chạy chưa nằm trong CI, image overlay (I08) · migration tay bằng mật khẩu `postgres` **đã lộ trong chat** → cần đổi · cold start + `tsx` runtime · tắt máy 8s giết request dài · Cloud SQL ZONAL không HA.

## D. Giả thuyết chưa kiểm chứng
- `max_connections` thực của Cloud SQL (ước ~400 — UNVERIFIED).
- Lời gọi bị huỷ do timeout có bị tính phí? Tỉ lệ cache tiền tố Vertex?
- Dung lượng payload snapshot với 200 attempt.
- Admission khi bật sẽ đói pool (CODE, chưa đo).
- B/C có tương đương chất lượng A (chưa từng chạy quality gate).

## E. Cải thiện tuỳ chọn (lean)
- Xoá đường AI cũ trong `apiServerService.ts:39-427` + `aiEvaluationContract.ts` + `types/database.ts` (~720 dòng; có `?key=` API key và model ngoài hợp đồng).
- Thay layout fallback `prod-app` + 7 component cũ không render bằng một trạng thái rỗng (~215 dòng).
- Chặn import lazy `RebuildApp` (615 KB) khỏi bản production.
- Xoá `authErrorService.ts`, `supabaseClient.ts`, `@floating-ui/react`, `@supabase/supabase-js` (sau khi lưu trữ script cũ), envPrefix `VITE_SUPABASE_*`.
- Mã lỗi thay cho so khớp chuỗi (quota 4 nơi, bản dịch theo chuỗi chính xác); hàm `classTier()` thay cho so `class_code==='PUBLIC-BASIC'` ở 5 nơi.
- Log JSON thêm `severity`; tách token vào/ra/thinking; sửa `queueWaitMs` khi dispatch lại.
- Chuyển `type Props` ra khỏi `ProductionWorkspace.tsx` để hết cảnh báo vòng import.

**Lean:** khoảng −1.200 dòng, −2 dependency có thể bỏ (CODE, chưa chạy `audit:unused`).
