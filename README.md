# Promptify (PromptLab) — Prompt Engineering for Non-techs & Business Users

> **Nền tảng thực hành & đào tạo kỹ năng Prompt Engineering qua các tình huống nghiệp vụ thực tế dành cho cán bộ ngân hàng & người làm văn phòng.**

---

## 📖 Giới thiệu (Overview)

**Promptify (PromptLab)** được thiết kế đặc thù cho người dùng khối nghiệp vụ (Business / Non-tech Users) như cán bộ Truyền thông, Thẩm định Tín dụng, Vận hành & CSKH (điển hình tại Agribank và các tổ chức doanh nghiệp).

Người học không cần kiến thức lập trình phức tạp, không bị quá tải bởi thông số kỹ thuật (token, latency, temperature), mà tập trung vào việc **điều khiển AI giải quyết công việc hàng ngày**:
- Chuẩn hóa báo cáo, xuất bảng biểu Markdown để copy sang Excel.
- Áp dụng công thức cấu trúc 5 thành tố chuyên nghiệp (Role, Context, Task, Constraint, Format).
- Định hình văn phong chuẩn mực ngân hàng bằng ví dụ mẫu (One-shot, Few-shot).
- Đối chiếu quy chế, tài liệu chính sách để buộc AI chống bịa đặt (Grounding).

---

## 🚀 Các Tính Năng Nổi Bật (Core Features)

### 1. Luồng Trải Nghiệm Học Tập Hoàn Chỉnh (Complete Learning Flow)
- **Landing & Mock Google Login**: Đăng nhập nhanh 1-click với các tài khoản mẫu cán bộ Agribank (*Linh Phạm* - Ban Truyền thông, *Minh Trần* - Khối Tín dụng).
- **Chọn & Tham gia lớp học (Class Selection)**: Quản lý lớp học theo khối ngành (Banking, Enterprise), mã lớp, thời hạn sử dụng và tiến độ học tập. Hỗ trợ tham gia lớp mới bằng mã.
- **Learner Dashboard 5-giây**: Trả lời ngay lập tức 3 câu hỏi của học viên:
  1. *Tôi đang ở lớp nào?*
  2. *Tôi đã học tới đâu?*
  3. *Tôi nên làm gì tiếp theo?* (CTA nổi bật: Tiếp tục bài đang học).

### 2. Lộ trình 5 bước tinh thông Prompt (Learning Path)
1. **Zero-shot**: Nhận diện điểm yếu của câu lệnh sơ sài.
2. **Structured Prompt**: Khung Vai trò - Ngữ cảnh - Nhiệm vụ - Ràng buộc - Định dạng.
3. **One-shot**: Định hình văn phong chuẩn mực bằng 1 ví dụ mẫu.
4. **Few-shot & Grounding**: Học từ nhiều ví dụ và đối chiếu tài liệu chính sách để chống bịa đặt thông tin.
5. **Thực hành tự do (Free Playground)**: Tự do áp dụng vào nghiệp vụ thực tế.

### 3. Không gian làm bài Đa giao diện (Dual Workspace)
- **Sổ tay tuần tự (Notebook Mode)**: Trải nghiệm như Google Colab / Jupyter Notebook nhưng được tinh gọn tối đa cho dân văn phòng.
- **Tích hợp song song (Hybrid Mode)**: Đề bài, dữ liệu mẫu bên trái — ô soạn thảo prompt và kết quả bên phải.
- **Breadcrumb Navigation**: Nút `← Quay lại Lớp học` giúp người học không bao giờ bị mắc kẹt.

### 4. Thử nghiệm, Đối chiếu & Đánh giá Nghiệp vụ
- **Control Data & Prompt Versioning**: Giữ cố định dữ liệu đầu vào để thử nhiều lần (Lần thử 1, Lần thử 2,...).
- **A/B Side-by-Side Comparison**: Đối chiếu trước/sau kiểu Google AI Studio, làm nổi bật các thành tố vừa bổ sung (Role, Constraint, Format...) và giải thích vì sao output tốt hơn.
- **5 Tiêu chí Đánh giá Nghiệp vụ (Business Rubric)**: Định dạng bảng, Độ đầy đủ, Tính hành động ngay, Tính bám sát dữ liệu (Groundedness), và Phù hợp văn phong ngân hàng.

### 5. Công cụ thực hành & Đồng hành thông minh
- **Bé Trợ Lý AI Cute (AI Coach)**: Linh vật đồng hành xuyên suốt các bài thực hành, chủ động gợi ý cách cải tiến prompt theo ngữ cảnh từng bài.
- **Guided Visual Walkthrough**: Hướng dẫn Onboarding 8 bước tương tác bằng Floating UI thông minh, tự động bật khi người học vào bài lần đầu.
- **Thư viện Prompt Chuẩn Nghiệp vụ (SOP Library)**: Lưu trữ, tra cứu và mở ngay vào Playground.
- **Lịch sử Câu lệnh (Prompt History)**: Xem lại chi tiết prompt và output qua từng lần thử, hỗ trợ xuất file Markdown báo cáo.
- **Reset nhanh về Landing Page**: Bấm vào logo PromptLab góc trên bên trái để reset toàn bộ hệ thống về ban đầu.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Smart Positioning**: `@floating-ui/react` (chống che khuất target khi spotlight tutorial)
- **AI Integration**: Hỗ trợ cả 2 chế độ:
  - Chế độ **Mô phỏng (Simulated Engine)**: Sẵn sàng chạy offline/workshop không cần mạng.
  - Chế độ **Gemini API Trực tiếp**: Kết nối trực tiếp mô hình Google Gemini 1.5 Flash.

---

## 💻 Cài Đặt & Chạy Cục Bộ (Getting Started)

### Yêu cầu:
- Node.js >= 18
- npm hoặc yarn/pnpm

### Các bước:

```bash
# 1. Clone repository
git clone https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs.git

# 2. Di chuyển vào thư mục dự án
cd Promptify---Prompt_Engineering_For_Non-techs

# 3. Cài đặt các gói phụ thuộc
npm install

# 4. Khởi chạy dev server
npm run dev

# 5. Mở trình duyệt tại:
# http://localhost:5173
```

---

## 👥 Tác Giả & Bản Quyền

- **Dự án**: Prompt Engineering for AI Engineer vs Business Users
- **Nhóm nghiên cứu & phát triển**: Linh Phạm, Khang, Dương, Triết
- **Định hướng triển khai**: Agribank (Ban Truyền thông & Khối Tín dụng) và Doanh nghiệp.
- **License**: MIT
