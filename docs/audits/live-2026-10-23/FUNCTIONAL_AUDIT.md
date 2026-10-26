# FUNCTIONAL AUDIT — ma trận kiểm chứng (23/10/2026, bộ bổ sung LIVE)

Trạng thái: **VERIFIED PASS (LIVE)** = đã chạy thật trên staging; **VERIFIED PASS (OFFLINE)** = test trong allowlist gọi thật action/service; **VERIFIED FAIL**; **CODE-INSPECTED ONLY**; **NOT TESTED**; **BLOCKED**.
Test offline hôm nay: **73/73 PASS**, typecheck/boundaries/smoke PASS, lint 0 lỗi (1 cảnh báo vòng import) — `apps/promptify-intrepid/outputs/audit-2026-10-23/offline-checks.txt`.
PSS = `src/services/productionServerService.ts`. Cổng quyền chung: `classScope` (PSS:111) → danh sách action cần `can_manage` (PSS:250) → RLS/SECURITY DEFINER.

## Định danh và onboarding
| Tính năng | Trạng thái | Quyền | Test | Bằng chứng |
|---|---|---|---|---|
| Đăng nhập Google + ánh xạ roster `context()` PSS:51 | Đủ | Email đã xác minh, phải có dòng `users`, `auth_provider_id` khớp | verify_auth_errors, cloud_migration | **VERIFIED PASS (LIVE)**: `duc.vo@intrepid.asia` bị từ chối đúng; Head 403 do classId lạ |
| snapshot PSS:123 | Đủ | classScope; learner chỉ thấy dữ liệu của mình; head `attempts:[]` | cloud_migration, sop_authorization | **VERIFIED PASS (LIVE)** |
| confirmProfile / saveProfileDetails / profileCorrection | Đủ | RPC theo user | cloud_migration | VERIFIED PASS (OFFLINE) |
| accessRequest PSS:214 | Đủ nhưng **không cấp quyền** khi duyệt | Chỉ cần Google đã xác minh; không kiểm `classId` | cloud_migration | VERIFIED PASS (OFFLINE) cho tạo/đánh dấu; xem L07 |
| enterpriseRequest / enrollBasic | Đủ | Không đăng nhập / Google | — | NOT TESTED |

## Học viên (UI04/UI05)
| Tính năng | Trạng thái | Test | Bằng chứng |
|---|---|---|---|
| Run JSON (generate) | Đủ; begin_run idempotent; quota 40/h 200/ngày | rebuild_runs | VERIFIED PASS (OFFLINE); LIVE 22/10 |
| Run streaming `/api/stream` | Đủ (cờ) | verify_generation_stream | **VERIFIED PASS (LIVE)**: 3 Run `streamed=true` |
| Judge async + polling | Đủ; **lỗi đuôi chậm** (L01) | judge_* | **VERIFIED PASS (LIVE)** 3/4 job hôm 23/10; **VERIFIED FAIL (LIVE)** job `f7a3fc37ff2f` (3×270s, không ra điểm) |
| Token phiên 50k + bắt đầu phiên mới | Đủ (cờ); giới hạn mềm (I04) | learner_safeguards | **VERIFIED PASS (LIVE)**: 818 token / 3 charge |
| Chặn prompt injection | Đủ (cờ) | prompt_injection, learner_safeguards | **VERIFIED PASS (LIVE)**: 2 lần 422 + security event |
| Hết hạn truy cập → chỉ đọc | Đủ (cờ); `searchSop` chưa bị chặn (L08) | learner_safeguards | **VERIFIED PASS (LIVE)**: audit + 403 |
| Yêu cầu gợi ý (017/018) | Đủ | verify_workshop_messaging | **VERIFIED PASS (LIVE)** tạo yêu cầu; duyệt trong trình duyệt **chưa quan sát** |
| Hộp thông báo broadcast/hint riêng | Đủ (sửa 23/10) | verify_workshop_messaging | VERIFIED PASS (OFFLINE); dữ liệu lưu LIVE, hiển thị chưa quan sát |
| saveDraft, savePromptLibrary (server), uploadLearnerContext, requestSopSync, downloadAward, ackMessage | Có | — | CODE-INSPECTED ONLY / NOT TESTED |
| sourceDownload, searchSop, recordOutcome, uiEvents, resetAiSession | Có | sop_*, cloud_migration, learner_safeguards | VERIFIED PASS (OFFLINE) |
| unlockSupport (học viên) | Đã gỡ (403) | — | CODE-INSPECTED ONLY |

## Giảng viên (UI09/UI10/UI11)
| Tính năng | Trạng thái | Bằng chứng |
|---|---|---|
| broadcast, privateHint | Đủ; privateHint bỏ qua `requestId` (trùng khi bấm 2 lần) | **VERIFIED PASS (LIVE)** lưu dữ liệu |
| reviewHintRequest | Đủ | VERIFIED PASS (OFFLINE); LIVE deploy, chưa quan sát duyệt |
| setAccessExpiry | Đủ | **VERIFIED PASS (LIVE)** |
| saveStudio (Studio) | Đủ | VERIFIED PASS (OFFLINE) |
| **Đổi trạng thái lab từ Workshop** (`updateLabStatus` → saveStudio thiếu `fields`) | Lỗi | **VERIFIED FAIL (CODE)** — L05, chưa tái hiện trên staging |
| sandboxGenerate / sandboxJudge | Đủ; **không trừ budget** (L04) | VERIFIED PASS (OFFLINE) |
| sessionControl, trainerAction, recordAttendance, createCohort, saveClass | Có | CODE-INSPECTED ONLY / NOT TESTED |
| publishSop | Backend có, **không có UI** | NOT TESTED |

## Head (UI12)
| analytics, reviewPromptLibrary | Đủ | VERIFIED PASS (OFFLINE); Head đăng nhập + xem lớp LIVE 22–23/10 |
|---|---|---|

## Admin (UI13/UI14/UI15)
| Tính năng | Trạng thái | Bằng chứng |
|---|---|---|
| submitSop, listDriveFolder, reviewSop, backfillDriveOriginal | Đủ | VERIFIED PASS (OFFLINE); SOP gốc LIVE 21/10 (lịch sử) |
| saveSheet / syncSheet (Sync now) | Đủ — **đường duy nhất để thêm học viên** | saveSheet OFFLINE; syncSheet LIVE 21/10 (lịch sử) |
| Roster theo lịch (Scheduler → `/internal/roster`) | Code có | **BLOCKED (LIVE)**: Scheduler PAUSED |
| setAccess, saveDomain, requestRotation/approveRotation, governance | Có | NOT TESTED / CODE-INSPECTED ONLY |
| accessRequests / reviewAccessRequest | Chỉ đổi trạng thái | VERIFIED PASS (OFFLINE) — không cấp quyền (L07) |

## Nền tảng
| Tính năng | Trạng thái | Bằng chứng |
|---|---|---|
| Chứng chỉ/huy hiệu | Render PDF có test; cấp phát chỉ đọc code | VERIFIED PASS (OFFLINE) render |
| **Vòng đời dữ liệu: xoá/lưu trữ/giới hạn thời gian lưu** | **Không có** | Tính năng vắng mặt (L10) |
| Route tương thích `/api/generate`, `/api/evaluate` | Trình duyệt không gọi | VERIFIED PASS (OFFLINE) |

## Lệch UI ↔ API
- `publishSop` không có nút; hộp thoại `unlockSupport` còn trong `ProductionApp` nhưng không ai gọi.
- Phần lớn layout fallback `prod-app` và 7 component cũ (`ProductionWorkshop/StudioV2/Analytics/Governance/Roster/Sop/Compare`) **không bao giờ render** (L13). `05_OPEN_ISSUES` ghi bản sửa "Sync now" vào `ProductionRoster.tsx` — màn này không hiển thị.
- UI03 vẫn có câu "request a B2B demo…" (tester yêu cầu bỏ), nhưng không có link tới form doanh nghiệp.
- Hub gửi `accessRequest` cho "nâng cấp ADVANCE" — server chỉ tạo một dòng hộp thư, không có luồng nâng cấp.

## Đánh giá theo QA test log 24 case
Đã có code: 22/24. Còn thiếu: rate limit 20 lượt/phút (khác thiết kế: quota 40/giờ), ma trận test đối kháng. Đã LIVE: AUTH-01, AUTH-02, AUTH-04, PLAY-02, SEC-03, SEC-04, EVAL-01/02/04 (lịch sử), DASH-02 (lưu). Chưa kiểm chứng trình duyệt toàn vai: xem I15.
