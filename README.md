# Promptify (PromptLab)

> **Học Prompt Engineering qua các tình huống công việc thực tế**  
> *Nền tảng đào tạo kỹ năng Prompt AI cho cán bộ & chuyên viên nghiệp vụ (Non-tech / Business Users)*

---

## 📖 Giới thiệu sản phẩm

**Promptify** là nền tảng học và thực hành Prompt Engineering được thiết kế riêng cho người dùng khối nghiệp vụ (Truyền thông, Tín dụng, Vận hành, CSKH,... tại ngân hàng và doanh nghiệp). 

Sản phẩm tập trung giải quyết các bài toán công việc thực tế mà không đòi hỏi kiến thức lập trình hay cấu hình kỹ thuật phức tạp:
- Chuẩn hóa báo cáo, xuất bảng biểu Markdown để đưa vào Excel.
- Áp dụng công thức cấu trúc câu lệnh chuẩn mực (Role, Context, Task, Constraint, Format).
- Định hình văn phong thương hiệu bằng ví dụ mẫu.
- Đối chiếu quy chế, tài liệu chính sách để AI trả lời chuẩn xác, chống bịa đặt.

---

## ✨ Tính năng phiên bản v1 (Features v1)

1. **Landing Page & Đăng nhập Google**
   - Màn hình chào đón chuẩn doanh nghiệp.
   - Hỗ trợ đăng nhập Google và chọn nhanh tài khoản mẫu cán bộ Agribank để thử nghiệm.
   - 
2. **Learner Dashboard 5-giây**
   - Giúp người học nắm bắt ngay trong 5 giây: Lớp đang học, tiến độ hoàn thành và nút hành động chính *"Tiếp tục bài đang học"*.

3. **Lộ trình học 5 cấp độ (Learning Path)**
   - **Bài 1 (Zero-shot):** Nhận diện điểm yếu của câu lệnh sơ sài.
   - **Bài 2 (Structured Prompt):** Áp dụng khung 5 thành tố chuyên nghiệp.
   - **Bài 3 (One-shot):** Định hình văn phong chuẩn mực ngân hàng bằng ví dụ mẫu.
   - **Bài 4 (Few-shot & Grounding):** Buộc AI đối chiếu tài liệu quy định, chống bịa đặt.
   - **Bài 5 (Thực hành tự do):** Tự do giải quyết bài toán nghiệp vụ riêng.

4. **Không gian làm bài đa giao diện (Dual Workspace)**
   - **Tích hợp song song (Hybrid Mode):** Vừa xem đề bài bên trái vừa soạn thảo prompt và xem kết quả bên phải.
   - **Sổ tay tuần tự (Notebook Mode):** Trải nghiệm bài học tuần tự tối giản theo phong cách notebook.
   - Thanh Breadcrumb điều hướng an toàn, không bị kẹt trong bài học.

5. **Đối chiếu Trước / Sau (A/B Side-by-Side Compare)**
   - Tự động gợi ý so sánh sau lần chạy thứ 2.
   - Hiển thị song song prompt cũ - mới, output cũ - mới và giải thích lý do output tốt hơn.

6. **Bộ 5 tiêu chí đánh giá nghiệp vụ (Business Evaluation)**
   - Tự động đánh giá: Đúng định dạng bảng, Độ đầy đủ, Tính hành động ngay, Tính bám sát dữ liệu (Groundedness), Văn phong chuẩn mực.

7. **Trợ lý AI & Hướng dẫn Onboarding**
   - Linh vật Bé Trợ lý AI gợi ý cách tối ưu câu lệnh theo từng bài.
   - Tutorial Spotlight 8 bước tự động kích hoạt khi học viên vào bài học lần đầu.

8. **Thư viện Prompt Chuẩn & Lịch sử câu lệnh**
    - Kho prompt chuẩn nghiệp vụ (SOP Library) có nhãn Khuyên dùng, hỗ trợ copy và mở ngay vào Playground.
    - Lịch sử lưu lại chi tiết prompt và output qua từng lần thử, cho phép xuất file Markdown.

---

## 💻 Hướng dẫn cài đặt & Chạy dự án (Getting Started)

### Yêu cầu:
- Node.js >= 18
- npm

### Các bước thực hiện:

```bash
# 1. Clone repository
git clone https://github.com/ElysiaTheElysier/Promptify---Prompt_Engineering_For_Non-techs.git

# 2. Di chuyển vào thư mục dự án
cd Promptify---Prompt_Engineering_For_Non-techs

# 3. Cài đặt thư viện phụ thuộc
npm install

# 4. Khởi chạy môi trường phát triển
npm run dev
```

Mở trình duyệt và truy cập: **`http://localhost:`**
