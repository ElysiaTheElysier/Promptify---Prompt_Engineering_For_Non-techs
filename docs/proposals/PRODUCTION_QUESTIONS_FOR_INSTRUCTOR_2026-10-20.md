# Nội dung gửi thầy để chốt trước production

Thầy ơi, hiện các luồng học, chạy prompt + tự chấm, lưu mẫu, Compare, badge/chứng chỉ và SOP đã được kiểm bằng dữ liệu hư cấu trên staging. Em đang rà tiếp các lỗi chặn trước khi mở thật, chưa đụng production. Mục tiêu ban đầu là 100 người đồng thời. Nhờ thầy chốt giúp các mục sau:

1. **100 người đồng thời là 100 người đang mở app, hay cả 100 cùng bấm Run prompt?** Ngân sách tối đa cho một buổi kiểm tải AI và chi phí AI mỗi tháng là bao nhiêu? Có giờ học cao điểm dự kiến không?
2. **Khi app lỗi, ai sẽ nhận email và chịu trách nhiệm xử lý?** Nhờ thầy cho email/người phụ trách chính, người dự phòng và giờ trực. Hiện chưa có kênh cảnh báo được cấu hình; cần người nhận thực sự, không chỉ bật một biểu đồ.
3. **Nếu xảy ra sự cố dữ liệu, mình chấp nhận mất tối đa bao lâu dữ liệu mới nhập và cần app chạy lại sau bao lâu?** Ví dụ: mất tối đa 15 phút dữ liệu, chạy lại trong 2 giờ. Đây chỉ là ví dụ để thầy chọn, chưa phải cam kết. Đồng thời xin mức chi phí tối đa cho một lần thử khôi phục trên database staging riêng; chưa thử trên production.
4. **Google Drive/Sheets và đồng bộ roster có bắt buộc trong đợt ra mắt đầu tiên không?** Nếu có, cần danh tính Google đã được cấp quyền sẵn và folder/sheet staging riêng để kiểm, cùng người phụ trách dữ liệu. Nếu chưa cần, xin chốt rõ để loại khỏi phạm vi ra mắt, không để nút tính năng chưa hoạt động gây hiểu nhầm.
5. **Dữ liệu thật được phép đưa vào gồm những gì và lưu bao lâu?** Cần chốt loại SOP được phép upload, thông tin cá nhân/công ty cần loại bỏ, thời hạn lưu prompt/kết quả/file/log và người có quyền xem hoặc yêu cầu xóa.

Em sẽ dùng các câu trả lời để hoàn tất kiểm tải, cảnh báo và diễn tập khôi phục. Production cần người phụ trách xác nhận kết quả và đồng ý lịch mở; việc staging chạy được chưa đủ để kết luận production sẵn sàng hoàn toàn.

## Bảng ghi câu trả lời

| Mục | Cần điền |
|---|---|
| Đỉnh tải | 100 người mở app / 100 lượt AI cùng lúc / mô tả khác |
| Ngân sách kiểm tải và vận hành | … |
| Người nhận cảnh báo chính / dự phòng | … |
| Giờ trực và thời gian phản hồi mong muốn | … |
| Mất dữ liệu tối đa chấp nhận được | … phút/giờ |
| Thời gian khôi phục mong muốn | … giờ |
| Chi phí tối đa cho diễn tập restore | … |
| Drive/Sheets/roster trong đợt 1 | Bắt buộc / chưa cần |
| Chủ dữ liệu và chính sách lưu/xóa | … |
| Người duyệt mở production | … |

Tài liệu này là bản nháp để người dùng gửi; Codex chưa gửi email/tin nhắn hoặc tạo kênh thông báo cho bất kỳ ai.
