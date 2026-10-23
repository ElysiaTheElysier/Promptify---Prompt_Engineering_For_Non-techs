# 01 — BÁO CÁO TỔNG QUAN (EXECUTIVE SUMMARY)
## Kiểm toán & Lộ trình Tái cấu trúc Codebase Promptify (Intrepid Workspace)

**Vai trò:** Senior Software Architect & Repository Refactoring Lead  
**Thời điểm thực hiện:** 11/10/2026  
**Trạng thái kiểm toán:** HOÀN TẤT KIỂM TOÁN — CHỜ PHÊ DUYỆT TRƯỚC KHI REFACTOR  
**Branch hiện tại:** `rebuild` | **Canonical Remote:** `https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs.git`

---

## 1. Bối cảnh dự án & Mục tiêu cốt lõi

**Promptify** là nền tảng đào tạo kỹ năng Prompt Engineering và thực hành ứng dụng AI trong công việc nội bộ dành riêng cho tập đoàn **Intrepid Asia** (quy mô 27 Business Functions, 6 quốc gia, ~550 tài liệu/quy trình SOP).

### Mục tiêu kỹ thuật cốt lõi:
1. **Pilot Usable trước ngày 23/10/2026:** Đảm bảo toàn bộ luồng người học (Learner), giảng viên (Facilitator - Võ Tự Đức), trưởng bộ phận (Head of Department) và quản trị viên (Admin) vận hành thông suốt, dữ liệu được ghi nhận an toàn trên máy chủ.
2. **Loại bỏ nợ kỹ thuật (Technical Debt) nghiêm trọng:** Giải quyết tình trạng codebase có 3 ứng dụng song song chạy trong cùng 1 repo, 41 component bị phân mảnh trong `src/components/rebuild/`, các file "God Object" dài 1.000–1.400 dòng, các file JSON template 533 KB và script biên dịch có nguy cơ ghi đè code thực tế.
3. **Chuẩn bị nền tảng cho Multi-Agent Concurrency:** Tạo kiến trúc module hóa rõ ràng (Feature-based Modular Architecture) để nhiều AI coding agents có thể phát triển song song mà không xung đột mã nguồn.
4. **Tuyệt đối không gây hồi quy (Zero Regression):** Không phá vỡ bất kỳ hợp đồng API nào (`/api/product`), không tự ý sửa database migrations đã áp dụng (002–049), không làm gián đoạn bản deploy production hiện hành tại Vercel.

---

## 2. Bảng điểm sức khỏe Codebase (Repository Health Scorecard)

| Tiêu chí | Điểm (Thang 10) | Nhận xét kiến trúc & Đánh giá thực tế |
| :--- | :---: | :--- |
| **Kiến trúc & Phân chia trách nhiệm** | **4.0 / 10** | **Rất yếu.** Tồn tại 3 luồng ứng dụng chạy song song trong `main.tsx` (App cũ, Rebuild Prototype, ProductionApp). `ProductionApp.tsx` chứa đoạn code chết (dead fallback lines 120–145). `dbService.ts` (1.464 dòng) trộn lẫn mock database với client logic. |
| **Chất lượng mã nguồn & Đọc hiểu** | **5.0 / 10** | **Trung bình - Yếu.** Các component giao diện do compiler sinh từ file Word (`*Source.tsx`) bị nén dòng, khó đọc, chứa text i18n inline lồng ghép. Component `HybridView.tsx` (1.337 dòng) và `App.tsx` (1.080 dòng) quá tải trách nhiệm. |
| **Độ tin cậy & Kiểm thử (Testing)** | **7.0 / 10** | **Khá.** Có 15+ test script kiểm tra hợp đồng logic offline trong `test/` chạy thành công (Pii, Rubric, Codelab, Provider Fallback, Roster Worker, UI State). Tuy nhiên thiếu test framework chuẩn (Vitest/Jest), một số test cũ (`test:access`) bị lỗi khi có cấu hình `.env` live. |
| **Bảo mật & Quản trị dữ liệu** | **8.5 / 10** | **Tốt.** Client không chứa API key AI (toàn bộ qua server Vercel), có kiểm tra PII trước khi gửi đến Gemini, cơ chế xoay key (key rotation) yêu cầu Dual Approval từ 2 Admin, RLS và ngân sách gọi API được kiểm soát chặt chẽ ở backend. |
| **Sẵn sàng cho Multi-Agent** | **3.0 / 10** | **Rất nguy hiểm.** Ranh giới file không rõ ràng. Agent mới dễ sửa nhầm component cũ thay vì component V7 đang active, hoặc chạy các script compile trong `scripts/` làm ghi đè mất code nâng cấp. |
| **Hiệu năng Bundle & Build** | **5.5 / 10** | **Trung bình.** `npm run build` thành công trong 3.4s nhưng sinh ra 3 bundle lớn (>848 KB, >615 KB, >490 KB), gây cảnh báo chunk-size trên Vite do import đồng thời cả 3 hệ thống. |

---

## 3. Top 10 Vấn đề đáng xử lý nhất (Ưu tiên kiến trúc)

1. **[CRITICAL] Phân mảnh 3 ứng dụng song song tại Root Entry (`src/main.tsx`):**  
   `main.tsx` tải lười đồng thời `App.tsx` (1.080 dòng), `RebuildApp.tsx` (kèm template 533 KB), và `ProductionApp.tsx`. Điều này làm phình to bundle và gây nhầm lẫn nghiêm trọng cho lập trình viên/agent về đâu là ứng dụng thực tế.
2. **[CRITICAL] Khối code chết (Dead Code Fallback) trong `ProductionApp.tsx` (Dòng 120–145):**  
   Dòng 104–118 của `ProductionApp.tsx` đã xử lý toàn bộ các mã UI từ 00 đến 15 và return sớm. Đoạn code từ dòng 120 đến 145 là fallback lỗi thời nhưng vẫn import và render 10 component cũ không còn sử dụng.
3. **[CRITICAL] Tồn tại cặp component trùng lặp ("Bản viết tay" vs "Bản compile từ Word"):**  
   Trong `src/components/rebuild/` có 2 bộ component song song cho Facilitator & Admin: một bộ viết tay (`ProductionStudioV2`, `ProductionWorkshop`, `ProductionRoster`, `ProductionGovernance`, v.v.) và một bộ compile tự động (`Production*Source.tsx`). Điều này gây lãng phí bộ nhớ và nguy cơ sửa nhầm file.
4. **[CRITICAL] Nguy cơ ghi đè mã nguồn từ các Script Compiler trong `scripts/`:**  
   Các script như `compile_production_workspace_source.mjs` có logic sinh mã tự động. Nếu một agent chạy script này, file workspace đang hoạt động (`ProductionWorkspaceV7.tsx`) có thể bị ghi đè hoặc mất các logic mới nhất.
5. **[HIGH] File dữ liệu tĩnh khổng lồ nằm trực tiếp trong thư mục mã nguồn:**  
   `src/components/rebuild/review-templates.json` nặng 533 KB (533.413 ký tự trên 1 dòng duy nhất) và `src/services/sourceUiTextService.ts` nặng 63 KB (744 dòng dictionary). Chúng làm chậm IDE, tốn RAM build và gây nghẽn context của AI agents.
6. **[HIGH] Các "God Objects" vượt ngưỡng bảo trì:**  
   - `src/services/dbService.ts`: 1.464 dòng (55.8 KB) chứa cả một database in-memory giả lập lẫn hàng chục truy vấn Supabase client.  
   - `src/components/hybrid/HybridView.tsx`: 1.337 dòng (55.6 KB) trộn lẫn UI, state, AI call, diff compare, dialogs.  
   - `src/services/productionServerService.ts`: 431 dòng (48.0 KB) chứa một switch-case khổng lồ xử lý 25+ hành động backend khác nhau.
7. **[HIGH] Phân mảnh kiểu dữ liệu (Type System Fragmentation):**  
   `src/types/index.ts` định nghĩa role là `'STUDENT' | 'CLASS_MANAGER' | 'INSTRUCTOR'` với rubric 4 tiêu chí cũ. Trong khi `src/types/production.ts` định nghĩa role là `'learner' | 'instructor' | 'head' | 'admin'` với rubric 5 tiêu chí weighted (`weighted-v1`). Hai hệ thống type này không tương thích nhưng cùng tồn tại.
8. **[MEDIUM] Thư mục `scripts/` và `docs/` bị ô nhiễm file lịch sử/thử nghiệm:**  
   `scripts/` chứa 79 file (nhiều script ad-hoc, scraper, audit ngày cũ). `docs/` chứa 73 file (gồm cả 4 file Word binary nặng ~1.8 MB mỗi file). Cần gom nhóm và phân loại rõ ràng theo `docs/archive/`.
9. **[MEDIUM] Giao diện bị phân mảnh về Styling & Design Tokens:**  
   Codebase sử dụng đồng thời Tailwind CSS utility classes, class Material Design 3 (`bg-m3-surface`, `text-m3-primary`), class custom (`source-ui`, `prod-shell`, `learner-workspace.css`), và nhúng icon qua Google Fonts (`SourceIcon`) thay vì đồng nhất Lucide React.
10. **[MEDIUM] Thiếu Unit Test Runner tiêu chuẩn:**  
    Hiện tại các bài test trong `test/` được chạy bằng `tsx test/verify_*.ts` thủ công theo từng file, chưa có bộ test runner tích hợp (như Vitest) để chạy song song, báo cáo độ phủ (coverage) hoặc tích hợp CI/CD tự động.

---

## 4. Tóm tắt Đề xuất Kiến trúc Mới & Lộ trình

- **Mô hình kiến trúc đề xuất:** Chuyển đổi sang **Feature-Driven Modular Architecture (Kiến trúc Module theo Tính năng)**:
  - `src/features/learner/`: Màn hình Hub (UI04), Workspace Codelab V7 (UI05), Compare Diff (UI06), AI Judge (UI07), SOP Viewer (UI08).
  - `src/features/facilitator/`: Workshop Pulse/Broadcast (UI09), Learner Inspector (UI10), Curriculum Studio (UI11).
  - `src/features/head/`: Department Analytics & Library Review (UI12), SOP Ingestion (UI13).
  - `src/features/governance/`: Key Vault & Dual Rotation (UI14), Roster Sync (UI15).
  - `src/features/auth/`: Enterprise Sign-in (UI01), Profile Confirmation (UI02), Access Denied (UI03).
  - `src/services/`: Chia tách `productionServerService.ts` thành các domain services nhỏ gọn (`workspaceActionService`, `sopActionService`, `studioActionService`, `governanceActionService`).
  - `src/components/common/`: Thư viện UI tái sử dụng (Dialog, Notice, Markdown, Icon, Badges).
- **Nguyên tắc refactor:**
  - **Không viết lại từ đầu (No Full Rewrite):** Giữ nguyên 100% logic backend, contract API và database schema.
  - **Refactor từng bước nhỏ (Incremental):** Mỗi phase đều chạy được `npm run build` và toàn bộ test verification trong `test/`.
  - **Rollback tức thì:** Có kịch bản hoàn tác cho từng bước nếu có phát sinh lỗi.

