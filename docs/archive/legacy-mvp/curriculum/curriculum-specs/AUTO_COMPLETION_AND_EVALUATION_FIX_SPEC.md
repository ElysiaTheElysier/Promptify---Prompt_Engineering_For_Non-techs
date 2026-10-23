# ĐẶC TẢ CƠ CHẾ TỰ ĐỘNG HOÀN THIỆN SAU PHÂN TÍCH ĐÁNH GIÁ (AUTO-COMPLETION & ONE-CLICK AUTO-FIX SPECIFICATION)
## DÀNH CHO NỀN TẢNG ĐÀO TẠO PROMPT ENGINEERING CHO DÂN VĂN PHÒNG (NON-TECH)

Tài liệu này đặc tả **Cơ chế Tự động Hoàn thiện Câu lệnh (Auto-Completion / One-Click Auto-Fix)** được kích hoạt ngay sau khi hệ thống phân tích, chấm điểm và chỉ ra điểm yếu trong prompt của học viên.

---

## 🎯 BỐI CẢNH & VẤN ĐỀ CỦA DÂN VĂN PHÒNG (PROBLEM STATEMENT)

### Nỗi đau của người học Non-tech:
1. **Biết lỗi nhưng không biết sửa:** Khi hệ thống chấm điểm báo: *"Prompt của bạn đạt 45/100 điểm - Thiếu Ràng buộc Tiêu cực (Guardrails) và chưa có Khuôn mẫu Đầu ra (Formatting)"*, người học văn phòng thường bối rối:
   > *"Tôi biết là thiếu rồi, nhưng cú pháp viết câu lệnh ràng buộc thế nào cho chuẩn kỹ thuật? Viết bảng Markdown thì gõ dấu gạch đứng `|` ra sao?"*
2. **Ngại gõ tay từ đầu:** Việc bắt học viên tự gõ lại một đoạn prompt dài 200 từ dễ gây nản lòng (Fatigue), làm đứt gãy mạch học tập.

### Giải pháp: Cơ chế Tự động Hoàn thiện 1-Chạm (One-Click Auto-Complete)
Ngay tại Bảng Chấm Điểm (Score Breakdown Card):
- Bên cạnh mỗi tiêu chí bị điểm thấp, hệ thống cung cấp **Nút Chèn Nhanh Thành Phần Còn Thiếu (Micro Auto-Complete Chip)**.
- Đồng thời có một nút chính: **`✨ Tự Động Hoàn Thiện & Tối Ưu Toàn Diện (Auto-Fix All)`** để tự động nâng cấp câu lệnh lên chuẩn 90 - 100 điểm trong 1 click.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 📊 ĐÁNH GIÁ CHẤT LƯỢNG: 45 / 100 ĐIỂM (CẦN CẢI THIỆN)                           │
│ 💡 Lời khuyên: Prompt đang thiếu Ràng buộc bảo mật và Khuôn định dạng bảng.      │
│                                                                                 │
│ [✨ TỰ ĐỘNG HOÀN THIỆN & NÂNG CẤP CÂU LỆNH (AUTO-FIX)]  ◄── NÚT PHÉP THUẬT      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ CHI TIẾT TIÊU CHÍ & CÔNG CỤ HOÀN THIỆN NHANH:                                  │
│ • Vai trò chuyên môn:   20/20  [✅ Đạt chuẩn]                                    │
│ • Cụ thể nhiệm vụ:     15/20  [✅ Khá tốt]                                      │
│ • Ràng buộc bảo vệ:     0/20  [❌ Thiếu] ──► [+ Chèn Hàng Rào Ràng Buộc Tiêu Cực]│
│ • Tham số hóa biến số:  0/20  [❌ Thiếu] ──► [+ Tự Động Gắn Thẻ Biến {{data}}]   │
│ • Khuôn dạng đầu ra:   10/20  [⚠️ Sơ sài] ──► [+ Chèn Khuôn Bảng Markdown 5 Cột] │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## I. KIẾN TRÚC THUẬT TOÁN AUTO-COMPLETION (THE AUTO-FIX ENGINE)

### 1. Phân tích Chẩn đoán (Diagnostic Analyzer)
Thuật toán dựa trên kết quả của hàm đánh giá Rubric (`evaluatePromptRubric` hoặc `detectPromptComponents`):

```typescript
export interface AutoFixSuggestion {
  targetCriterion: 'persona' | 'guardrails' | 'format' | 'variables' | 'task';
  title: string;
  description: string;
  snippetToInsert: string;
  insertionPosition: 'top' | 'bottom' | 'replace';
}
```

### 2. Thư viện Mẫu Hoàn Thiện Ngữ Cảnh (Contextual Snippet Injector)
Tùy thuộc vào từng bài lab và tiêu chí bị khuyết, thuật toán sẽ chọn khối mã bù đắp chuẩn mực:

#### A. Khi khuyết "Ràng buộc & Chốt chặn Bảo vệ" (Guardrails Score < 14):
- **Snippet chèn tự động:**
  ```text

  === RÀNG BUỘC THÉP & CHỐT CHẶN BẢO VỆ (GUARDRAILS) ===
  - Tuyệt đối KHÔNG sử dụng từ ngữ quảng cáo giật gân, đao to búa lớn hoặc từ ngữ tiêu cực.
  - Bỏ qua toàn bộ lời chào hỏi xã giao, đi thẳng vào nội dung chính.
  - Chỉ trả lời dựa trên 100% dữ liệu đã cung cấp, tuyệt đối không suy đoán bịa đặt.
  ```
- **Vị trí chèn:** Chèn vào sau phần nhiệm vụ chính.

#### B. Khi khuyết "Khuôn dạng Đầu ra Bảng biểu" (Format Score < 15):
- **Snippet chèn tự động:**
  ```text

  === YÊU CẦU ĐỊNH DẠNG ĐẦU RA (STRUCTURED OUTPUT) ===
  Xuất bản duy nhất 01 Bảng Markdown hoàn chỉnh với các cột sau:
  | STT | Danh Mục / Khách Hàng | Vấn Đề Cốt Lõi | Số Liệu Xác Thực | Đề Xuất Hành Động Ngay |
  | :--- | :--- | :--- | :--- | :--- |
  ```

#### C. Khi khuyết "Tham số hóa Biến số" (Variables Score == 0):
- **Snippet chèn tự động:**
  Quét các khối dữ liệu thô dài hơn 50 ký tự trong prompt và tự động đóng gói thành:
  `{{input_data}}` hoặc cặp thẻ XML:
  ```text
  <du_lieu_nguyen_lieu>
  [Dữ liệu thô của người dùng]
  </du_lieu_nguyen_lieu>
  ```

#### D. Khi khuyết "Vai trò Chuyên môn" (Persona Score < 14):
- **Snippet chèn tự động:**
  ```text
  === ĐỊNH VỊ VAI TRÒ CHUYÊN GIA ===
  Bạn là Chuyên gia Cao cấp tại Ngân hàng Agribank với 15 năm kinh nghiệm nghiệp vụ chuyên sâu. Văn phong mộc mạc, chuẩn mực, chính xác 100%.

  ```
- **Vị trí chèn:** Chèn lên đầu câu lệnh (`top`).

---

## II. TRẢI NGHIỆM TƯƠNG TÁC NGƯỜI DÙNG (USER INTERACTION FLOW)

```
[HỌC VIÊN BẤM "CHẠY THỬ" LẦN 1]
               │
               ▼
[HỆ THỐNG PHÂN TÍCH & HIỂN THỊ ĐIỂM SỐ: 45/100]
               │
               ▼
[HIỆN NÚT PHÉP THUẬT: "✨ TỰ ĐỘNG HOÀN THIỆN CÂU LỆNH"]
               │
               ├─────────────────────────┬─────────────────────────┐
               ▼                         ▼                         ▼
   [BẤM: CHÈN RÀNG BUỘC]     [BẤM: CHÈN KHUÔN BẢNG]    [BẤM: AUTO-FIX TOÀN DIỆN]
               │                         │                         │
               └─────────────────────────┼─────────────────────────┘
                                         ▼
                [CÂU LỆNH TRONG Ô SOẠN THẢO TỰ ĐỘNG CẬP NHẬT]
                [HIỆU ỨNG NHẤP NHÁY XANH LỤC TẠI PHẦN ĐƯỢC CHÈN]
                                         │
                                         ▼
                [ĐIỂM SỐ TỰ ĐỘNG TÁI CHẤM NHẢY VỌT: 95/100]
                                         │
                                         ▼
                [HỌC VIÊN BẤM "CHẠY THỬ" LẦN 2 ──► KẾT QUẢ HOÀN HẢO]
```

### 1. Phản hồi Thị giác Tức thì (Instant Visual Feedback)
- Khi học viên bấm nút Auto-Complete, vùng văn bản được thêm mới sẽ có **hiệu ứng nhấp nháy ánh sáng xanh (Pulse Green Animation)** trong 1.5 giây để học viên nhận biết chính xác: *"Hệ thống vừa thêm khối nào vào câu lệnh của mình"*.
- Điểm số trên thanh Rubric tự động nhảy số (Animated Counter) từ 45 → 95 điểm, mang lại cảm giác thành tựu và phấn khích tức thì.

### 2. Tôn trọng Quyền Kiểm soát của Người dùng
- Hệ thống không ép buộc: Học viên có thể chọn hoàn thiện từng phần nhỏ (thông qua các nút Chip nhỏ) hoặc hoàn thiện toàn diện (nút Auto-Fix All).
- Luôn có nút **"Hoàn tác (Undo)"** nếu học viên muốn quay lại câu lệnh nguyên bản của mình.

---

## III. ỨNG DỤNG AUTO-COMPLETION TRONG TRỌN BỘ 8 BÀI LAB

| Bài Lab | Lỗi Thường Gặp Cần Auto-Fix | Hành Động Auto-Completion Tương Ứng |
| :---: | :--- | :--- |
| **Lab 01** | Quên khử số CCCD, SĐT của khách hàng. | **[✨ Tự Động Bôi Đen PII]**: Quét và đổi các số CCCD/SĐT thành `[SỐ_CCCD_X]`, `[SĐT_X]`. |
| **Lab 02** | Thiếu bối cảnh tĩnh thương hiệu và danh sách từ cấm. | **[✨ Chèn Bìa Hồ Sơ Tam Nông]**: Chèn bộ tôn chỉ mộc mạc và danh sách từ cấm "siêu rẻ, bùng nổ". |
| **Lab 03** | Prompt chỉ giục thanh minh vỡ nợ, thiếu suy luận CoT. | **[✨ Khóa Tư Duy 4 Mắt]**: Tự động chèn 4 bước `[BƯỚC 1]` đến `[BƯỚC 4]` ép AI suy luận pháp lý. |
| **Lab 04** | Câu lệnh không yêu cầu tra cứu số liệu lãi suất Thông tư 04. | **[✨ Kích Hoạt Vòng Lặp ReAct]**: Chèn khung `THOUGHT -> ACTION -> OBSERVATION -> RESPONSE`. |
| **Lab 05** | Để nhiệt độ cao cho bài toán số liệu. | **[✨ Cố Định Nhiệt Độ 0.0]**: Tự động chuyển thanh trượt Temperature về 0.0 và thêm Stop Sequence. |
| **Lab 06** | Văn xuôi dài dòng, không có khuôn Markdown. | **[✨ Ép Khuôn Bảng Excel]**: Chèn bảng 6 cột và thẻ Delimiter `<danh_sach_khieu_nai>`. |
| **Lab 07** | Không có hàng rào phòng thủ Prompt Injection. | **[✨ Lập Vùng Cách Ly Dữ Liệu]**: Đóng gói tài liệu vào thẻ cách ly an toàn và chèn lệnh khóa Override. |
| **Lab 08** | Hỏi sự vụ hẹp, thiếu câu hỏi Step-back. | **[✨ Chèn Bước Lùi Trừu Tượng Hóa]**: Tự động bổ sung câu hỏi nguyên lý nền tảng trước bài toán cụ thể. |

---

## IV. HƯỚNG DẪN PROMPT CHO AI GENERATOR (META-PROMPT)

Khi đưa tài liệu cho AI để tạo nội dung hoặc code web cho bài lab, hãy thêm chỉ thị sau:

```text
YÊU CẦU BẮT BUỘC VỀ CƠ CHẾ AUTO-COMPLETION:
Trong mỗi bài lab, hãy cung cấp một cơ chế Auto-Fix tự động gồm:
1. `autoFixSnippets`: Mảng các đoạn mã gợi ý hoàn thiện tương ứng với các tiêu chí bị thiếu (Persona, Guardrails, Format, Variables).
2. Khi học viên có điểm Rubric dưới 70 điểm, hệ thống phải sinh ra nút "✨ Tự Động Hoàn Thiện (Auto-Fix)" để học viên bấm vào là tự động chèn khối mã mẫu mực vào ô prompt.
3. Giải thích ngắn gọn trong 1 câu: Khối mã vừa được chèn giúp giải quyết tiêu chí nào để học viên hiểu bản chất.
```
