import { 
  analyzePromptStructure, 
  ALL_PROMPT_COMPONENTS, 
  COMPONENT_METADATA 
} from '../src/services/promptStructureAnalyzer';

console.log('=== TEST: Prompt Structure Analyzer ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// 1. Test Empty Prompt
console.log('--- Case 1: Empty and whitespace prompt ---');
const emptyRes = analyzePromptStructure('');
assert(emptyRes.components.length === 0, 'Empty string returns 0 components');
assert(emptyRes.detectedTypes.length === 0, 'Empty string returns empty detectedTypes');

const wsRes = analyzePromptStructure('    \n\t  ');
assert(wsRes.components.length === 0, 'Whitespace string returns 0 components');

// 2. Test Single Component Prompts
console.log('\n--- Case 2: Individual Component Detection ---');

const rolePrompt = 'Bạn là chuyên gia phân tích rủi ro tín dụng tại ngân hàng.';
const roleRes = analyzePromptStructure(rolePrompt);
assert(roleRes.detectedTypes.includes('role'), 'Detects Vietnamese Role');
assert(roleRes.components.some(c => c.type === 'role' && rolePrompt.slice(c.start, c.end) === c.text), 'Role span slice matches text');

const englishRolePrompt = 'You are an experienced senior credit risk officer at a commercial bank.';
const enRoleRes = analyzePromptStructure(englishRolePrompt);
assert(enRoleRes.detectedTypes.includes('role'), 'Detects English Role');

const taskPrompt = 'Hãy tóm tắt và phân tích báo cáo tài chính quý 3.';
const taskRes = analyzePromptStructure(taskPrompt);
assert(taskRes.detectedTypes.includes('task'), 'Detects Vietnamese Task');

const constraintPrompt = 'Tuyệt đối không suy diễn dữ liệu ngoài văn bản. Giới hạn tối đa 300 từ.';
const constraintRes = analyzePromptStructure(constraintPrompt);
assert(constraintRes.detectedTypes.includes('constraint'), 'Detects Vietnamese Constraint');

const formatPrompt = 'Định dạng kết quả dưới dạng bảng Markdown gồm 3 cột: Chỉ số, Giá trị, Nhận xét.';
const formatRes = analyzePromptStructure(formatPrompt);
assert(formatRes.detectedTypes.includes('output_format'), 'Detects Vietnamese Output Format');

const examplePrompt = 'Ví dụ mẫu: Khách hàng A -> Thu nhập 15tr -> Hạn mức 30tr.';
const exampleRes = analyzePromptStructure(examplePrompt);
assert(exampleRes.detectedTypes.includes('example'), 'Detects Vietnamese Example');

const groundingPrompt = 'Chỉ dựa trên tài liệu đính kèm bên dưới, căn cứ vào văn bản hướng dẫn 123/NHNo.';
const groundingRes = analyzePromptStructure(groundingPrompt);
assert(groundingRes.detectedTypes.includes('grounding'), 'Detects Vietnamese Grounding');

// 3. Test Full Vietnamese Realistic Business Prompt
console.log('\n--- Case 3: Realistic Full Vietnamese Prompt ---');
const fullVnPrompt = `Bạn là chuyên viên quan hệ khách hàng doanh nghiệp tại Agribank.
Bối cảnh: Khách hàng là công ty may mặc xuất khẩu đang có nhu cầu vay vốn lưu động.
Hãy lập tờ trình thẩm định phương án vay vốn chi tiết.
Yêu cầu bắt buộc:
- Tuyệt đối không suy diễn số liệu tài chính.
- Giới hạn độ dài dưới 500 từ.
Trình bày kết quả dưới dạng bảng Markdown gồm các cột: Tiêu chí, Đánh giá, Đề xuất.
Ví dụ mẫu:
Doanh thu năm 2023 đạt 50 tỷ -> Đạt yêu cầu.
Chỉ căn cứ vào hồ sơ tài chính được cung cấp.`;

const fullVnRes = analyzePromptStructure(fullVnPrompt);
console.log('Detected types in full VN prompt:', fullVnRes.detectedTypes);

assert(fullVnRes.detectedTypes.includes('role'), 'Full prompt includes role');
assert(fullVnRes.detectedTypes.includes('context'), 'Full prompt includes context');
assert(fullVnRes.detectedTypes.includes('task'), 'Full prompt includes task');
assert(fullVnRes.detectedTypes.includes('constraint'), 'Full prompt includes constraint');
assert(fullVnRes.detectedTypes.includes('output_format'), 'Full prompt includes output_format');
assert(fullVnRes.detectedTypes.includes('example'), 'Full prompt includes example');
assert(fullVnRes.detectedTypes.includes('grounding'), 'Full prompt includes grounding');
assert(fullVnRes.detectedTypes.length === 7, 'All 7 components detected successfully');

// 4. Test Span Integrity (offsets must precisely match prompt substrings)
console.log('\n--- Case 4: Span Integrity and No Overlaps ---');
let spansAccurate = true;
let hasOverlaps = false;

for (let i = 0; i < fullVnRes.components.length; i++) {
  const span = fullVnRes.components[i];
  const actualSlice = fullVnPrompt.slice(span.start, span.end);
  if (actualSlice !== span.text) {
    spansAccurate = false;
    console.error(`Mismatch at span ${i}: expected "${span.text}", got "${actualSlice}"`);
  }

  if (i > 0) {
    const prevSpan = fullVnRes.components[i - 1];
    if (prevSpan.end > span.start) {
      hasOverlaps = true;
      console.error(`Overlap detected between span ${i - 1} and ${i}: [${prevSpan.start}, ${prevSpan.end}] vs [${span.start}, ${span.end}]`);
    }
  }
}
assert(spansAccurate, 'Every detected span start/end offset strictly equals its text substring');
assert(!hasOverlaps, 'No overlapping spans exist in the output');

// 5. Test Full English Realistic Business Prompt
console.log('\n--- Case 5: Realistic Full English Prompt ---');
const fullEnPrompt = `Act as a senior credit risk analyst at a commercial bank.
Background: The client is an export garment manufacturing company requesting working capital.
Your task is to draft a comprehensive credit risk assessment report.
Constraints:
- Do not make assumptions or extrapolate numbers.
- Maximum length 500 words.
Output format: Present the output in a markdown table with columns: Criteria, Assessment, Recommendation.
Example: Revenue 50M -> Meets criteria.
Grounding: Rely strictly on the attached financial statements and documentation.`;

const fullEnRes = analyzePromptStructure(fullEnPrompt);
console.log('Detected types in full EN prompt:', fullEnRes.detectedTypes);
assert(fullEnRes.detectedTypes.includes('role'), 'Full EN includes role');
assert(fullEnRes.detectedTypes.includes('context'), 'Full EN includes context');
assert(fullEnRes.detectedTypes.includes('task'), 'Full EN includes task');
assert(fullEnRes.detectedTypes.includes('constraint'), 'Full EN includes constraint');
assert(fullEnRes.detectedTypes.includes('output_format'), 'Full EN includes output_format');
assert(fullEnRes.detectedTypes.includes('example'), 'Full EN includes example');
assert(fullEnRes.detectedTypes.includes('grounding'), 'Full EN includes grounding');

// 6. Test Performance (Zero Latency Benchmark)
console.log('\n--- Case 6: Local Performance Benchmark ---');
const startTime = performance.now();
for (let i = 0; i < 500; i++) {
  analyzePromptStructure(fullVnPrompt);
}
const elapsed = performance.now() - startTime;
const avgTime = elapsed / 500;
console.log(`500 iterations took ${elapsed.toFixed(2)}ms (average: ${avgTime.toFixed(3)}ms per call)`);
assert(avgTime < 5, 'Analyzer runs in < 5ms per call (real-time 60fps typing capability)');

// 7. Test Metadata & Business Explanations
console.log('\n--- Case 7: Business Metadata Integrity ---');
for (const comp of ALL_PROMPT_COMPONENTS) {
  const meta = COMPONENT_METADATA[comp];
  assert(!!meta.label && !!meta.businessImpact && !!meta.shortLabel, `Metadata for ${comp} has label and business impact`);
}

console.log(`\n=== SUMMARY: ${passedTests}/${totalTests} tests passed ===`);
if (passedTests === totalTests) {
  console.log('ALL PROMPT ANALYZER TESTS PASSED SUCCESSFULLY!\n');
} else {
  console.error('SOME TESTS FAILED!\n');
  process.exit(1);
}
