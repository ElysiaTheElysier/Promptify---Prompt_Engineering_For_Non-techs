# 03 — DANH SÁCH VẤN ĐỀ & BẰNG CHỨNG KIỂM TOÁN (AUDIT FINDINGS)
## Chi tiết Phát hiện, Phân loại Mức độ Nghiêm trọng, Bằng chứng Mã nguồn & Tác động

**Dự án:** Promptify — Intrepid Workspace  
**Phạm vi kiểm toán:** Toàn bộ repository (Frontend, Backend, Database, Scripts, Tests, Docs)  
**Ngày kiểm toán:** 11/10/2026  

---

## 1. Bảng Tổng hợp Phát hiện theo Mức độ Nghiêm trọng

| Mã | Phân loại | Tên vấn đề | File liên quan | Mức độ |
| :--- | :--- | :--- | :--- | :---: |
| **F-01** | Architecture | Phân mảnh 3 ứng dụng song song tại Root Entry | `src/main.tsx` | **CRITICAL** |
| **F-02** | Dead Code | Khối fallback chết trong `ProductionApp.tsx` | `src/components/rebuild/ProductionApp.tsx` (L120–L145) | **CRITICAL** |
| **F-03** | Code Duplication | Cặp component trùng lặp "Viết tay" vs "Compile Word" | `src/components/rebuild/` (12 file cặp đôi) | **CRITICAL** |
| **F-04** | Maintainability | Các "God Objects" vượt ngưỡng bảo trì (1.000–1.400 dòng) | `dbService.ts`, `HybridView.tsx`, `App.tsx` | **CRITICAL** |
| **F-05** | Safety / Risk | Các Script Compiler có nguy cơ ghi đè phá hủy code mới | `scripts/compile_production_*.mjs` | **HIGH** |
| **F-06** | Performance | File JSON template tĩnh khổng lồ 533 KB trong source | `src/components/rebuild/review-templates.json` | **HIGH** |
| **F-07** | Monolith Logic | Service Backend xử lý 25+ hành động trong 1 switch-case | `src/services/productionServerService.ts` | **HIGH** |
| **F-08** | Type Safety | Hệ thống kiểu dữ liệu bị phân mảnh và xung đột vai trò | `src/types/index.ts` vs `src/types/production.ts` | **HIGH** |
| **F-09** | Reliability | Bài test `test:access` bị lỗi khi có cấu hình `.env` live | `test/verify_enrollment_access.ts` | **MEDIUM** |
| **F-10** | UI / Styling | Phân mảnh hệ thống styling, design tokens và icon fonts | `tailwind.config.js`, `source-ui.css`, `SourceIcon.tsx` | **MEDIUM** |
| **F-11** | State Mgmt | Thiếu nhất quán trong quản lý trạng thái (Polling vs Realtime) | `ProductionApp.tsx` (L81–L82) | **MEDIUM** |
| **F-12** | Hygiene | Ô nhiễm thư mục `scripts/` và `docs/` với hàng chục file ad-hoc | `scripts/`, `docs/` | **LOW** |

---

## 2. Chi tiết Từng Phát hiện kèm Bằng chứng Mã nguồn

### 2.1. [CRITICAL] F-01: Phân mảnh 3 ứng dụng song song tại Root Entry
- **File:** `src/main.tsx` (Dòng 5–13)
- **Bằng chứng từ mã nguồn:**
  ```tsx
  5: const RebuildApp = React.lazy(() => import('./components/rebuild/RebuildApp'));
  6: const ProductionApp = React.lazy(() => import('./components/rebuild/ProductionApp'));
  7: const App = React.lazy(() => import('./App'));
  8: const isProduction = window.location.pathname === '/production' || import.meta.env.VITE_REBUILD_PRODUCTION === 'true';
  9: const isRebuild = window.location.pathname === '/rebuild' || window.location.pathname.startsWith('/rebuild/');
  10: 
  11: ReactDOM.createRoot(document.getElementById('root')!).render(
  12:   <React.StrictMode>
  13:     <React.Suspense fallback={<p role="status" className="p-8">Loading Promptify…</p>}>
            {isProduction ? <ProductionApp /> : isRebuild ? <RebuildApp /> : <App />}
          </React.Suspense>
  14:   </React.StrictMode>,
  15: );
  ```
- **Tác động & Rủi ro:**
  - Build ra 3 bundle độc lập: `App` (848 KB), `RebuildApp` (615 KB), `ProductionApp` (490 KB), tổng dung lượng chunk vượt 1.9 MB trước gzip.
  - Khi một AI Agent được giao nhiệm vụ sửa lỗi, agent có thể sửa nhầm vào `App.tsx` trong khi production đang chạy `ProductionApp.tsx`, dẫn đến việc sửa đổi không có tác dụng trên môi trường deploy thực tế.

---

### 2.2. [CRITICAL] F-02: Khối code chết (Dead Code Fallback) trong `ProductionApp.tsx`
- **File:** `src/components/rebuild/ProductionApp.tsx` (Dòng 120–145)
- **Bằng chứng từ mã nguồn:**
  Tại dòng 96:
  ```tsx
  const currentUi = Math.min(15, Math.max(0, ui));
  ```
  `currentUi` được giới hạn chặt chẽ trong khoảng `[0, 15]`.
  Từ dòng 104 đến dòng 118, toàn bộ các giá trị từ 0 đến 15 đều có lệnh `return` sớm:
  ```tsx
  104: if(currentUi===0) return <><ProductionLanding/><ProductUseNotice/></>;
  105: if(currentUi===1||!session&&currentUi>=2) return <ProductionEntry1 email={session?.user.email}/>;
  106: if(currentUi===2&&snapshot) return <ProductionEntry2 ... />;
  107: if(currentUi===3||session&&snapshot&&!accessible) return <ProductionEntry3 ... />;
  108: if(session&&!snapshot&&currentUi!==3) return <main ...>...</main>;
  109: if(currentUi===9&&snapshot&&accessible) return scoped(<ProductionWorkshopSource ... />);
  110: if(currentUi===10&&snapshot&&accessible) return scoped(<ProductionLearnerInspectorSource ... />);
  111: if(currentUi===11&&snapshot&&accessible&&snapshot.selectedClass) return scoped(<ProductionStudioSource ... />);
  112: if(currentUi===12&&snapshot&&accessible) return scoped(<ProductionAnalyticsSource ... />);
  113: if(currentUi===14&&snapshot&&accessible) return scoped(<ProductionGovernanceSource ... />);
  114: if(currentUi===15&&snapshot&&accessible) return scoped(<ProductionRosterSource ... />);
  115: if(currentUi===13&&snapshot&&accessible&&snapshot.selectedClass) return scoped(<ProductionSopSource ... />);
  116: if(currentUi===6&&snapshot&&lesson) return scoped(<ProductionCompareSource ... />);
  117: if([5,7,8].includes(currentUi)&&snapshot&&lesson) return scoped(<ProductionWorkspace ... />);
  118: if(currentUi===4&&snapshot) return scoped(<ProductionHub ... />);
  119: if(currentUi===3||session&&snapshot&&!accessible) return <ProductionEntry3 ... />;
  ```
  Do đó, lệnh `return` ở dòng 120:
  ```tsx
  120: return <div className="prod-app"><header className="prod-header">...
  129:   {editor&&[9,11,14,15].includes(currentUi)&&<ProductionCohorts ... />}
  130:   {currentUi===4&&<...>}
  132:   {currentUi===5&&lesson&&<ProductionWorkspace ... />}
  136:   {currentUi===9&&<ProductionWorkshop ... />}
  138:   {currentUi===11&&<ProductionStudio ... />}
  139:   {currentUi===12&&<ProductionAnalytics ... />}
  140:   {currentUi===13&&<ProductionSop ... />}
  141:   {currentUi===14&&<ProductionGovernance ... />}
  142:   {currentUi===15&&<ProductionRoster ... />}
  145: </div>
  ```
  **KHÔNG BAO GIỜ ĐƯỢC CHẠY ĐẾN (DEAD CODE 100%)**.
- **Tác động & Rủi ro:**
  - Đoạn code chết này vẫn import các component: `ProductionStudio` (từ `ProductionStudioV2`), `ProductionCohorts`, `ProductionWorkshop`, `ProductionRoster`, `ProductionGovernance`, `ProductionAnalytics`, `ProductionSop`.
  - Giữ lại các import này khiến Vite phải bundle các component cũ vào bản phân phối, gây lãng phí băng thông và gây hiểu nhầm tai hại khi bảo trì.

---

### 2.3. [CRITICAL] F-03: Cặp Component trùng lặp ("Bản viết tay" vs "Bản compile từ Word")
- **Thư mục:** `src/components/rebuild/`
- **Bằng chứng từ mã nguồn:**
  Codebase đang chứa các cặp component có chức năng hoàn toàn trùng lặp nhưng được tạo bằng 2 phương thức khác nhau:
  1. `ProductionStudio.tsx` / `ProductionStudioV2.tsx` vs `ProductionStudioSource.tsx` (72.2 KB JSX nén).
  2. `ProductionWorkshop.tsx` vs `ProductionWorkshopSource.tsx` (32.3 KB).
  3. `ProductionGovernance.tsx` vs `ProductionGovernanceSource.tsx` (35.5 KB).
  4. `ProductionRoster.tsx` vs `ProductionRosterSource.tsx` (33.2 KB).
  5. `ProductionAnalytics.tsx` vs `ProductionAnalyticsSource.tsx` (20.0 KB).
  6. `ProductionSop.tsx` vs `ProductionSopSource.tsx` (27.7 KB).
  7. `ProductionCompare.tsx` vs `ProductionCompareSource.tsx` (14.4 KB).
  8. `CombinedProductionHub.tsx` vs `ProductionHub.tsx`.
  9. `CombinedProductionWorkspace.tsx` vs `ProductionWorkspace.tsx` -> `ProductionWorkspaceV7.tsx`.
- **Tác động & Rủi ro:**
  - Một bộ file là bản viết tay trước đây, một bộ file là bản được sinh ra từ script trích xuất HTML của file Word mockup.
  - Hiện tại nhánh `scoped(...)` trong `ProductionApp.tsx` đang render các file `*Source.tsx` và `ProductionWorkspaceV7.tsx`.
  - Các file bản viết tay cũ không còn được mount ở đâu nhưng vẫn nằm lẫn lộn trong thư mục `src/components/rebuild/`.

---

### 2.4. [CRITICAL] F-04: Các "God Objects" vượt ngưỡng bảo trì
- **Bằng chứng từ mã nguồn:**
  1. `src/services/dbService.ts` — **1.464 dòng (55.8 KB):**
     - Vừa đóng vai trò mock in-memory localStorage database (`LocalDbStore`, từ dòng 98 đến dòng 280), vừa chứa hơn 40 hàm truy vấn trực tiếp bảng Supabase (`getUserProfile`, `syncUserFromOAuth`, `getCourses`, `addLearnerToClass`, `recordPromptAttempt`, `getLearnerActiveEnrollment`, v.v.).
     - Trộn lẫn dữ liệu seed, logic phân quyền client và mapping DB.
  2. `src/components/hybrid/HybridView.tsx` — **1.337 dòng (55.6 KB):**
     - Đảm nhiệm: layout 2 cột, tabs brief/lý thuyết/gợi ý/giải pháp, soạn prompt, quản lý state PII, gọi LLM qua `/api/generate`, tính toán rubric, quản lý dialog so sánh diff, quản lý chat box, broadcast realtime, xử lý hotkey.
     - Vi phạm nghiêm trọng nguyên lý Single Responsibility.
  3. `src/App.tsx` — **1.080 dòng (41.5 KB):**
     - Chứa hơn 20 `useState`, 15 `useEffect`, quản lý session, class selection, URL params, modal popups, banner cảnh báo hết hạn, và điều hướng màn hình.

---

### 2.5. [HIGH] F-05: Các Script Compiler có nguy cơ ghi đè phá hủy code mới
- **Thư mục:** `scripts/`
- **File điển hình:**
  - `scripts/compile_production_workspace_source.mjs`
  - `scripts/compile_production_studio.mjs`
  - `scripts/compile_production_governance.mjs`
  - `scripts/production_source_compiler.mjs`
- **Bằng chứng từ mã nguồn (`scripts/compile_production_workspace_source.mjs`):**
  Script này đọc HTML thô từ template Word và ghi đè thẳng vào:
  `src/components/rebuild/ProductionWorkspaceSource.tsx`.
- **Tác động & Rủi ro:**
  - Trong khi đó, component đang phục vụ học viên hiện tại là `ProductionWorkspaceV7.tsx` (được import lồng qua `ProductionWorkspace.tsx`).
  - Nếu một AI Agent hoặc developer vô tình chạy lại lệnh `node scripts/compile_production_workspace_source.mjs`, file workspace sẽ bị ghi đè về phiên bản cũ chưa có các bản vá layout và phím tắt `Cmd+Enter`.

---

### 2.6. [HIGH] F-06: File JSON template tĩnh khổng lồ 533 KB trong mã nguồn
- **File:** `src/components/rebuild/review-templates.json`
- **Bằng chứng:**
  - Kích thước: **533.413 bytes (533 KB)** chỉ trên 1 dòng duy nhất (Single line JSON).
  - Chứa toàn bộ nội dung HTML mockup của 16 màn hình dạng chuỗi escape.
- **Tác động:**
  - File này chỉ phục vụ cho `ReviewScreen.tsx` (màn hình demo tĩnh ở `/rebuild`), hoàn toàn không phục vụ production thực tế.
  - Việc lưu trữ file 533 KB trong `src/` làm chậm IDE, tốn RAM khi phân tích cú pháp TypeScript và làm đầy context window của AI coding tools.

---

### 2.7. [HIGH] F-07: Service Backend xử lý 25+ hành động trong một hàm duy nhất
- **File:** `src/services/productionServerService.ts`
- **Bằng chứng từ mã nguồn (Dòng 120–420):**
  Hàm `handleProductRequest` chứa một khối `switch (body.action)` khổng lồ bao gồm:
  `'snapshot'`, `'confirmProfile'`, `'profileCorrection'`, `'saveDraft'`, `'savePromptLibrary'`, `'uploadLearnerContext'`, `'searchSop'`, `'saveDomain'`, `'setAccess'`, `'saveClass'`, `'prepareSopUpload'`, `'recordAttendance'`, `'downloadAward'`, `'listDriveFolder'`, `'submitSop'`, `'reviewSopPreview'`, `'reviewSop'`, `'sandboxGenerate'`, `'sandboxJudge'`, `'unlockSupport'`, `'generate'`, `'judge'`, `'saveStudio'`, `'createLesson'`, `'createCohort'`, `'sessionControl'`, `'broadcast'`, `'privateHint'`.
- **Tác động:**
  - Mọi thay đổi logic ở bất kỳ tính năng nào (từ tải SOP đến xoay key hay chấm điểm) đều phải chỉnh sửa trên cùng một file dài 431 dòng nhưng có dung lượng lên tới 48 KB (do nén code).
  - Khả năng xung đột merge conflict khi nhiều agent cùng làm việc là 100%.

---

### 2.8. [HIGH] F-08: Hệ thống Kiểu Dữ liệu (Type System) bị phân mảnh
- **Files:** `src/types/index.ts` vs `src/types/production.ts`
- **Bằng chứng từ mã nguồn:**
  - Trong `src/types/index.ts`:
    ```ts
    export interface Learner {
      role: 'STUDENT' | 'CLASS_MANAGER' | 'INSTRUCTOR';
    }
    export interface LabStep {
      rubricCriteria: { persona: string; task: string; guardrails: string; format: string; };
    }
    ```
  - Trong `src/types/production.ts`:
    ```ts
    export type ProductRole = 'learner' | 'instructor' | 'head' | 'admin';
    export interface ProductProfile { role: ProductRole; }
    export interface WeightedEvaluation {
      contract: 'weighted-v1';
      total: number;
      criteria: Array<RubricCriterion & { score: number; max: number; reason: string }>;
    }
    ```
- **Tác động:**
  - Hai mô hình dữ liệu hoàn toàn khác biệt: một bên là mô hình 3 role kiểu cũ với 4 tiêu chí rubric; một bên là mô hình 4 role thực tế với rubric 5 tiêu chí có trọng số (`weights: 30, 20, 20, 15, 15`).
  - Sự tồn tại song song của 2 bộ type này gây nhầm lẫn khi viết code mới hoặc viết test.

---

### 2.9. [MEDIUM] F-09: Bài test `test:access` bị lỗi khi có cấu hình `.env` live
- **File:** `test/verify_enrollment_access.ts` (Dòng 29)
- **Bằng chứng thực thi:**
  Khi chạy `npm run test:access`:
  ```
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  true !== false
      at C:\Ki_OJT\PromptforNontech\test\verify_enrollment_access.ts:29:8
  ```
- **Nguyên nhân:**
  - `verify_enrollment_access.ts` kiểm tra phương thức `dbService.canUserAccessClass`.
  - `dbService` kiểm tra `isSupabaseConfigured`. Khi có key live trong `.env`, nó truy vấn Supabase thật thay vì bộ nhớ giả lập `LocalDbStore`. Dữ liệu trong database thật dẫn tới kết quả trả về `true` thay vì `false` như test mong đợi.
- **Tác động:**
  - Test bị phụ thuộc vào trạng thái môi trường bên ngoài (flaky test), không đảm bảo tính độc lập (isolated unit test).

---

### 2.10. [MEDIUM] F-10: Phân mảnh Styling và Thư viện Biểu tượng (Icon Fonts)
- **Bằng chứng từ mã nguồn:**
  - Hệ thống đang dùng đồng thời 4 bộ CSS class:
    1. Tailwind CSS chuẩn (`p-4 flex items-center bg-white`).
    2. Material Design 3 tokens (`bg-m3-surface`, `text-m3-on-surface`, `selection:bg-m3-primary-container`).
    3. Custom source CSS (`source-ui`, `prod-shell`, `prod-card`).
    4. CSS module riêng (`learner-workspace.css`, `LandingKeyVisuals.css`).
  - Biểu tượng vừa được dùng qua component `lucide-react` (ở `ProductionWorkspaceV7`), vừa được nhúng qua thẻ `<SourceIcon>` gọi font Material Symbols của Google (ở các component `*Source.tsx`).

---

### 2.11. [MEDIUM] F-11: Quản lý Trạng thái thiếu nhất quán (State Management)
- **File:** `src/components/rebuild/ProductionApp.tsx` (Dòng 81–82)
- **Bằng chứng từ mã nguồn:**
  ```tsx
  81: useEffect(() => { if(!session||!classId)return; const timer=setInterval(()=>{if(!activeWrite.current)void refresh(classId);},ui===9?5000:15000);return()=>clearInterval(timer); }, [session?.user.id,classId,refresh,ui]);
  82: useEffect(()=>{if(!session||!classId)return;const channel=supabase.channel('product-workshop-'+classId).on('postgres_changes',{event:'INSERT',schema:'public',table:'workshop_messages',filter:'class_id=eq.'+classId},()=>void refresh(classId)).on('postgres_changes',{event:'INSERT',schema:'public',table:'trainer_hints',filter:'class_id=eq.'+classId},()=>void refresh(classId)).subscribe();return()=>{void supabase.removeChannel(channel);};},[session?.user.id,classId,refresh]);
  ```
- **Tác động:**
  - Vừa sử dụng **Polling** định kỳ mỗi 5s/15s bằng `setInterval`, vừa sử dụng **Supabase Realtime Channel** lắng nghe sự kiện `INSERT`.
  - Khi có thông báo mới, cả hai cơ chế đều gọi `refresh(classId)`, dẫn đến tình trạng gọi API dồn dập (throttling / race conditions), dễ gây giật lag giao diện người dùng.

