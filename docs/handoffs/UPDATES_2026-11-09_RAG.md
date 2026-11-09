# Bật RAG pgvector trên staging (09/11/2026)

Theo yêu cầu của chủ dự án ("bật RAG, sao cho thành RAG thật"). Thực hiện bằng ADC của `demo.biz@intrepid.asia`. Không đổi code, model Gemini, Judge hay scoring.

## Vì sao trước đó RAG không chạy

- Revision `slides-1104` không đặt `GCP_VECTOR_MODE`, nên `rebuildRunService.ts:209` bỏ qua retrieval. Cả 91 run trên staging đều có `rag_status` rỗng.
- Kể cả khi bật cờ, `intrepid_search_sop` (`gcp/sql/004_pgvector_vertex.sql:40`) chỉ lấy chunk có `model='text-multilingual-embedding-002'`. Staging không đặt `EMBEDDING_MODEL`, nên mọi chunk được lưu bằng `gemini-embedding-001` (`sopIngestionService.ts:89`), và tìm kiếm trả về 0 chunk.
- Cloud SQL staging không bật flag `cloudsql.enable_google_ml_integration`, nên embedding phải đi qua Vertex `:predict`, không qua SQL như `gcp/production.env`.

## Đã làm (LIVE)

| Bước | Kết quả | Rollback |
| --- | --- | --- |
| Backup on-demand `before-rag-reindex-20261109` | SUCCESSFUL | Restore backup này |
| Revision `promptify-intrepid-api-rag1-1109`: cùng image `sha256:8a6aba12…` với `slides-1104`, thêm `GCP_VECTOR_MODE=pgvector`, `EMBEDDING_MODEL=text-multilingual-embedding-002`, `EMBEDDING_LOCATION=asia-southeast1` | `/readyz` 200 qua tag `rag1`, rồi nhận 100% traffic | Chuyển traffic về `promptify-intrepid-api-slides-1104` (tag `slides` vẫn giữ) |
| Đánh chỉ mục lại `product_sop_chunks` | 18 chunk / 15 version (toàn dữ liệu FICTIONAL/QA) chuyển sang `text-multilingual-embedding-002`, một transaction; 0 contribution pending có cache cũ | Restore backup; hoặc embed lại bằng `gemini-embedding-001` |

Sau khi rollback traffic, phải embed lại chunk bằng `gemini-embedding-001` hoặc restore backup. Nếu không, tìm SOP trong UI (nhánh JS similarity) sẽ so hai không gian vector khác nhau.

## Kiểm tra

- LIVE: `/readyz` 200; `/api/product` không token qua Hosting 401.
- LIVE (SQL, read-only, danh tính learner giả lập): `intrepid_search_sop` trả 5 chunk có citation `[SOP:<version>:v1] [Page N]` cho câu hỏi tiếng Anh và tiếng Việt. Trước đó trả 0 chunk.
- **Chưa kiểm:** một lượt Run thật trên UI. Lượt Run kế tiếp phải có `snapshot->>'rag_status' = 'pgvector'` và `rag_chunks` trong `rebuild_runs`.

## Benchmark RAG (LIVE, 09/11)

Script chạy từ máy local, gọi thẳng code app (`productionGenerate`, `productionEvaluate`, `embedSopChunks`) với Vertex `gemini-3.8-flash` thật. SQL chỉ chạy READ ONLY. Đo thời gian provider, không đo request end-to-end qua Cloud Run. N nhỏ, chỉ dùng để định hướng.

**S1: bài "Follow up ticket 43" trên staging (4 SOP, 5 chunk), N=3 mỗi chế độ**

| Chỉ số | Toàn bộ SOP (trước RAG) | RAG pgvector |
| --- | --- | --- |
| Retrieval (embed + `intrepid_search_sop`) | 0 | 399–637 ms (embed 317–553 ms) |
| Generation | 6981 (lần đầu, lạnh) / 1669 / 1830 ms | 1631 / 1807 / 1632 ms |
| AI Judge (6 lời gọi) | 3406 / 6033 / 3680 ms | 3832 / 2871 / 2833 ms |
| Kết quả đúng (normal, 2 business days, citation hợp lệ) | 3/3 | 3/3 |
| Điểm Judge | 9.63 / 10 / 10 | 10 / 10 / 10 |

Retrieval trả 5/5 chunk, tất cả thuộc SOP của bài. Khi hỏi 11 version không gắn với bài, kết quả trả về 0.

**S2: kho giả lập 40 section, 83.288 ký tự (retrieval cosine in-memory, cùng model)**

- Retrieval: target đứng top-1 1/5 lần, top-3 5/5 lần. Các section cùng phòng ban gần như trùng mẫu, nên similarity chỉ chênh 0,002–0,003.
- Token Generation giảm từ khoảng 24.000 xuống khoảng 6.600 (−73%). Thời gian không giảm: toàn bộ SOP 4568 / 3935 / 6081 ms, RAG 5477 / 11459 / 4978 ms.
- Judge với toàn bộ SOP: 5195 ms, **504 timeout** (35 s, 2 lần gọi treo), 14730 ms. Judge với RAG: 12624 / 4214 / 6473 ms.
- Cả 6 output đều trích đúng nguồn target, nhưng mỗi output trích thêm 4 nguồn khác. Một output RAG không chứa chuỗi "2000" (chưa kiểm do định dạng số hay sai).

## Sửa crash API và tăng capacity staging (09/11, LIVE)

- **Lỗi:** Cloud Run log 04–06/11 có 11 lần `Connection terminated unexpectedly`, `Emitted 'error' event on Client instance`. Node crash nên instance khởi động lại, và mọi request đang chạy (Run, Judge) đều lỗi theo. Pool chỉ nghe lỗi của client rảnh; client đang được dùng thì không ai nghe.
- **Sửa:** commit `c8c6700`. Mỗi client của pool có listener `'error'`, chỉ log mã lỗi. Query đang chạy vẫn bị reject, và `sqlTransaction` huỷ client hỏng. Test `verify_sql_pool_errors.ts` tái hiện lỗi; offline 93/93, lint, typecheck, boundaries, build, smoke đều PASS.
- **Image:** `app:rel-20261109-c8c6700` (`sha256:381c3310…`), Cloud Build `ff96340f` build từ `git archive` của commit, không overlay.
- **Revision:** `promptify-intrepid-api-rel1-1109` nhận 100% traffic. Giữ nguyên 31 biến môi trường (có RAG). Service `maxInstanceCount` 1 → 10, `minInstanceCount` 1 (1 instance luôn ấm). Rollback: chuyển traffic về `promptify-intrepid-api-rag1-1109`.
- **Queue** `promptify-judge-staging`: `maxConcurrentDispatches` 3 → 10.
- **Judge 14 ngày (log LIVE):** 42 lượt, 42 chấm xong, 0 lỗi, 0 dispatch lại. Evaluate p50 3,4 s, p90 4,9 s, max 18,1 s. Chờ trong queue khoảng 0,1 s.
- **Đã kiểm sau deploy:** `/readyz` 200, `/api/product` không token 401, preflight `/api/judge-stream` 204, Hosting `/` 200.

## Load test, restore, trích dẫn (09/11 chiều, LIVE staging)

**Load test AI Judge.** Code `productionEvaluate` thật, Gemini thật, chạy từ máy local. Mỗi lượt chấm có deadline 270 s và được thử lại khi gặp 429/503/504 như queue.

| Kịch bản | Thành công | Thử lại (provider) | Thời gian chấm p50/p90/max | Người dùng chờ p50/p90/max |
| --- | --- | --- | --- | --- |
| 10 lượt cùng lúc | 10/10 | 0 | 3,4 / 4,9 / 4,9 s | như cột trước |
| 50 lượt, queue 10 | 50/50 | 0 | 3,7 / 5,2 / 8,0 s | 12,3 / 20,3 / 22,1 s |
| 50 lượt, 50 song song | 50/50 | 5 | 6,3 / 10,0 / 14,3 s | như cột trước |
| 100 lượt, 50 song song | 100/100 | 26 | 4,6 / 12,7 / 16,7 s | 10,0 / 13,4 / 20,6 s |
| 100 lượt, 100 song song | 100/100 | 36 | 5,3 / 12,9 / 13,9 s | như cột trước |

Kết luận: Vertex chịu được 600 lời gọi đồng thời; các lỗi 429 đều được thử lại thành công. Nút cổ chai là queue (10 lượt song song, 1 lượt/giây). Đã đổi thành 100 lượt song song và 50 lượt/giây. Chưa load test xuyên qua Cloud Tasks → Cloud Run → SQL bằng danh tính thật.

**Diễn tập restore.** Clone PITR `promptify-staging` → `promptify-staging-restore-1109` (thời điểm cách 10 phút). Đọc được sau **8,6 phút**. Số dòng 7 bảng (users 1262, classes 45, enrollments 1261, prompt_attempts 88, rebuild_runs 91, product_sop_chunks 18, product_judge_jobs 54) khớp bản gốc. Clone thừa hưởng chế độ chống xoá; đã tắt riêng trên clone rồi xoá.

**Kiểm tra trích dẫn (Pha 1 của thiết kế 01/11), commit `4336bbf`:**
- `citationService.ts`: `decideCitation` + `verifyCitations`, 0 lời gọi AI, không sửa output, không đụng Judge.
- Quyết định được đóng băng trong snapshot; báo cáo nằm ở `result.citations` (cả luồng sync và async).
- `CITATION_GATE=on`: workspace hiển thị "n/m trích dẫn khớp SOP của bài" và liệt kê thẻ sai phiên bản hoặc không thuộc bài.
- Test `verify_citations.ts`. Offline 94/94; lint, typecheck, boundaries, build, smoke PASS.
- Harness local (`tmp/citation-harness`, bị ignore) hiển thị đúng EN/VI, 4 tình huống.

**Deploy:**
- API `rel3-1109`: image `sha256:7884064a…`, thêm `CITATION_GATE=on`, `DISABLE_PUBLIC_BASIC=true`. `enrollBasic` giờ trả "Public Basic enrollment is not available.".
- Hosting `7ddf53ed` (config copy từ version live, rollback `b1cc6c40`). Asset live khớp bản build; `/` no-store; `/api/product` không token 401.

**Rà bảo mật (CODE):**
- TM-001: có `verify_tenant_isolation.ts` (ma trận từ chối truy cập, SQL thật trên PGlite) trong `npm test`.
- TM-002: không bật trên staging, vì 11/12 client chưa có domain và sẽ ẩn 47 lớp.
- TM-003, 004, 006, 007, 008, 009: còn mở như threat model 31/10. Chi tiết xem `05_OPEN_ISSUES.md`.

## Lưu ý

- Mọi SOP tải lên từ nay được embed bằng `text-multilingual-embedding-002` (Vertex, asia-southeast1), cùng model với production.
- Embedding không đi qua admission Gemini (`admittedModelService.ts:7`).
