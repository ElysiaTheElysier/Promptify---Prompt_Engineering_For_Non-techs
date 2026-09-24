import { BusinessEvaluation, SavedPromptTemplate } from '../types';

/**
 * Detect structural components in user prompt
 */
export function detectPromptComponents(promptText: string) {
  const text = promptText.toLowerCase();

  const hasRole = 
    text.includes('role') ||
    text.includes('you are') ||
    text.includes('act as') ||
    text.includes('as an expert') ||
    text.includes('bạn là') || 
    text.includes('đóng vai trò') || 
    text.includes('vai trò');

  const hasContext = 
    text.includes('context') ||
    text.includes('background') ||
    text.includes('scenario') ||
    text.includes('given that') ||
    text.includes('below is') ||
    text.includes('bối cảnh') || 
    text.includes('ngữ cảnh') || 
    text.includes('tình huống') || 
    text.includes('dữ liệu');

  const hasTask = 
    text.includes('task') ||
    text.includes('assignment') ||
    text.includes('analyze') ||
    text.includes('summarize') ||
    text.includes('draft') ||
    text.includes('extract') ||
    text.includes('hãy') || 
    text.includes('nhiệm vụ') || 
    text.includes('yêu cầu');

  const hasConstraint = 
    text.includes('constraint') ||
    text.includes('must not') ||
    text.includes('do not') ||
    text.includes('strictly') ||
    text.includes('avoid') ||
    text.includes('limit') ||
    text.includes('ràng buộc') || 
    text.includes('tuyệt đối không') || 
    text.includes('không được');

  const hasFormat = 
    text.includes('output format') ||
    text.includes('format') ||
    text.includes('markdown table') ||
    text.includes('table') ||
    text.includes('bullet') ||
    text.includes('json') ||
    text.includes('định dạng') || 
    text.includes('bảng');

  const hasExample = 
    text.includes('example') ||
    text.includes('few-shot') ||
    text.includes('sample') ||
    text.includes('demonstration') ||
    text.includes('ví dụ') || 
    text.includes('mẫu');

  const hasGrounding = 
    text.includes('grounding') ||
    text.includes('rely strictly on') ||
    text.includes('grounded in') ||
    text.includes('cite') ||
    text.includes('căn cứ') || 
    text.includes('dựa trên');

  return {
    hasRole,
    hasContext,
    hasTask,
    hasConstraint,
    hasFormat,
    hasExample,
    hasGrounding,
  };
}

/**
 * Evaluate output against 5 business quality metrics
 */
export function evaluateBusinessMetrics(
  promptText: string, 
  outputText: string, 
  sampleData?: string
): BusinessEvaluation {
  const p = promptText.toLowerCase();
  const o = outputText.toLowerCase();

  // 1. Format Adherence
  let formatAdherence = true;
  if (p.includes('table') || p.includes('markdown') || p.includes('bảng')) {
    formatAdherence = outputText.includes('|') && outputText.includes('---');
  } else if (p.includes('bullet') || p.includes('list') || p.includes('danh sách')) {
    formatAdherence = outputText.includes('- ') || outputText.includes('* ') || outputText.includes('1.');
  } else {
    formatAdherence = outputText.length > 50 && outputText.includes('\n');
  }

  // 2. Completeness
  const completeness = 
    outputText.trim().length >= 120 && 
    (outputText.split('\n').length >= 3 || outputText.includes('|'));

  // 3. Actionability
  const actionability = 
    o.includes('recommend') ||
    o.includes('propose') ||
    o.includes('solution') ||
    o.includes('action') ||
    o.includes('next step') ||
    o.includes('approved') ||
    o.includes('khuyến nghị') || 
    o.includes('đề xuất') || 
    o.includes('giải pháp');

  // 4. Groundedness
  let groundedness = true;
  if (sampleData && sampleData.trim().length > 0) {
    const numbers = sampleData.match(/\d+(?:[.,]\d+)?/g) || [];
    if (numbers.length > 0) {
      const matched = numbers.some(num => outputText.includes(num));
      groundedness = matched || o.includes('revenue') || o.includes('profit') || o.includes('customer') || o.includes('doanh thu');
    }
  }

  // 5. Tone Fit
  const hasUnprofessionalWords = 
    o.includes('as an ai') ||
    o.includes('i think maybe') ||
    o.includes('sorry but') ||
    o.includes('tôi nghĩ là') || 
    o.includes('haha');
  const toneFit = !hasUnprofessionalWords && outputText.length > 30;

  return {
    formatAdherence,
    completeness,
    actionability,
    groundedness,
    toneFit,
  };
}

/**
 * Default SOP templates initialized in the Prompt Library
 */
export const INITIAL_SOP_TEMPLATES: SavedPromptTemplate[] = [
  {
    id: 'sop-1',
    title: 'SOP: Commercial Underwriting Review',
    businessUseCase: 'Rapid analysis of corporate balance sheets and debt-service coverage for credit facility approvals',
    labId: 'lab-2',
    promptText: `You are a Senior Credit Risk Analyst.
Task: Evaluate the attached corporate financial statements.
Constraints:
- Strictly rely on provided audited figures; zero ungrounded speculation.
- Identify 3 credit strengths and 3 liquidity risk alerts.
Output Format: Markdown table with 4 columns: [Financial Metric | Current Year | YoY Change | Risk Rating].`,
    techniqueUsed: 'Structured Prompt (4-Element Standard)',
    versionNumber: 2,
    department: 'Credit Underwriting & Risk Management',
    author: 'Enterprise Risk Committee',
    createdAt: '2026-09-15',
    isRecommended: true,
    sampleOutputSnippet: '| Metric | Current Year | YoY Change | Risk Rating |\n| Net Revenue | $45.2M | +12% | Stable Growth |',
    businessEvaluation: {
      formatAdherence: true,
      completeness: true,
      actionability: true,
      groundedness: true,
      toneFit: true,
    }
  },
  {
    id: 'sop-2',
    title: 'SOP: High-Priority Customer Escalation Resolution',
    businessUseCase: 'Triage dispute severity and formulate empathetic executive correspondence',
    labId: 'lab-1',
    promptText: `You are the Head of Client Experience.
Task: Process customer dispute regarding uncredited transaction funds.
Constraints:
- Maintain empathetic, professional, and authoritative tone.
- Commit to definitive resolution timeline within 24 business hours.
Output Format:
1. Priority Classification (Urgent / Standard)
2. Customer Response Letter (< 150 words)
3. Internal Routing Instructions for Ops Specialist`,
    techniqueUsed: 'Zero-shot with Emotional Guardrails',
    versionNumber: 3,
    department: 'Client Services & Operations',
    author: 'Customer Experience Team',
    createdAt: '2026-09-18',
    isRecommended: true,
    sampleOutputSnippet: 'Dear Valued Client, We sincerely apologize for the delay regarding transaction #...',
    businessEvaluation: {
      formatAdherence: true,
      completeness: true,
      actionability: true,
      groundedness: true,
      toneFit: true,
    }
  },
  {
    id: 'sop-3',
    title: 'SOP: Executive Credit Memorandum Synthesis',
    businessUseCase: 'Condense 10-page underwriting packet into a 1-page executive summary for the Credit Committee',
    labId: 'lab-5',
    promptText: `You are the Secretary to the Executive Credit Committee.
Task: Extract decisive underwriting terms from the credit proposal dossier.
Groundedness: Extract explicit numbers directly from source dossier; no ungrounded estimates.
Output Format:
- Borrower & Operating Sector:
- Proposed Credit Facility & Term:
- Collateral Appraisal & Loan-to-Value (LTV):
- Underwriting Recommendation:`,
    techniqueUsed: 'Grounding & Document Extraction',
    versionNumber: 1,
    department: 'Commercial Banking',
    author: 'Senior Underwriter',
    createdAt: '2026-09-20',
    isRecommended: false,
    sampleOutputSnippet: '- Borrower: An Phu Agri-Processing Corp\n- Facility: $25M Revolver...',
    businessEvaluation: {
      formatAdherence: true,
      completeness: true,
      actionability: true,
      groundedness: true,
      toneFit: true,
    }
  }
];

const SOP_STORAGE_KEY = 'promptify_saved_library';

/**
 * Retrieve saved prompts from localStorage
 */
export function getSavedPromptLibrary(): SavedPromptTemplate[] {
  try {
    const saved = localStorage.getItem(SOP_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading prompt library from localStorage', err);
  }
  localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(INITIAL_SOP_TEMPLATES));
  return INITIAL_SOP_TEMPLATES;
}

/**
 * Save new prompt to library
 */
export function savePromptToLibrary(item: Omit<SavedPromptTemplate, 'id' | 'createdAt'>): SavedPromptTemplate {
  const current = getSavedPromptLibrary();
  const newItem: SavedPromptTemplate = {
    ...item,
    id: `sop-${Date.now()}`,
    createdAt: new Date().toISOString().split('T')[0],
  };
  const updated = [newItem, ...current];
  localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(updated));
  return newItem;
}

/**
 * Toggle recommended flag
 */
export function togglePromptRecommended(id: string): SavedPromptTemplate[] {
  const current = getSavedPromptLibrary();
  const updated = current.map(item => 
    item.id === id ? { ...item, isRecommended: !item.isRecommended } : item
  );
  localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export interface LearningInsight {
  promptChanges: string[];
  outputImprovements: {
    beforeDesc: string;
    afterDesc: string;
  };
  whyBetter: string;
  takeaway: string;
  chips: string[];
}

/**
 * Generate learning insights comparing two prompt iterations
 */
export function generateLearningInsight(
  beforePrompt: string,
  afterPrompt: string,
  beforeOutput: string,
  afterOutput: string,
  labFallback?: { 
    whyBetter?: string; 
    promptChanges?: string[]; 
    outputChanges?: { before: string; after: string } 
  }
): LearningInsight {
  const bComp = detectPromptComponents(beforePrompt);
  const aComp = detectPromptComponents(afterPrompt);

  const chips: string[] = [];
  const promptChanges: string[] = [];

  if (!bComp.hasRole && aComp.hasRole) {
    chips.push('Added Role');
    promptChanges.push('Added explicit domain expert persona (Role) to anchor perspective.');
  }
  if (!bComp.hasContext && aComp.hasContext) {
    chips.push('Added Context');
    promptChanges.push('Provided concrete scenario background and reference dossier (Context).');
  }
  if (!bComp.hasTask && aComp.hasTask) {
    chips.push('Added Task');
    promptChanges.push('Clarified core actionable assignment and deliverable objective (Task).');
  }
  if (!bComp.hasConstraint && aComp.hasConstraint) {
    chips.push('Added Constraints');
    promptChanges.push('Introduced safety guardrails and prevented speculative extrapolation (Constraints).');
  }
  if (!bComp.hasFormat && aComp.hasFormat) {
    chips.push('Added Format');
    promptChanges.push('Mandated structured table or bulleted output layout (Output Format).');
  }
  if ((!bComp.hasExample && aComp.hasExample) || (!bComp.hasGrounding && aComp.hasGrounding)) {
    chips.push('Added Grounding/Examples');
    promptChanges.push('Supplied verifiable source facts and reference examples (Example / Evidence).');
  }

  if (promptChanges.length === 0) {
    if (labFallback?.promptChanges && labFallback.promptChanges.length > 0) {
      promptChanges.push(...labFallback.promptChanges);
    } else {
      promptChanges.push('Prompt is more clearly structured, concise, and focused.');
    }
  }

  const hasTable = afterOutput.includes('|') && afterOutput.includes('---');
  if (hasTable) {
    chips.push('Structured Markdown Table');
  } else {
    chips.push('Refined Output Quality');
  }

  const beforeDesc = labFallback?.outputChanges?.before || 
    (beforeOutput.length < 150 
      ? 'Vague, generic response without empirical backing or structure.' 
      : 'Conversational narrative that is verbose and difficult to extract key actions from.');

  const afterDesc = labFallback?.outputChanges?.after || 
    (hasTable 
      ? 'Cohesive tabular presentation with explicit metrics, clear risks, and actionable recommendations.' 
      : 'Clear multi-layered structure with concrete criteria and practical execution steps.');

  const whyBetter = labFallback?.whyBetter || 
    'Specifying an expert role along with strict output format constraints eliminates guesswork, focusing the model on actionable business analysis.';

  const takeaway = 
    'Always anchor your prompts with: [Role] + [Context & Data] + [Explicit Task] + [Target Output Format] before execution.';

  return {
    promptChanges,
    outputImprovements: {
      beforeDesc,
      afterDesc
    },
    whyBetter,
    takeaway,
    chips
  };
}
