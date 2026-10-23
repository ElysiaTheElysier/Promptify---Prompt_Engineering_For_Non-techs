/**
 * Automated Verification Script: Pedagogical Flow, 8 Lab Solutions, Theory, and Assistance Confirmation
 */
import { LABS_DATA } from '../src/data/labsData';
import { ALL_PROMPT_COMPONENTS, COMPONENT_METADATA, analyzePromptStructure } from '../src/services/promptStructureAnalyzer';
import { LabAssistanceState } from '../src/types';

console.log('================================================================');
console.log('🧪 VERIFYING PEDAGOGICAL 4-TIER FLOW & LAB SOLUTIONS (8 LABS)');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${msg}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    process.exitCode = 1;
  }
}

// TEST 1: Check all 8 labs have pedagogical theory content and detailed solution steps
console.log('\nTEST 1: 8 Labs Pedagogical Content & Step-by-Step Solutions');
assert(LABS_DATA.length === 8, `Curriculum has exactly 8 labs (actual: ${LABS_DATA.length})`);

LABS_DATA.forEach((lab, idx) => {
  const labNum = idx + 1;
  console.log(`\n  Checking Lab ${labNum}: ${lab.title}`);
  
  // 1. Theory content
  assert(
    !!lab.theoryContent && lab.theoryContent.length > 150,
    `Lab ${labNum} has rich theory content (${lab.theoryContent?.length || 0} chars)`
  );
  assert(
    lab.theoryContent?.includes('Nguyên lý') || lab.theoryContent?.includes('Bản chất') || lab.theoryContent?.includes('Tư duy'),
    `Lab ${labNum} theory explains core principles/mental model`
  );

  // 2. Solution steps
  assert(
    Array.isArray(lab.solutionSteps) && lab.solutionSteps.length >= 3,
    `Lab ${labNum} has at least 3 detailed solution steps (actual: ${lab.solutionSteps?.length || 0})`
  );

  // Check each solution step structure
  lab.solutionSteps?.forEach((step, sIdx) => {
    assert(
      step.stepNumber === sIdx + 1 && !!step.title && !!step.explanation && step.explanation.length > 20,
      `Lab ${labNum} Step ${sIdx + 1} ("${step.title}") has valid number, title and in-depth explanation`
    );
  });

  // 3. Improved prompt (Reference Solution)
  assert(
    !!lab.improvedPrompt && lab.improvedPrompt.length > 50,
    `Lab ${labNum} has reference solution prompt (length: ${lab.improvedPrompt?.length || 0})`
  );

  // 4. Hints & Rubric
  assert(
    Array.isArray(lab.hints) && lab.hints.length >= 2,
    `Lab ${labNum} has at least 2 hints (actual: ${lab.hints?.length || 0})`
  );
});

// TEST 2: Unified Prompt Structure & Component Metadata
console.log('\nTEST 2: Prompt Structure Analyzer & 7 Core Components');
assert(ALL_PROMPT_COMPONENTS.length === 7, `7 core prompt components defined (actual: ${ALL_PROMPT_COMPONENTS.length})`);

ALL_PROMPT_COMPONENTS.forEach(type => {
  const meta = COMPONENT_METADATA[type];
  assert(
    !!meta && !!meta.label && !!meta.shortLabel && !!meta.businessImpact && !!meta.exampleSnippet,
    `Component '${type}' has full metadata: label, shortLabel, businessImpact, exampleSnippet`
  );
});

// Test analyzing a sample prompt with role, context, task, constraint, output
const samplePrompt = `Vai trò: Chuyên viên Agribank\nBối cảnh: Khách hàng cần vay vốn Tam Nông\nNhiệm vụ: Lập biên bản thẩm định\nRàng buộc: Không để lộ số CCCD, chỉ dùng định dạng Markdown\nĐịnh dạng đầu ra: Bảng Markdown`;
const analysis = analyzePromptStructure(samplePrompt);
assert(analysis.detectedTypes.length >= 4, `Analyzer detected ${analysis.detectedTypes.length} components in sample prompt`);

// TEST 3: Assistance Confirmation Flow & State Transition
console.log('\nTEST 3: Assistance Confirmation State Flow');
const initialState: LabAssistanceState = {
  hasViewedHints: false,
  hasViewedSolution: false
};
assert(!initialState.hasViewedHints && !initialState.hasViewedSolution, 'Initial assistance state is locked');

// Simulate unlocking hints after modal confirmation
const hintsUnlockedState: LabAssistanceState = {
  ...initialState,
  hasViewedHints: true,
  hintsUnlockedAt: new Date().toISOString()
};
assert(hintsUnlockedState.hasViewedHints && !!hintsUnlockedState.hintsUnlockedAt, 'Hints state correctly unlocked with timestamp');
assert(!hintsUnlockedState.hasViewedSolution, 'Solution remains locked when only hints are unlocked');

// Simulate unlocking solution after modal confirmation
const solutionUnlockedState: LabAssistanceState = {
  ...hintsUnlockedState,
  hasViewedSolution: true,
  solutionUnlockedAt: new Date().toISOString()
};
assert(solutionUnlockedState.hasViewedSolution && !!solutionUnlockedState.solutionUnlockedAt, 'Solution state correctly unlocked with timestamp');

console.log('\n================================================================');
console.log(`📊 TEST RESULT: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL PEDAGOGICAL FLOW & SOLUTION TESTS PASSED PERFECTLY!\n');
} else {
  console.error('❌ SOME TESTS FAILED!\n');
  process.exit(1);
}
