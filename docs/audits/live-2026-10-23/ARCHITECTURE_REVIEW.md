# ARCHITECTURE REVIEW — sẵn sàng production và khả năng mở rộng (23/10/2026, bộ bổ sung LIVE)

Tải giả định: một lớp workshop 30–100 học viên bấm Run gần như cùng lúc, vài giảng viên theo dõi Workshop (poll 5s), một Head xem Analytics.

## Điểm làm tốt (không nên đổi)
- **Phân quyền nhiều lớp**: `classScope` + danh sách manage → RLS (`product_can_read_class`, `product_domains`) → SECURITY DEFINER có kiểm vai. Không tìm thấy đọc/ghi chéo tenant (CODE, ~10 hàm SQL được kiểm tra mẫu).
- **Idempotency** cho Run (`rebuild_begin_run` theo `requestId`), claim/lease Judge, đóng băng snapshot bài làm (bằng chứng chấm không phụ thuộc dữ liệu client).
- **Judge async qua Cloud Tasks** loại bỏ giới hạn 60s của Hosting (LIVE).
- **Bí mật**: `.env*` đều bị git-ignore và loại khỏi image (`.dockerignore`, `.gcloudignore`); `npm audit --omit=dev`: **0 lỗ hổng** (OFFLINE).
- Cờ mặc định tắt cho mọi tính năng mới; migration chỉ cộng thêm, có rollback.

## Rủi ro kiến trúc (xếp theo mức độ)

| # | Rủi ro | Bằng chứng | Ảnh hưởng khi tải thật |
|---|---|---|---|
| A1 | **Pool SQL tự khoá** — `withServiceScope` giữ 1 kết nối, bên trong `c.reader.rpc`/`from` mở kết nối thứ 2 (`cloudPostgresService.ts:12-19,35`; PSS:108,162-163). Lỗi `rpc` bị nuốt (`cloudDatabaseService.ts:91`) nên `can_manage` âm thầm thành `false` | CODE (đã tự kiểm lại) + I01 OFFLINE | ~5 request snapshot đồng thời/instance → chờ 10s → giảng viên nhận 403 "outside your assigned access", học viên nhận 409 |
| A2 | **Kết nối SQL tối đa 500** = maxScale 100 × PGPOOL 5, trên Cloud SQL 2 vCPU **ZONAL, không HA**; **0 alert policy** | LIVE | Hết `max_connections` → lỗi 53300 hiển thị "Identity service unavailable"; mất zone = mất dịch vụ; không ai được báo |
| A3 | **Không có hàng đợi provider toàn cục** (`PROVIDER_ADMISSION_MODE` tắt, 013 chưa áp) | LIVE + I06 | 100 pipeline: 6/100 chấm đủ (22/10). Run đồng bộ trên 100 instance không bị giới hạn |
| A4 | **Judge chỉ 3 job đồng thời** (Cloud Tasks `maxConcurrentDispatches=3`), mỗi job tối đa 270s | LIVE | 30 học viên → người cuối chờ ~70–140s; 1 job treo chiếm 1/3 năng lực trong 4,5 phút |
| A5 | **Xác thực Firebase lặp 3–4 lần/request AI** (`verifyIdToken(checkRevoked=true)` gọi mạng mỗi lần) | CODE | Tăng độ trễ, tốn quota Firebase Auth, tăng áp lực pool |
| A6 | **Snapshot nặng và bị poll**: ~39+N câu lệnh SQL/lần với learner, chạy tuần tự trên một kết nối; có **ghi** (`product_refresh_awards`) trong đường đọc; đọc nguyên `rebuild_runs.snapshot` (tới 100k ký tự ngữ cảnh) cho 200 attempt | CODE + LIVE p95 2,5s | Poll 5–15s × số người → pool và CPU DB là nút cổ chai đầu tiên |
| A7 | **Mã nguồn chạy trên staging không có trong git/CI** cho tới commit 16:37 hôm nay; image là chuỗi overlay từ `life-1021` | LIVE | Không tái tạo được bản build; rollback dựa vào revision cũ thay vì commit |
| A8 | **Migration chạy tay** bằng mật khẩu `postgres` gõ trực tiếp (mật khẩu đã lộ trong chat 23/10) | LIVE | Rủi ro bảo mật, không có audit tự động; cần đổi mật khẩu |
| A9 | **Cold start**: minScale 0, chạy TypeScript bằng `tsx` lúc khởi động, CPU throttling | LIVE + CODE | Lượt đầu sau lúc rảnh chậm (đã thấy lỗi DB idle 22/10) |
| A10 | **Tắt máy cứng 8s** trong khi stream/Judge đồng bộ kéo dài tới 240s | CODE | Deploy/scale-in giết request đang chạy (vẫn bị tính phí provider) |

## Đánh giá theo hạng mục yêu cầu

| Hạng mục | Kết luận |
|---|---|
| Tách lớp frontend/backend | Tốt ở biên HTTP; nhưng frontend còn 2 thế hệ màn hình (live `*Source` và legacy không render) — L13 |
| Thiết kế API | Một endpoint `action` lớn (~60 action) — đơn giản, dễ bảo vệ; lỗi phân loại còn dựa vào so khớp chuỗi (L12) |
| AuthN/AuthZ/tenant | Tốt (không P0); điểm yếu: `/internal/judge` chỉ dựa token job (không OIDC), `accessRequest` nhận classId tuỳ ý, sandbox không budget |
| DB/index/truy vấn | RLS tốt; vấn đề là số câu lệnh/snapshot và pool (A1, A6) |
| Đồng thời/race | Run/Judge idempotent; race nhỏ: cap 5 yêu cầu gợi ý (I10), session token (I04) |
| Scale Cloud Run | Cần đặt `maxScale × PGPOOL < max_connections − dự phòng` (A2) |
| Queue/retry/timeout | Judge retry chạy lại cả 6 lời gọi, mỗi lời gọi được cả 270s (L01) |
| Phục hồi/xuống cấp mềm | Safeguards fail-open khi thiếu schema (I03); claim Judge tự giải phóng |
| Log/metric/alert | Log JSON nhưng **không có `severity`**, **0 alert**, không tách token vào/ra/thinking, `queueWaitMs` sai khi dispatch lại |
| Bí mật/dependency | Tốt; xoá `@supabase/supabase-js`, `@floating-ui/react` không dùng |
| CI/CD/rollback | CI chỉ chạy test, không build Docker, không kiểm chuỗi migration, không deploy; rollback bằng traffic revision (đã diễn tập nhiều lần 23/10) |
| Bảo trì | Mã rất dày (nhiều câu lệnh/dòng); ~1.200 dòng có thể xoá (L13–L15) |

## Không khuyến nghị
Không tách microservice, không thêm Redis/hạ tầng mới. Mọi nút cổ chai trên giải được bằng: sửa pool (A1), đặt giới hạn scale + alert (A2), bật admission đã có code (A3), kiểm soát đuôi Judge (L01), giảm truy vấn snapshot (A6).
