# Minimal multi-agent workflow: preflight và kế hoạch cần duyệt

Ngày 10/10/2026. Thay thế phần triển khai framework lớn trong đề xuất trước bằng một vertical slice nhỏ. Chỉ audit, probe vô hại và viết báo cáo trong lượt này; chưa chạy coding worker, integration hoặc sửa runtime. Chưa tạo snapshot/commit/worktree. Không reset, stash, push, deploy hoặc mở file secret.

## Baseline status

Nhánh `rebuild`, HEAD `d7ac9d1fa28a4038cc922daea8ce20e27a13afd6`. Có 28 tracked paths thay đổi, gồm cả xóa đã tồn tại trước lượt này. Inventory đọc byte/hash và quét tín hiệu integration trên tất cả 840 file có extension source/config trong tracked + untracked không bị ignore: 171 tracked, 669 untracked; 3 tracked source bị xóa. Không coi hash/pattern inventory là review ngữ nghĩa từng dòng của toàn bộ repository.

Inventory: `outputs/multi-agent-preflight/source-inventory.json`. Phạm vi: api 4, src 157, scripts 70, test 51, supabase 53, design-drafts 480, docs source/config 16; còn lại là curriculum/config root. Binary documents/assets và ignored files không được đọc theo quy trình này; env bị loại trừ. Đây không phải chứng nhận source không có secret nhúng.

Các file rebuild/API/test và migrations 027–047 vẫn untracked. Snapshot từ HEAD sẽ thiếu chúng. Giữ nguyên các deleted paths theo hiện trạng; nội dung cũ vẫn có trong Git, không tự khôi phục hoặc xóa thêm. Prototype/generator phải được bảo toàn để runtime sinh lại không mất UI kết hợp.

**Đề xuất snapshot an toàn, chưa thực hiện:**

1. Tạo manifest explicit chứa tracked source hiện hữu, runtime rebuild, api, test, scripts/generators, config/lockfile, curriculum, toàn bộ migration/rollback history, prototype input và tài liệu nguồn đã duyệt. Ghi tombstones cho deleted tracked paths.
2. Rà manifest và secret scan ở chế độ chỉ báo path/vị trí, không in giá trị; exclude env, credential, cloud profiles, outputs/temp/node_modules/dist. Nếu scanner nghi ngờ thì giữ nguyên bản gốc và chặn snapshot cho đến khi phân loại, không tự sửa secret.
3. Tạo archive source-only ở vùng controller, không thay index/repo; kèm manifest SHA-256 và base Git SHA. Kiểm tra restore archive vào thư mục riêng, verify byte hashes, tombstones và required paths. Không tự dùng `git add .`.
4. Chạy baseline gates đã chọn trong restored copy không có production env: typecheck/build và offline tests đã review. Gate ghi riêng known failures. Không chạy rộng runner hiện tại vì denylist chưa bảo đảm offline.
5. Để dùng Git worktrees, sau khi chủ repo duyệt manifest và baseline, tạo snapshot commit cục bộ bằng index riêng/temporary clone với chỉ manifest được duyệt; không đổi index/branch hiện tại, không push. Bước này cần approval cụ thể cho baseline, chưa được thực hiện. Nếu chưa duyệt commit, vẫn có thể chuẩn bị archive nhưng chưa có approved worktree baseline.

Baseline blockers: chưa có snapshot đã duyệt; chưa xác minh restore/build trên source-only copy; lint chưa có script/config; TypeScript hiện include `src`, không bao trọn API/tests/scripts. Không so sánh remote main, không fetch vì không cần so sánh main trong preflight.

## Antigravity compatibility: bằng chứng local

Binary `C:\Users\Admin\AppData\Local\agy\bin\agy.exe`, version 1.0.0. Probes chạy với temporary cwd riêng, env allowlist, HOME/USERPROFILE/APPDATA/LOCALAPPDATA/XDG trỏ empty-home; không đọc/copy credential có sẵn. Prompt chỉ yêu cầu trả PROBE_OK, cấm tools/file actions. Không coding task.

**Giới hạn:** temporary directory và env redirection không tạo OS security boundary. Binary có thể dùng cơ chế auth/config ngoài các env đó. Không thể xác nhận không có network/provider activity chỉ từ stdout. Chưa thử file-write hoặc shell permission, vì chưa có OS isolation đã chứng minh. Không truy cập credential chủ repo để làm auth test thành công.

Raw evidence: `outputs/multi-agent-preflight/antigravity-probes.json`.

| Khả năng | Kết quả | Trạng thái |
|---|---|---|
| Version/basic help | 1.0.0; launcher help chỉ hiển thị một phần cờ | PASS metadata |
| Print và timeout | `--sandbox --print-timeout 1s -p ...` trả timeout diagnostic; tổng process ~7 giây | Parser/timeout signal có; chưa có prompt hoàn tất |
| Structured output | JSON envelope thực tế trả `status=SUCCESS`, response rỗng, usage=0 trong khi stderr báo turn đang chạy/timeout | Hỗ trợ format, nhưng SUCCESS không đáng tin để certify completion |
| JSON schema | Không có output-format thì trả lỗi bắt buộc json/stream-json | Flag được parser nhận; schema enforcement chưa chứng minh |
| Model selection | Model sai bị reject exit 1 với JSON ERROR và danh sách model; parser có `--model` | Validation PASS; chưa có model hợp lệ thực chạy thành công |
| Input format/effort/mode | Xuất hiện trong help khi invalid duration; khác launcher help | Parser quảng bá; chưa chứng minh execution |
| Authentication | Không nhận PROBE_OK hoàn tất; không kiểm tra credential thật | UNVERIFIED; không kết luận đã đăng nhập hoặc thiếu auth |
| Permissions/sandbox | `--sandbox` được nhận, không thử thay đổi file/chạy shell | Enforcement UNVERIFIED |
| Duration validation | Invalid duration trả exit 2 | PASS parser |
| Model enumeration | `agy models` không cho output trước external timeout | Không sử dụng để resolve model |

Probe với `--help` có thể short-circuit, nên exit 0 ở các probe đó không chứng minh flag execution. Các probes follow-up bỏ help đã cung cấp parser/JSON evidence phía trên. External watchdog được dùng; follow-up timeout chấm dứt process tree. Một probe enumeration đầu dùng subprocess timeout chỉ kill parent; cần kiểm tra residual child processes ở môi trường probe trước khi thử lại. Không mặc định coi cleanup process tree đã hoàn hảo.

**Compatibility chưa PASS.** Trước worker phải có isolated auth được chủ tài khoản thiết lập, một prompt no-tools hoàn tất đúng PROBE_OK, chọn model hợp lệ, structured result có schema hợp lệ, không timeout/partial và permission negative tests pass. Không update CLI hoặc auto-login để vượt blocker.

## Minimal architecture

`Planner GPT → approved contract → controller → isolated Antigravity worker → scope/diff + independent gates → fresh GPT Reviewer → candidate report for human approval`.

Planner và Reviewer có thể là phiên GPT mạnh do người điều hành chạy thủ công trong pilot; không cần framework gọi model tự động. Reviewer không cùng context worker, read-only và không dựa vào verdict của tác giả. Smaller GPT adapter là optional extension; thiếu provider thì ghi NOT_AVAILABLE, không pretend đã chạy hai model.

Controller duy nhất, một task chạy trước. JSON contract + JSON state ghi atomic + JSONL events đủ; không SQLite, distributed leases, queue, scheduler hoặc DAG engine. Chỉ cần `dependencies` IDs và reject dependency chưa APPROVED. Hai-worker extension dùng hai processes và hai working directories, path ownership không giao nhau; integration luôn do người quản lý duyệt.

### File structure dự kiến, chưa tạo code

```text
scripts/multi-agent/
  run.mjs                  # single-process controller / CLI
  contract.schema.json     # scope, base hash, gates, budget, dependencies
  policy.json              # trusted command IDs, hard deny paths
  adapters/antigravity.mjs  # spawn, capture, strict completion checks
  adapters/small-gpt.mjs    # optional; same contract/output interface
  verify.mjs               # scope/patch hashes + trusted gate runner
test/multi-agent/
  verify_controller.mjs     # fake adapters for policy/failure tests
docs/
  MULTI_AGENT_MINIMAL_PREFLIGHT_2026-10-10.md
<controller-owned ignored run directory>/
  <run-id>/contract.json, state.json, events.jsonl, patch.diff, gates.json, review.json
```

Không thêm runtime dependency hoặc import vào `src`, `api`, Vite/Vercel config. State chỉ lưu task/attempt IDs, base/tree hashes, paths, timestamps, exit, gate verdict, review verdict và error category; log redact trước persist, cap dung lượng. Resume một interrupted task phải verify hashes và không có process cũ; không resume conversation tự động. Restart attempt từ approved baseline sau khi giữ patch lỗi, trong retry budget.

### Contract và enforcement tối thiểu

Required: ID/base manifest hash, objective, read/write allowlists, forbidden paths, dependencies, risk, acceptance, trusted gate IDs, adapter/model choice, max attempts=2, worker timeout=15 phút, overall run timeout=60 phút. `shell=false`, arguments array, cwd riêng và env allowlist. Gate policy là controller-owned, workers không sửa được. Cấm symlink/junction escape và Git metadata/cloud credential access.

Worktrees không phải sandbox. Preflight chọn container/WSL hoặc restricted Windows account phù hợp với CLI, kiểm thử deny read/write/network bên ngoài task. Nếu không chứng minh boundary thì không chạy coding worker trên host thật. Worker không được quyền terminal tự do; tests do controller chạy. Không dùng dangerously-skip-permissions để làm việc trên checkout/homedir thật.

Worker completion đòi hỏi output schema hợp lệ + response không rỗng + không timeout/interrupted/permission-denied + actual diff trong scope. Exit 0 hoặc JSON SUCCESS đơn lẻ bị từ chối. Gate vẫn chạy độc lập; worker không có quyền định nghĩa shell command test tùy ý.

Reviewer trả APPROVE/REVISE/REJECT kèm base/tree hashes, evidence, findings và unmet criteria. REVISE cho đúng một repair attempt; REJECT, scope violation, auth/permission failure thì dừng, không auto-escalate permissions. Mọi thay đổi patch sau review invalidates review. Pilot không auto-merge/push/deploy, không integration trước approval.

## Milestones và acceptance khách quan

| Mốc | Deliverable | Acceptance để qua mốc |
|---|---|---|
| M0 — baseline | Approved manifest + restored source-only snapshot | Required rebuild/API/tests/migrations/generators có đủ; hash restore khớp; secrets không included; current checkout/index nguyên trạng |
| M1 — compatibility + isolation | Real local CLI capability report | No-tools prompt trả PROBE_OK; valid model ghi nhận; schema validated; timeout không coi success; auth riêng; outside-scope read/write/network denied; process tree cleanup pass |
| M2 — controller | Minimal files trên, fake adapter tests | Reject malformed contract, out-of-scope diff, secret/capability violations; max 2 attempts; interrupted state không được pass; logs không chứa canary secret |
| M3 — one vertical slice | Antigravity thêm một test telemetry file | Worker thực chạy trong isolated baseline; controller reruns new + relevant existing tests; source/runtime/lockfile không đổi; fresh Reviewer verdict recorded; owner nhận patch |
| M4 — two-worker extension | Antigravity telemetry + smaller GPT rubric test | Hai independent contracts, files riêng; cả hai có real execution evidence và separate gates/reviews; combined candidate chỉ tạo sau approval, gates chạy lại |

M0/M1 và plan approval bắt buộc trước coding worker. M2 chỉ bắt đầu sau approval triển khai controller. M3 không bỏ qua M1 bằng fake adapter success. M4 nếu GPT nhỏ chưa available thì vẫn chỉ hoàn thành one-worker slice, không đánh dấu pilot hai worker pass.

Task vertical slice: chỉ thêm `test/verify_governance_telemetry_edges.ts`, test date month/year boundaries, missing vs valid-zero telemetry, incomplete-run exclusion, input immutability. Task thứ hai: chỉ thêm `test/verify_weighted_rubric_edges.ts`, invariants total=100/non-mutation/inactive weights, invalid judge numbers và recomputed totals. Không sửa implementation nếu gặp bug; báo unmet acceptance và tạo contract riêng.

Baseline/gates dùng existing pinned TypeScript/tsx/Vite. Không cài lint framework trước chứng minh slice: khai báo lint NOT_CONFIGURED; deterministic pilot checks là schema, syntax/type checks phù hợp, scope/secret scan và meaningful tests. Thiết lập lint toàn repo là task sau, không gọi pilot hiện tại lint-clean. Build/typecheck toàn app chạy trong trusted source-only restored snapshot; API/scripts/tests coverage ghi riêng, không suy ra từ tsconfig src-only.

Đầu ra thật cuối vertical slice phải gồm contract, patch, diff audit, independent gate logs, reviewer verdict, attempt log và một câu giới hạn rõ rằng đó là workflow pilot, không chứng nhận toàn ứng dụng production. Điều kiện human approval là giữ lại, không thêm broad auto-merge hoặc scheduling để đạt pilot.
