# REMEDIATION ROADMAP (23/10/2026, bộ bổ sung LIVE)

**Chưa thực hiện gì.** Mỗi đợt cần người dùng duyệt riêng. Không đổi model `gemini-3.8-flash`, chiến lược `parallel-v1` (trừ khi có quality gate), hợp đồng `weighted-v1`, ngưỡng, quota.

## Đợt 0 — Vệ sinh ngay (≤ 1 ngày, rủi ro thấp)
| Việc | Mã | Công sức |
|---|---|---|
| Đổi mật khẩu user `postgres` (đã lộ trong chat) | C | 10 phút, người dùng |
| Tạo alert: 5xx, độ trễ p95, kết nối/CPU Cloud SQL, độ sâu queue Judge, job `failed` | L03 | 0,5 ngày |
| Đặt `maxScale` theo `max_connections` thật | L03 | 1 giờ + đọc cấu hình |
| Bổ sung `.env.example` (`JUDGE_STRATEGY`, `JUDGE_MODE`, …), cập nhật 01/04/05 docs | L11, I17 | 2 giờ |
| Bỏ câu B2B ở UI03, đổi nhãn "Resolve" yêu cầu truy cập | L07 | 1 giờ |

## Đợt 1 — Bắt buộc trước production (1–2 tuần)
| Thứ tự | Việc | Mã | Phụ thuộc | Kiểm chứng |
|---|---|---|---|---|
| 1 | Sửa pool tự khoá; không nuốt lỗi quyền | L02/I01 | — | Test pool max=2 |
| 2 | Kiểm soát đuôi Judge: timeout từng bước, thử lại riêng bước, giữ bước đã xong | L01 | Phối hợp fencing 015 (Codex) | Mock + mẫu LIVE ≤ 2 lần chấm |
| 3 | Bật admission toàn cục (áp 013, `PROVIDER_ADMISSION_MODE=sql`) + sửa poll admission không đói pool | I06 | Sau L02; cần owner credential | Canary LIVE có giới hạn |
| 4 | Budget + dọn dòng lỗi cho sandbox giảng viên | L04 | — | Test 429 |
| 5 | Mã nguồn vào git + CI build Docker + kiểm chuỗi migration; build image từ commit thay vì overlay | I08 | Người dùng commit | CI xanh, image tái tạo được |
| 6 | Diễn tập restore Cloud SQL; quyết định HA | I09 | Chủ sản phẩm chốt RPO/RTO | Biên bản restore |
| 7 | Chính sách lưu trữ/xoá dữ liệu | L10 | Chủ sản phẩm | Test job xoá |
| 8 | Nghiệm thu toàn vai trên trình duyệt (Admin → Trainer → Head → Learner, gợi ý/broadcast, roster theo lịch) | I14, I15 | — | Biên bản test log 24 case |

## Đợt 2 — Hiệu năng và chi phí (1–2 tuần)
| Việc | Mã | Lợi ích | Rủi ro |
|---|---|---|---|
| Bộ lọc chào hỏi/lạc đề cho `parallel-v1` | L09 | −6 lời gọi với prompt lạc đề | Thấp |
| Xác thực Firebase một lần/request | L06 | −2–3 lời gọi mạng/request | Thấp |
| Giảm truy vấn snapshot (chỉ lấy trường JSON cần, bỏ ghi award khỏi đường đọc, gộp RPC theo lớp) | I11 | p95 snapshot, tải DB | Trung bình — cần test hồi quy |
| Sắp xếp payload Judge có tiền tố chung | Perf §5 | Có thể giảm chi phí nếu Vertex cache | Thấp |
| Ghi token vào/ra/thinking; sửa `queueWaitMs` | Mục E (ISSUES) | Đo được chi phí thật | Không |
| Tăng `maxConcurrentDispatches` của queue Judge | Perf §3 | Throughput | **Chỉ sau khi bật admission** |
| Thí nghiệm tương đương B vs A (80–120 bài) | I07 | ~64% rẻ hơn nếu đạt | Cần duyệt chi phí AI |

## Đợt 3 — Dọn dẹp (song song, rủi ro thấp)
Xoá đường AI cũ + component không render + dependency thừa (~−1.200 dòng); mã lỗi thay so khớp chuỗi; `classTier()`; sửa L05, L08, L12–L15.

## Không nên đổi
Phân quyền nhiều lớp + RLS; idempotency `requestId` và claim/lease; snapshot đóng băng bằng chứng chấm; Judge async qua Cloud Tasks; hợp đồng `weighted-v1` và rubric 5 tiêu chí; cờ mặc định tắt + migration cộng thêm có rollback; quy trình deploy revision no-traffic → kiểm tra → promote.
