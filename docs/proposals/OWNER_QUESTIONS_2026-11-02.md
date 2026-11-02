# Câu hỏi cần chủ sản phẩm trả lời trước khi launch Promptify (02/11/2026)

Gửi anh/chị Đức (và người duyệt ngân sách). Mỗi câu trả lời quyết định trực tiếp một bước kỹ thuật; câu nào chưa trả lời được thì team sẽ dùng giá trị trong cột "Nếu chưa trả lời" và ghi rõ đó là giả định.

| # | Câu hỏi | Vì sao cần | Nếu chưa trả lời |
| --- | --- | --- | --- |
| 1 | Lúc mở cho học viên, **tối đa bao nhiêu người bấm Run / AI Judge cùng một lúc**? (Khác với số người đăng ký: ví dụ 200 người học nhưng mỗi buổi chỉ 20 người làm bài cùng lúc) | Đã đo chắc chắn được 2–3 lần chấm cùng lúc. 100 người cùng lúc từng chỉ thành công 6/100. Con số này quyết định có cần nâng cấp hàng đợi + load test (tốn phí) trước launch hay không | Pilot ≤ 20 người, chia buổi |
| 2 | **Ngân sách AI/hạ tầng mỗi tháng** là bao nhiêu? Có duyệt chi phí load test một lần (ước tính vài chục USD) không? | Đặt budget alert; quyết định có load test hay không | Budget alert 200 USD/tháng; không load test |
| 3 | **Ai nhận cảnh báo** khi hệ thống lỗi (email)? Trong giờ hay 24/7? | Hiện chưa có alert nào. Không có người nhận thì lỗi chỉ được phát hiện khi học viên báo | Chưa thể launch |
| 4 | Nếu mất dữ liệu, **chấp nhận mất tối đa bao lâu dữ liệu** (RPO) và **hệ thống được phép ngừng tối đa bao lâu** (RTO)? | Chọn cấu hình backup và diễn tập khôi phục | RPO 5 phút (PITR), RTO 4 giờ |
| 5 | **Lưu dữ liệu học viên** (prompt, output, điểm) bao lâu? Khi nhân viên nghỉ việc thì xoá hay giữ? | Chính sách lưu trữ và quyền riêng tư | Giữ đến khi có quyết định, không tự xoá |
| 6 | **Gói Basic công khai**: trong code có sẵn một lớp miễn phí mà *bất kỳ ai có tài khoản Google* đều tự đăng ký được và chạy AI 10 lần/ngày, không cần có tên trong danh sách nhân viên Intrepid. Phase 1 đã ghi phần này nằm ngoài phạm vi. Nếu mở, người ngoài công ty có thể dùng AI bằng chi phí của Intrepid. **Tắt trên production?** | Tránh chi phí và truy cập ngoài ý muốn | **Tắt** (đã cấu hình sẵn) |
| 7 | Có cho **Gmail cá nhân** (không phải email `@intrepid.asia`) vào học nếu có tên trong roster không? | Production chỉ cho vào các domain được khai báo | Chỉ domain công ty |
| 8 | **Hạn mức token mỗi phiên học**: chỉ cần chặn mềm (có thể vượt một chút khi nhiều tab chạy cùng lúc) hay phải chặn cứng tuyệt đối? | Chặn cứng cần thêm việc kỹ thuật (1–3 ngày) | Chưa bật hạn mức phiên |
| 9 | **Google Drive/Sheets** có bắt buộc ngay ngày đầu không, hay giảng viên upload file trực tiếp là đủ? | Nguồn SOP dạng PDF/DOCX/XLSX/Google Doc chưa được kiểm hết trên staging | Upload trực tiếp; Drive kiểm sau |
| 10 | **Chứng chỉ** có được dùng cho HR (xét lương/thăng tiến) không? | Nếu có, cần review chất lượng chấm của AI Judge bởi người chấm trước launch | Chứng chỉ chỉ mang tính ghi nhận |
| 11 | Ai **ký duyệt go-live** và ngày mong muốn? | Chốt thời hạn cho các việc còn lại | — |

Thông tin thêm: production sẽ chạy chung project GCP với staging nhưng có database, service và website riêng. Hệ quả: tài khoản đăng nhập Google và quota AI là dùng chung, nên team sẽ không chạy thử tải trên staging khi production đang có người học.
