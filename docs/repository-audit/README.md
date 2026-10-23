# BỘ BÁO CÁO KIỂM TOÁN VÀ KẾ HOẠCH TÁI CẤU TRÚC CODEBASE PROMPTIFY
## (Promptify Repository Architecture Audit & Refactoring Blueprint)

**Tổ chức:** Intrepid Asia x Promptify  
**Thời gian thực hiện:** Tháng 10/2026  
**Chủ trì:** Senior Software Architect & Repository Refactoring Lead  
**Trạng thái:** HOÀN TẤT KIỂM TOÁN — CHỜ PHÊ DUYỆT TRƯỚC KHI BẮT ĐẦU REFACTOR  

---

## 📚 Mục lục Bộ Báo cáo (Document Index)

Bộ tài liệu này bao gồm 7 báo cáo chuyên sâu nằm trong thư mục `docs/repository-audit/`:

1. **[`01-EXECUTIVE-SUMMARY.md`](01-EXECUTIVE-SUMMARY.md)**  
   *Báo cáo Tổng quan Quản trị (Executive Summary)*  
   - Bối cảnh sản phẩm Promptify Intrepid, mục tiêu pilot 23/10/2026.  
   - Bảng điểm sức khỏe codebase (Repository Health Scorecard).  
   - Top 10 vấn đề kiến trúc và nợ kỹ thuật cấp bách nhất cần xử lý.

2. **[`02-CURRENT-ARCHITECTURE.md`](02-CURRENT-ARCHITECTURE.md)**  
   *Kiến trúc Hiện tại & Bản đồ Codebase (Current Architecture & Data Flow)*  
   - Phân tích chi tiết 3 tầng ứng dụng, luồng Tri-Modal tại `src/main.tsx`.  
   - Sơ đồ Mermaid: Hệ thống tổng thể, luồng Codelab Learner Practice (UI05 -> `/api/product` -> Gemini -> Supabase), luồng Facilitator & Governance.  
   - Danh mục và ánh xạ trách nhiệm của toàn bộ 16 màn hình UI (`UI00`–`UI15`).

3. **[`03-AUDIT-FINDINGS.md`](03-AUDIT-FINDINGS.md)**  
   *Danh sách Vấn đề & Bằng chứng Kiểm toán (Audit Findings & Code Evidence)*  
   - Danh mục 12 phát hiện chi tiết phân theo mức độ Critical / High / Medium / Low.  
   - Bằng chứng mã nguồn cụ thể (đường dẫn file, số dòng, trích đoạn code thực tế).  
   - Phân tích khối code chết (dead fallback lines 120–145), các file "God Object", nguy cơ từ các script compile.

4. **[`04-TARGET-ARCHITECTURE.md`](04-TARGET-ARCHITECTURE.md)**  
   *Đề xuất Kiến trúc Mục tiêu (Target Feature-Driven Architecture)*  
   - Cây thư mục mới theo mô hình Feature-Driven Modular Architecture (`src/features/`).  
   - Bảng mapping chuyển dịch chi tiết từng file từ vị trí hiện tại sang vị trí mới.  
   - Ranh giới phụ thuộc và nguyên tắc phân quyền giúp nhiều AI Coding Agents làm việc song song không xung đột.

5. **[`05-CLEANUP-PLAN.md`](05-CLEANUP-PLAN.md)**  
   *Kế hoạch Dọn dẹp Repository (Repository Cleanup Plan)*  
   - Ma trận phân loại 6 nhóm hành động: **KEEP**, **MOVE**, **EXTRACT**, **MERGE**, **REFACTOR**, **DELETE CANDIDATE**, **DEFER**.  
   - Danh sách các component trùng lặp, file JSON 533 KB và script cũ cần loại bỏ an toàn.

6. **[`06-REFACTOR-ROADMAP.md`](06-REFACTOR-ROADMAP.md)**  
   *Lộ trình Triển khai Refactor (Incremental Refactoring Roadmap)*  
   - Kế hoạch 9 giai đoạn (Phase 0 đến Phase 8) tuần tự, kiểm chứng được bằng lệnh build/test và có chiến lược rollback tức thì.  
   - Xác định rõ ràng Phase 1 nên triển khai đầu tiên để loại bỏ rủi ro lớn nhất với chi phí thấp nhất.

7. **[`07-AGENT-GUIDELINES.md`](07-AGENT-GUIDELINES.md)**  
   *Quy tắc Phát triển dành cho AI Coding Agents (Agent Guidelines)*  
   - Bộ quy tắc tối thượng ngăn chặn codebase tiếp tục trở nên lộn xộn.  
   - Bản đồ "Sửa code ở đâu", quy trình Tiền kiểm (Pre-flight) & Hậu kiểm (Post-flight), các lệnh kiểm tra an toàn được phép chạy.

---

## 🔍 Tóm tắt Nhanh Tình trạng Codebase

- **Điểm mạnh:**
  - Logic AI Sandbox và AI Judge có độ bảo mật cao, không lộ API key ra client.
  - Bộ tiêu chí chấm điểm 5 tiêu chí có trọng số (`weighted-v1`) và cơ chế chống rò rỉ PII hoạt động chính xác.
  - Có 15+ test script kiểm tra hợp đồng logic chạy độc lập trong `test/` đã vượt qua 100%.
  - Quá trình build production (`npm run build`) hoạt động tốt, không có lỗi cú pháp TypeScript.
- **Điểm yếu cốt lõi:**
  - Tồn tại 3 ứng dụng song song trong cùng một repository (`main.tsx`).
  - Giao diện bị phân mảnh giữa các component "viết tay" và component "compile tự động từ Word".
  - Chứa khối code chết lớn trong `ProductionApp.tsx` (dòng 120–145) gây phình to bundle.
  - Nhiều file vượt ngưỡng 1.000 dòng (`dbService.ts`, `HybridView.tsx`, `App.tsx`).

---

## ⚠️ Nguyên tắc Thực thi

> **QUAN TRỌNG:** Trong giai đoạn này, toàn bộ quá trình kiểm toán chỉ dừng lại ở việc đọc mã nguồn, phân tích, tài liệu hóa và lập kế hoạch. **KHÔNG tự ý refactor, xóa, di chuyển hoặc thay đổi bất kỳ file source code nào khi chưa có sự phê duyệt từ người dùng.**

