import { analyzePromptStructure } from '../src/services/promptStructureAnalyzer';

const textLF = `=== SYSTEM CONTEXT & VAI TRÒ ===
Bạn là Chuyên viên Truyền thông của Agribank.
Nguyên tắc bảo mật: Tuyệt đối không sử dụng thông tin PII thật. Chỉ làm việc trên các dữ liệu đã được ẩn danh hóa.

=== NGUYÊN LIỆU ĐÃ LÀM SẠCH (SCRUBBED DATA) ===
[Dán dữ liệu sau khi đã dùng Bút xóa PII]

=== NHIỆM VỤ & YÊU CẦU ĐẦU RA ===
Hãy xuất bản 03 góc tiếp cận tiêu đề bài viết theo 3 khía cạnh: (1) Nghị lực nhà nông, (2) Nghĩa tình Agribank, (3) Niềm tin hồi sinh. Mỗi góc độ gồm:
- Tiêu đề gợi ý (Mộc mạc, xúc động, không giật tít câu view)
- Thông điệp cốt lõi (1-2 câu)
- Đoạn mở đầu gợi ý (30-50 từ)`;

const textCRLF = textLF.replace(/\n/g, '\r\n');

console.log('Testing highlight accuracy with CRLF vs LF:');
const resLF = analyzePromptStructure(textLF);
const resCRLF = analyzePromptStructure(textCRLF);

console.log(`LF Detected components: ${resLF.components.length}`);
console.log(`CRLF Detected components: ${resCRLF.components.length}`);

let allMatched = true;
resCRLF.components.forEach((c, idx) => {
  const sliceLF = textLF.slice(c.start, c.end);
  const isMatch = sliceLF === c.text;
  if (!isMatch) {
    allMatched = false;
    console.error(`❌ Mismatch at index ${idx} [${c.type}]:`);
    console.error(`   Expected: "${c.text}"`);
    console.error(`   Got in LF DOM: "${sliceLF}"`);
  } else {
    console.log(`✅ [${c.type}] correctly matches LF DOM: "${c.text.slice(0, 30)}..."`);
  }
});

if (allMatched) {
  console.log('\n🎉 ALL COMPONENTS MATCH LF TEXTAREA OFFSETS PERFECTLY (0 character shift)!');
} else {
  process.exit(1);
}
