# PERFORMANCE AUDIT — AI pipeline, độ trễ, chi phí (23/10/2026, bộ bổ sung LIVE)

Nguồn LIVE: log Cloud Run 7 ngày (17–23/10, 4.848 dòng) `apps/promptify-intrepid/outputs/audit-2026-10-23/run-logs-7d.json`. Nhãn: LIVE / CODE / OFFLINE / EXTRAP (tính từ số đo) / ASSUMP (giả định).

## 1. Đường đi của một lần Run (CODE)

| Bước | Lời gọi model | Song song? | Giới hạn |
|---|---|---|---|
| Nạp ngữ cảnh, preflight (PII, injection, token phiên, hạn), `rebuild_begin_run` | 0 | tuần tự | ngữ cảnh SOP ≤100k ký tự |
| Generator (JSON 50s hoặc stream 240s) | **1** (+1 nếu 429/503) | — | 4096 token ra, thinking LOW |
| Judge async: Supervisor + 5 Worker | **6** | **cả 6 cùng lúc** | Supervisor 1024, Worker 1536 token; hạn 270s; **mỗi lời gọi được dùng cả hạn còn lại** (`parallelJudgeService.ts:12-14,38`) |
| Tổng hợp `weighted-v1` | 0 | — | tất cả hoặc không |

- **Một Run = 7 lời gọi.** Prompt lạc đề (chào hỏi) **vẫn 7**: Supervisor không chặn trước Worker; bộ lọc chào hỏi 0-lời-gọi chỉ có ở đường cũ (`productionAiService.ts:152`), không có ở `parallel-v1`.
- Khi Judge lỗi: Cloud Tasks thử lại **chạy lại cả 6 lời gọi** (kể cả bước đã xong). Trần lý thuyết 72 lời gọi/job; **đã quan sát 18 lời gọi, 0 điểm** (LIVE).
- Mỗi lời gọi (kể cả thử lại) đi qua `admittedModelRequest` → đúng quy tắc "mỗi lần gọi một permit", nhưng admission đang tắt.

## 2. Độ trễ đo được

| Đoạn | p50 | p95 / max | Mức |
|---|---|---|---|
| `POST /api/product` (n=4.099) | 0,40s | p95 2,5s · p99 10,65s · max 51,8s | LIVE |
| 504 trên `/api/product` (8 lần) | ~51s | — | LIVE — đều ở revision Judge đồng bộ cũ (19–22/10) |
| `/api/stream` (n=6) | 3,05s | max 37,5s | LIVE |
| Generator `latency_ms` (3 Run 23/10) | 2,2s | 36,5s | LIVE |
| Xếp hàng Judge (lần dispatch đầu) | 0,12–0,15s | — | LIVE |
| Judge chấm (3 job thành công 23/10) | 7,0s | 3,6 / 7,0 / 14,1s | LIVE (n=3, chưa đủ để nói p95) |
| Từng bước: Worker / Supervisor | 2,6s / 2,5s | 14,1s / 7,0s | LIVE |
| **Đuôi chậm** (job `f7a3fc37ff2f`, 07:48–08:03Z) | 4–5/6 bước xong trong 2–13s | 1 bước treo **97 → 270s** mỗi lần, 3 lần liên tiếp, kết thúc `failed` | **LIVE** |
| Judge toàn trình (22/10) | — | 43s và 131s | LIVE |
| Vertex publisher p95 (22/10) | — | 79–341s | LIVE (theo 05_OPEN_ISSUES) |
| Poll của client | 1s (10s đầu) → 3s → 10s | — | CODE |

**Phân rã Judge < 10 giây (EXTRAP):** gửi yêu cầu 0,9s + xếp hàng 0,13s + chấm + phát hiện qua poll ≤1s ≈ **5,6s / 9,0s / 16,2s** cho 3 job đo được. → **Dưới 10s đạt được ở trung vị khi tải nhẹ**, nhưng **không đạt ở p95**: độ trễ = lời gọi chậm nhất trong 6 lời gọi song song, và đuôi provider dài 97–341s. Muốn p95 < 10s cần **kiểm soát đuôi** (timeout từng bước + thử lại/hedge), không phải thêm song song.

## 3. Thắt cổ chai hiệu năng có thể tái hiện

1. **Đuôi một bước làm hỏng cả job** (L01, LIVE). Thử lại chạy lại cả 6 bước.
2. **Ngữ cảnh SOP gửi lặp 5 lần** — mỗi Worker nhận nguyên `approvedContext` (`parallelJudgeService.ts:76`). Khuếch đại ngữ cảnh: A 5,52× · B 1,22× · C 1,16× (OFFLINE). Bài staging có ngữ cảnh nhỏ nên LIVE chưa thấy; với SOP 100k ký tự, A gửi ~140k token vào/lần chấm (EXTRAP).
3. **Năng lực Judge = 3 job đồng thời** (LIVE queue) ≈ 25 job/phút ở 7s/job (EXTRAP).
4. **Snapshot nặng, tuần tự, bị poll** (A6 trong ARCHITECTURE_REVIEW).
5. **Kiểm tra trạng thái Judge** mỗi lần poll tốn ~5 transaction, có một `FOR UPDATE` (`rebuildRunService.ts:258-272`).
6. **Khi bật admission**: mỗi lời gọi đang chờ permit poll SQL 4–10 lần/giây trên pool 5 kết nối → sẽ đói pool (CODE, chưa đo).

## 4. Mô hình chi phí (ASSUMP giá)

Giá giả định: $0,75 / 1M token vào, $3,75 / 1M token ra (giá giới thiệu gemini-3.8-flash trong proposal 22/10, **chưa đối chiếu SKU Vertex**; giá chuẩn từ 01/01/2027 gấp đôi).

| Hạng mục | Token đo được (LIVE) | Chi phí ước tính |
|---|---|---|
| Judge (1 job) | 3.828 – 4.508 tổng | ≈ $0,003 (toàn bộ là vào) – $0,015 (toàn bộ là ra); ≈ **$0,0066** nếu 70% vào |
| Generator | 218 – 336 | ≤ $0,0013 |
| **Một Run** | ~4,1–4,8k | **≈ $0,007 – 0,017** |
| Job lỗi đuôi | 18 lời gọi | ~3× một job, không ra điểm |

Chưa đo được: tách token vào/ra/thinking (log chỉ có tổng), số tiền thực bị tính, việc lời gọi bị huỷ do timeout có bị tính phí không.

## 5. Đơn giản hoá Judge mà không đổi `weighted-v1`

| Phương án | Lời gọi | Rủi ro chất lượng | Ghi chú |
|---|---|---|---|
| **A + kiểm soát đuôi** (timeout từng bước ~20–25s, thử lại riêng bước đó; giữ kết quả bước đã xong khi dispatch lại) | 6 | **Không** (prompt giữ nguyên) | Lợi lớn nhất cho p95; làm trước |
| A + đặt phần chung (policy + bằng chứng) lên đầu payload | 6 | Không (chỉ sắp xếp lại) | Tận dụng cache tiền tố ngầm của Vertex nếu có (chưa xác minh) |
| A + chặn chào hỏi/lạc đề rẻ trước Worker | 1–6 | Thấp | Áp lại bộ lọc chào hỏi sẵn có cho `parallel-v1` |
| B `consolidated-v1` | 2 | Trung bình | ~64% rẻ hơn (OFFLINE); **chưa từng chạy quality gate** — không phải "đã trượt" |
| C `integrated-v1` | 1 | Cao (chống thao túng và chấm chung một ngữ cảnh) | — |

**Thí nghiệm tương đương (đề xuất, chưa chạy):** bộ cố định 80–120 bài đã ẩn danh (có chào hỏi, injection, ca biên, trích dẫn, SLA), một phần do 2 giảng viên chấm đối chiếu; chạy A/B/C cùng bằng chứng, đồng thời thấp, qua admission. Cổng: 0 trường hợp đạt sai nghiêm trọng; ≤2 điểm % lệch đạt/trượt; MAE tổng ≤ A + 0,25; MAE từng tiêu chí ≤ A + 0,15; JSON hợp lệ ≥ 99%. Chạy A hai lần để đo nhiễu nội tại (temperature bị bỏ với Gemini 3.6+, `vertexAiService.ts:23-28`).

## 6. Chưa đo
Chất lượng B/C; p95 Judge với mẫu đủ lớn; dung lượng payload snapshot; thời gian chờ pool khi tải; hành vi admission trên Cloud SQL thật; tỉ lệ cache Vertex; Judge với SOP lớn. **Không suy ra năng lực đa người dùng thật từ benchmark pipeline đơn lẻ.**
