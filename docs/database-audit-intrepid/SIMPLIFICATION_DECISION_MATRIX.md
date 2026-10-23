# Simplification decision matrix — Second pass

**Ngày:** 2026-10-13. Actions là đề xuất đối với **internal target scope B**, không phải authorization thực thi. REMOVE = ngừng future feature/surface sau scope approval và preservation; DEFER = không active launch dependency, vẫn bảo tồn existing state; SIMPLIFY = giữ user problem, giảm mechanisms; KEEP = retained need/security/lifecycle boundary. Không DROP source/MVP/live data, không sửa code/migrations.

Need confidence khác implementation confidence. “Cao source” chứng minh đường xử lý tồn tại; “trung bình need” nghĩa chưa có adoption hoặc latest acceptance đủ để gọi bắt buộc. Requested UI/full-GCP prep vẫn cần được reconcile trước thay rollout.

## REMOVE — không đưa vào internal operational default

| Feature / state | Evidence ngoài code usage | Trade-off / preservation | Exit gate trước future retirement | Confidence |
|---|---|---|---|---|
| F21 product_governance_config | Không có actor/config decision đã xác định; governance UI lấy env/domains/audit; limits hardcoded, không config-driven | Có thể external admin đọc; archive all config/revision/updated_by/time | External readers/live config reviewed; không invent consumer để justify | Medium removal; high static absence within audited business paths |
| F23 user_tutorial_progress target use | Historical MVP tutorial khác current profile confirmation; Intrepid consumer absent qua UI/API/function closure | Giữ completed keys/times/export cho selected users và MVP/source | Confirm tutorial feature retired target-only, compatibility/history preserved | Low–medium need; high legacy scope |
| F24 B2B lead collection, product_enterprise_requests | Internal paid staff target D06/D11 không sales funnel; no sales owner/resolve SLA; UI request S08 vẫn cần reconcile | Không nhận prospect leads mới; preserve old PII theo policy; future separate sales route nếu approved | Product owner xác nhận audience/sales operations và requested landing expectation | Medium need; not proof no live leads |
| F27 public Basic/self-enroll exposure trong internal production | D06 internal paid; S09 Basic là authorized trial/demo riêng, không accidental | Mất public acquisition/self-enroll ở internal surface; keep authorized trial fixtures/history riêng; saves **0 core tables** | Reconcile latest public/trial mandate; stop Basic-specific auto-enroll/quota/seed future use only | High internal-vs-trial distinction; rollout change pending |

REMOVE không có nghĩa xóa code tức thì. Một retired capability có thể giữ tables readonly/archive/compatibility cho đến đủ gates.

## DEFER — valuable option, chưa proven launch dependency

| Feature / tables | Independent need assessment | Trade-off / existing smaller mechanism | Dependencies phải retire/adapt cùng | Confidence |
|---|---|---|---|---|
| F05 scheduled sync / worker_invocations | D33 deferred, S09 manual default; no approved sync freshness SLA | Operator nhấn Sync now B; C approved Sheet import. Không bỏ roster/country/idempotency | Scheduler/private route/nonce/auto_sync claim RPCs; manual connections/logs retained B | Medium–high defer |
| F08 support unlock/reflection / learner_support | Feedback core không bắt buộc unlock trace; S10 implementation request chưa pedagogical benefit evidence | Không reflection analytics/gating nếu cut; support disclosure vẫn phải approved | unlock RPC, snapshot private solution/hints gate, reflection UX | Medium |
| F09 live freeze/end / session_controls | Workshop-specific coordination; basic class lifecycle/progress khác | Không centralized pause; trainer điều phối trực tiếp nếu acceptable | Run guard trigger, UI09/14, revision/snapshot fields | Medium |
| F10 broadcast/private hints/receipts / 3 tables | Async coaching/ack SLA chưa proven; supplied UI/new workshop scope still exists | Approved direct coaching channel nếu đủ; lose durable in-app notices/read state | Broadcast/inbox/ack/private RLS/snapshot/projection; không gộp privacy scopes | Medium |
| F11 notes/clearance / trainer_actions | Operational note follow-up/actual mastery override chưa documented policy | No stored per-attempt notes; manual follow-up; audit không safe generic replacement | UI10 action/history/RPC/export; clarify clearance không currently official score override | Medium |
| F14 semantic retrieval / sop_chunks | Need approved content confirmed, automated vector mechanism D18 open; no benchmark vs curated text | Lose semantic large corpus search; bounded context/keyword versions/resources | Publisher insert chunks, search/RAG, Inspector indexing fields, reembed/model/extensions, watch | High mechanism-cost evidence; medium defer |
| F15 private context / learner_context | S10 requested; current task benefit/adoption/privacy acceptance chưa đo | Lose saved private uploads in B/C; A simplified extraction retains use case | Upload/context IDs/replay snapshots/PII/retention; shared SOP remains | Medium |
| F17 attendance/certificates / 2 tables | Renderer improvement không official HR/training obligation; D19 policy open | No new attendance/award issuance; keep prior issued evidence/IDs/read history | Award refresh in snapshot + attempt triggers, eligibility/rules/download/preview/watch | Medium; policy may reverse choice |
| F20 key rotation / requests+approvals | Real past rotation valuable; ongoing target IAM need different | Use approved secret-owner/IAM process; if key fallback mandatory keep both tables | request/approve/apply/provider check/UI/receipts; never revive old key | Medium conditional IAM assumption |
| F22 persisted sandbox / sandbox_runs | Author preview need plausible; persistent second run lifecycle not proven necessary | Isolated controlled author validation instead; don't turn test into learner attempts | Sandbox quota trigger, generate/Judge state/claims/recovery/UI11 test control | Medium |
| F25 projections / gcp_projection_outbox | Full-GCP prep requested, but polling exists, BQ disabled, current SLA/benefit unknown | Less realtime/warehouse automation; SQL always authority | All 22 watch triggers, queue function, consumer/backfill/Firestore/BQ/Scheduler; no fire-and-forget | High duplicate-mechanism evidence; scope reduction requires review |

## SIMPLIFY — retain need, reduce machinery

| Feature/subfeature | Evidence / why | Proposed simpler shape | Trade-off / security limit | Confidence |
|---|---|---|---|---|
| F02 Studio/rubric/content authority | D04 needs authoring; F01 global write under class config shows mismatch | Explicit global course authoring + real class overrides only; C approved global lesson/rubric without Studio | Don't write other classes via save scoped to A; don't lose frozen run rubric/threshold | High problem; exact policy pending |
| F04 Sheet mechanism | D24 source mandatory, D33 mechanics not; single Trainer/capacity constraint | B explicit manual Sync now with mapping/result; C single approved source/import route | Lose unattended freshness; preserve role immutability/country/lifecycle/idempotency | High requirement vs mechanism distinction |
| F13 SOP intake | D04 Head/PIC form confirmed; automated parse/Drive/index not necessarily | B pending text/URL review → canonical approved version; C approved manual process/resources | No unreviewed text/URL direct to AI; adapt publisher before chunk table retirement | High need; manual process acceptance pending |
| F16 library | D05 reuse confirmed, D21 detailed curation open; S10 added many settings/category/variables | Keep small title/prompt/scope/review contract, use existing table; no taxonomy/templating engine | Moderate visibility, don't merge mutable draft or personal/private source with shared templates | Medium–high need |
| F26 reporting | D35 Trainer/Head basic progress, D22 advanced unclear; ROI inputs absent | Authorized SQL summary; consistent completion semantics; keep ROI unset | Lose warehouse/history reporting, no false mastery claims or truncated average presented as full | High basic need; advanced optional |
| F29 generic adapter | Requested GCP port justified compatibility now; metadata includes trigger functions/full filter framework | Cutover keep tested adapter; later shrink allowed contracts/query surface to chosen features | Avoid migration rewrite rush; native ESM/transport parity still tested; no new ORM abstraction | Medium |
| F15 embeddings if A keeps uploads | Positive producer/consumer trace: upload embeds, generation selects full content | Keep extraction/hash/content/page evidence, stop new unused private embeddings after contract review | No private semantic retrieval feature today; preserve old chunk JSON/snapshots | High static data-flow; live savings unmeasured |
| F14 engine variants if A keeps semantic search | JS/SQL/BQ duplicate path; API loads chunks before indexed branch | Pick one engine/model readiness contract and scoped query; defer alternative pipeline | Lose fallback mode convenience; retain authorization/citations and explicit outage behavior | High mechanism overlap |
| F25 watches if A must keep delivery | Watches active despite disabled warehouse; some events only canonical SELECT then ack | Watch only actual consumers; measured freshness/lag; narrow fan-out | Don't break revoke/delete/order idempotency; need real consumer tests | High source; operational effect unmeasured |
| F18 quotas and F19 audit | Cost/privacy need real; proposed Redis/session ledgers unapproved | Existing SQL counters/run locks + minimal admin audit; limits/policies explicitly chosen | Do not drop paid-call/replay protection or log private prompts broadly | High supporting need |
| First-pass M1 roster metadata merge | Country/department snapshot required; profile fragmentation candidate not primary simplification | Optional later enrollment metadata only if cardinality/security/country history parity | Service-only profile fields could leak via enrollments SELECT; keep table if boundaries require | Medium; not selected in B/C count |

## KEEP — protect the approved learning and operating core

| Capability / states | Why beyond “code uses it” | Smaller mechanism considered | Conditions / evidence still missing |
|---|---|---|---|
| F01 users/learners/clients/classes/enrollments/course assignments/Head grants/domains/GCP binding | D03/D35 corporate identity, assigned zone và Head own-department privacy; stable historical IDs | Single deployment does not remove department scope; provider auth not business permission; no generic role schema | Actual roles/domain approval/membership/GCP connection acceptance; F06/F10 negative tests |
| F02 course/module/lesson/resources/default rubric | Đức author job-specific context và learner needs real sources; D04/D35 | Flat/static greenfield possible; retaining small existing hierarchy avoids risky FK rewrite | Official lesson/context/rubric policy sign-off; F01 ownership fixed before release |
| F03 attempts/run/Judge claim/progress | D35 real AI feedback, rerun/compare, persistence/reporting; paid outcomes need durable retry/recovery | Browser state/button-disable không outcome protection; read model could later query attempts | Actual provider quality, current RLS, threshold/completion definition and concurrent recovery |
| F04 safe roster ledger + country metadata | D24 Google Sheet four fields, D35 onboarding; retry-safe bulk import needed | Manual import allowed mechanism if source/preview/authorization correct; don't merge job/config/ledger by habit | Country not fully in current profile UI; latest actual roster reconciliation unverified |
| F06 correction request/log/history | S13 explicitly approved auto access/log; actual mismatch problem reported | Do not silently reintroduce pending or overwrite history/Sheet | Cross-course target, source re-sync, lifecycle acceptance tests F06; no fresh staging |
| F07 server draft B | Long editable prompt before paid run; loss recovery is concrete supporting problem | C browser autosave if accepted; no claim cross-device is mandatory | Usage/recovery value measurement; retain optimistic scope/revision |
| F12 versioned SOP registry B | Head/Trainer update shared sources, immutable citations useful | C static resources/snapshot can satisfy limited validation; not global requirement | Content update frequency/source version need; policy on original bytes |
| F13 intake + F16 library B | Confirmed Head form/source review and shared prompt reuse | C manual submitted content/curated templates; source owners must accept process | Detailed curation/approval/duplicate workflow scope still pending |
| F18 cost bounds + F19 admin audit | Small paid provider/privacy operation still needs controlled spend and who-changed-what | Existing SQL mechanisms before new Redis/ledger/framework | Approved budget/retention; actual operational logs/stats |
| F26 basic reporting + F28 EN/VI/compare | Explicit Trainer/Head progress + language/learning loop D08/D35 | Reuse existing SQL/attempt snapshots; zero new table needed | Metrics/UI parity; no fake ROI/mastery/automatic translation |

## Revisit gates và bằng chứng còn thiếu

Mỗi optional workflow muốn KEEP active cần trả lời: **named operator/user**, recurrent problem và simpler alternative thất bại ra sao; expected frequency/latency/freshness; approved privacy/data retention; recovery/support owner; budget/actual adoption hoặc explicit contractual requirement. Không cần mọi feature đo ROI trước build, nhưng current code presence/low row count/“enterprise future” không đủ để mang toàn subsystem vào launch.

Latest UI fidelity và preparation request có thể là requirement ngay cả adoption chưa có: ghi rõ đó là requested delivery, rồi review rollout phasing với owner. Không tự gọi proposed B/C là “đã được phê duyệt”. Với unclear evidence, giữ data/history và mark feature UNVERIFIED/deferred cho decision, không xóa chứng cứ.

F01/F02/F06/F10/F15 hiện **NOT VERIFIED trên staging**; detailed executable case/gaps ở [complexity review](ARCHITECTURE_COMPLEXITY_REVIEW.md). Historical reported F06 rollback QA không certify other cross-client/course cases. First-pass source hashes không đổi ở đầu second pass; source flaws không bị “fix” bởi report.

**Kết quả kiểm đếm:** đủ 50 table mappings và necessity challenges; B=32 retained contracts/18 conditional inactive; C=23 retained/27 inactive; no lifecycle/security merge selected. Chính xác số bảng live vẫn UNKNOWN. Audit không thay app/source migration/DB hoặc thực thi migration/data tests.
