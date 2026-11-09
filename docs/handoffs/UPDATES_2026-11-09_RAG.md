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

## Lưu ý

- Mọi SOP tải lên từ nay được embed bằng `text-multilingual-embedding-002` (Vertex, asia-southeast1), cùng model với production.
- Embedding không đi qua admission Gemini (`admittedModelService.ts:7`).
