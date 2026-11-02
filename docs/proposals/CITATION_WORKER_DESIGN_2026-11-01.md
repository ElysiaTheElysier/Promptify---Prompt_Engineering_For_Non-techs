# Citation worker — thiết kế (2026-11-01)

Trạng thái: **thiết kế, chưa code**. Bằng chứng: CODE (đọc source), chưa có OFFLINE/LIVE.
Chủ sở hữu: Generation/RAG async (014) thuộc Codex → cần ghi vào TRACKER trước khi sửa. Judge không đổi.

## 1. Quyết định

Citation worker đặt ở **phía Generator**, không đặt ở Judge.

- Citation phải nằm trong output SOP mà learner nhận; Judge chỉ chấm, không sửa output.
- Judge đã chấm citation qua tiêu chí `groundedness` (30%, `weightedRubricService.ts:4`) trên evidence đã freeze (`judgeEvidence`, `rebuildRunService.ts:98`).
- Thêm worker vào Judge = thêm lượt gọi provider và đụng scoring contract `weighted-v1` (cần duyệt).

## 2. Hiện trạng (CODE)

| Thành phần | Có sẵn | Vị trí |
|---|---|---|
| Retrieval SOP (pgvector/BigQuery) | Có | `cloudSopRetrievalService.ts`; gọi tại `rebuildRunService.ts:206` (sync), `:503` (async lease) |
| Tag citation trong context | Có: `[SOP:<versionId>:vN] [Page N]` | `productionServerService.ts:195,356` |
| Freeze context + `rag_chunks` trước Gemini | Có | `actual_generation_context(_hash)`, `product_freeze_generation_context` |
| Quyết định "prompt cần citation?" | **Không** | — |
| Kiểm tra citation trong output | **Không** | — |

## 3. Pipeline mới

```
prompt
  → [A] decideCitation(lesson, prompt)        // luật, 0 lượt gọi AI
  → RAG (giữ nguyên)
  → freeze snapshot (thêm citation_decision)
  → Gemini (giữ nguyên, 1 permit/lượt như cũ)
  → [B] verifyCitations(output, rag_chunks, rebuild_sop_versions)   // thuần, 0 lượt gọi AI
  → rebuild_finish_run(result + citations)
  → Judge (KHÔNG đổi)
```

Cả A và B đều là hàm thuần trong một file mới `src/services/citationService.ts`, gọi từ cả luồng sync và luồng async lease để hai luồng không lệch nhau.

### [A] decideCitation

```ts
type CitationDecision = { required: boolean; reason: 'no-sop'|'rubric'|'prompt'|'none'; policy: 'citation-gate-v1' };
```

Luật theo thứ tự:
1. Lesson không có `rebuild_sop_versions` → `required:false, reason:'no-sop'`.
2. Rubric có `groundedness` đang `active` và `weight>0` → `required:true, reason:'rubric'`.
3. Prompt khớp từ khoá (VI/EN, không phân biệt dấu/hoa thường): `sop, trích, trích dẫn, nguồn, căn cứ, theo quy định, chính sách, cite, citation, source, reference, policy` → `required:true, reason:'prompt'`.
4. Còn lại → `required:false, reason:'none'`.

Ghi `citation_decision` vào snapshot **trước** freeze → retry/replay dùng lại đúng quyết định, không tính lại.

**Gate KHÔNG bỏ qua retrieval.** Lý do: khi không chạy RAG, context rơi về toàn bộ SOP canonical (tới 100 000 ký tự), lớn hơn top-10 chunk → *tăng* token Gemini. Retrieval phục vụ grounding chứ không chỉ citation. Gate chỉ điều khiển [B], UI và metric. Việc bỏ retrieval khi `required:false` chỉ xét sau khi đo token thật.

### [B] verifyCitations

```ts
type CitationCheck = { tag: string; versionId: string; version: number; page: number|null;
                       status: 'verified'|'unknown-version'|'page-not-retrieved'|'not-admitted' };
type CitationReport = { required: boolean; found: number; verified: number; checks: CitationCheck[] };
```

- Parse mọi tag `\[SOP:([^:\]]+):v(\d+)\](?:\s*\[Page (\d+)\])?` trong output.
- `not-admitted`: versionId không thuộc `rebuild_sop_versions` của lần chạy.
- `unknown-version`: versionId đúng nhưng số version khác.
- `page-not-retrieved`: có page nhưng không trùng page nào trong `rag_chunks` (khi `rag_status` là pgvector/bigquery). Với `fallback-canonical` thì bỏ qua kiểm tra page.
- Giới hạn 200 tag/output để chặn output lỗi phình to.
- Không sửa `output`. Báo cáo lưu ở `result.citations`.

## 4. Quy tắc sư phạm (bắt buộc)

Worker **không** chèn citation, và **không** chèn câu "hãy trích nguồn", vào prompt, system instruction hay output. Groundedness chấm xem learner có biết viết prompt đòi bằng chứng không (pillar "prove", `promptLearningService.ts:8`). Tự cite hộ learner sẽ thổi phồng 30% điểm.

## 5. Judge

- Pha 1: **không đổi.** Judge vẫn đọc `judgeEvidence(s)` như hiện tại.
- Pha 2 (cần duyệt riêng, đụng chấm điểm): đưa `CitationReport` vào evidence của groundedness để Judge không phải tự dò tag. Phải chạy so sánh trên bộ có nhãn trước khi bật.

## 6. Flag và rollout

`CITATION_GATE=off|log|on`, mặc định `off`, đọc giống `injectionGuardMode()` trong `learnerSafeguardService.ts:10`.
- `off`: không chạy A/B; hành vi giữ nguyên.
- `log`: chạy A/B, ghi `citation_decision` + `citations` vào snapshot/result và log có cấu trúc (`required, reason, found, verified`); UI không hiển thị.
- `on`: thêm hiển thị trên UI: link citation tới trang SOP, đánh dấu tag không xác minh được, cảnh báo khi `required` mà `found=0`.

Không cần migration: snapshot/result là JSON sẵn có. Rollback = đặt flag về `off`; dữ liệu đã ghi vô hại.

## 7. Test (OFFLINE)

- `decideCitation`: đủ 4 nhánh, từ khoá có dấu/không dấu, rubric groundedness weight 0.
- `verifyCitations`: tag hợp lệ, sai version, version ngoài admitted, page không retrieve, fallback-canonical, tag không có page, 0 tag, >200 tag.
- Luồng sync và async lease ra cùng `CitationReport` cho cùng snapshot.
- Replay/retry dùng `citation_decision` đã freeze, không tính lại.
- Flag `off`: `result` giống hệt baseline (không có key mới).
- Số lượt gọi provider và số permit admission không đổi ở cả 3 mode.

## 8. Câu hỏi còn mở

1. Danh sách từ khoá ở luật 3: trainer cấu hình theo lesson, hay cố định?
2. Khi `required` mà output không có citation hợp lệ: chỉ cảnh báo trên UI (đề xuất), hay chặn/tạo lại? Tạo lại tốn thêm lượt gọi Gemini và cần duyệt quota.
3. Pha 2 có đưa vào kế hoạch không, và ai duyệt thay đổi chấm điểm.
