import {scaffoldTag} from './scaffoldRecognitionService';
const lessons:Record<string,[string,string,string,string]>={
 role:['Sets a specific business perspective and responsibility.','Xác định vai trò và trách nhiệm nghiệp vụ cụ thể.','Act as a support analyst.','Đóng vai chuyên viên hỗ trợ.'],
 context:['Supplies the authorized facts and sources needed for this task.','Cung cấp dữ kiện và nguồn được cấp quyền cho nhiệm vụ.','Use the supplied ticket and cite the approved SOP page.','Dùng ticket được cung cấp và trích trang SOP đã duyệt.'],
 task:['States the action and success condition clearly.','Nêu rõ hành động và điều kiện hoàn thành.','Classify the ticket and explain the next action.','Phân loại ticket và giải thích bước xử lý tiếp theo.'],
 guardrail:['Defines boundaries that prevent unsupported claims and personal data exposure.','Đặt giới hạn để tránh bịa dữ kiện và lộ thông tin cá nhân.','Use only the supplied facts. Do not include personal information.','Chỉ dùng dữ kiện được cung cấp. Không đưa thông tin cá nhân.'],
 format:['Makes the output structure predictable and reusable.','Giúp cấu trúc đầu ra nhất quán và tái sử dụng được.','Return a table: Category | Source | Next action.','Trả bảng: Phân loại | Nguồn | Bước tiếp theo.'],
 prove:['Requests verifiable evidence and a check against the authorized source.','Yêu cầu bằng chứng kiểm chứng được và đối chiếu nguồn được cấp quyền.','For each conclusion, cite the SOP page and identify any unsupported detail.','Với mỗi kết luận, trích trang SOP và chỉ rõ chi tiết chưa có căn cứ.'],
 example:['Demonstrates the expected input-to-output pattern with a safe sample.','Minh họa mẫu đầu vào và đầu ra bằng dữ liệu an toàn.','Input: a delivery question. Output: Delivery status | approved source.','Đầu vào: câu hỏi giao hàng. Đầu ra: Trạng thái giao hàng | nguồn đã duyệt.'],
 temperature:['Controls output variation; lower values favor consistent SOP tasks.','Điều chỉnh biến thiên; giá trị thấp phù hợp tác vụ SOP cần nhất quán.','Start low, compare saved attempts, and keep other settings fixed.','Bắt đầu thấp, so sánh các lượt đã lưu và giữ các tham số khác cố định.'],
 'top p':['Limits the probability range for selecting the next token.','Giới hạn dải xác suất khi chọn token tiếp theo.','Change one parameter at a time to understand its effect.','Thay đổi từng tham số để hiểu tác động.'],
 'max tokens':['Caps generated output length and affects cost; it does not guarantee completeness.','Giới hạn độ dài đầu ra và ảnh hưởng chi phí; không bảo đảm nội dung đầy đủ.','Allow enough space for the requested structure.','Dành đủ token cho cấu trúc đầu ra yêu cầu.'],
 'stop sequences':['Stops generation when a configured literal sequence is reached.','Dừng sinh khi gặp đúng chuỗi đã cấu hình.','Use END only when it will not truncate required content.','Chỉ dùng END khi không làm cắt mất nội dung cần thiết.'],
 'search grounding':['Adds public web sources when the provider supports search; approved SOP rules remain authoritative.','Bổ sung nguồn web khi nhà cung cấp hỗ trợ; SOP được duyệt vẫn có thẩm quyền.','Use for external facts, never to override an approved policy.','Dùng cho dữ kiện bên ngoài, không ghi đè chính sách đã duyệt.'],
 'system instruction':['Defines the model role, boundaries and authority before the user prompt.','Xác định vai trò, giới hạn và thẩm quyền trước prompt người dùng.','Supplement style without contradicting facilitator rules.','Bổ sung phong cách nhưng không mâu thuẫn quy tắc giảng viên.']
};
export function promptLearning(topic:string,language:string){
 const key=topic.toLowerCase().replace(/\[|\]/g,'').trim();
 const match=lessons[key]||lessons[Object.keys(lessons).find(k=>key.includes(k))||'task'];
 return {impact:match[language==='vi'?1:0],sample:match[language==='vi'?3:2]};
}

export function scaffoldSnippet(chip:{name:string;tag:string},language:string){const raw=(chip.tag||'').trim();return /^(\[[^\]]+\]|[A-Za-z][A-Za-z -]*)\s*:/.test(raw)?raw:'['+scaffoldTag(chip)+']: '+promptLearning(scaffoldTag(chip),language).sample;}
