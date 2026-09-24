import { UIMode, LabStep } from '../types';

export interface TutorialStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  title: string;
  targetId: string;
  description: string;
  labAdvice: string;
  fallbackNote?: string;
  demoAction?: 'show-data' | 'show-prompt' | 'show-run' | 'show-output' | 'show-coach' | 'show-compare' | 'show-library';
}

/**
 * Generate 8-step guided walkthrough customized per UI Mode and active Lab
 */
export function getTutorialSteps(mode: UIMode, lab: LabStep): TutorialStep[] {
  let labSpecificAdvice = {
    scenario: 'Carefully read the business requirements to determine the appropriate persona.',
    data: 'Review the fixed control dataset to use as context.',
    prompt: 'Start with a clear, concise baseline prompt.',
    run: 'Click Run Prompt to generate the initial AI response.',
    output: 'Review the output to see if it meets completeness and formatting standards.',
    coach: 'Click AI Coach in the bottom-right corner if you need pedagogical guidance.',
    compare: 'Run at least 2 attempts to compare side-by-side progression.',
    library: 'Save the highest-scoring prompt into the SOP Library for team reuse.',
  };

  const labId = lab.id.toLowerCase();
  const labBadge = lab.badge.toLowerCase();

  if (labId.includes('zero') || labBadge.includes('zero')) {
    labSpecificAdvice = {
      scenario: 'In Zero-shot, you test whether the model can execute the task without few-shot examples.',
      data: lab.sampleInputContext
        ? 'Inspect the lesson control data to verify facts the AI is permitted to use.'
        : 'No fixed control data for this lesson; tutorial displays labeled illustrative data.',
      prompt: 'Draft an initial prompt to establish a baseline before applying structural rules.',
      run: 'Click Run Prompt to inspect how the model responds autonomously.',
      output: `Compare output against expected format: ${lab.expectedOutputFormat}.`,
      coach: 'Ask AI Coach for recommendations on clarifying role, task, and output format.',
      compare: 'Observe how adding an expert role reduces conversational fluff.',
      library: 'Save your proven zero-shot prompt for future operational reuse.',
    };
  } else if (labId.includes('structured') || labBadge.includes('structured')) {
    labSpecificAdvice = {
      scenario: 'Structured Prompting requires explicit separation: Role, Context, Task, Format.',
      data: 'Rely strictly on provided case data as the ground truth.',
      prompt: 'Apply the 4-element framework to keep model responses tightly aligned.',
      run: 'Submit the structured prompt and observe response quality gains.',
      output: 'Verify whether the AI produced the requested Markdown table.',
      coach: 'AI Coach will point out if safety guardrails or constraints are missing.',
      compare: 'Compare how separating structural elements dramatically improves clarity.',
      library: 'Save your verified prompt as an operational SOP.',
    };
  } else if (labId.includes('one-shot') || labBadge.includes('one')) {
    labSpecificAdvice = {
      scenario: 'One-shot prompting demonstrates the exact desired output through a single sample.',
      data: 'Examine the reference sample and scenario data.',
      prompt: 'Provide 1 exemplar Input -> Output pair to anchor format.',
      run: 'Run the prompt to verify whether the AI mirrors the demonstration style.',
      output: 'Assess consistency between AI response and the provided exemplar.',
      coach: 'Consult AI Coach to verify if your demonstration is clear and unambiguous.',
      compare: 'Compare Zero-shot (no sample) vs One-shot (with exemplar).',
      library: 'Save the prompt with demonstration for matching workflows.',
    };
  } else if (labId.includes('few-shot') || labBadge.includes('few')) {
    labSpecificAdvice = {
      scenario: 'Few-shot prompting provides 2-3 diverse examples for complex edge cases.',
      data: 'Review the case portfolio requiring multi-class risk categorization.',
      prompt: 'Include 2-3 demonstrations (low risk, moderate risk, high risk) in the prompt.',
      run: 'Run prompt to evaluate multi-case reasoning capabilities.',
      output: 'Verify whether complex boundary cases were accurately classified.',
      coach: 'Ask AI Coach how to select representative edge-case demonstrations.',
      compare: 'Observe how additional examples reduce classification errors.',
      library: 'Save the tested Few-shot prompt into the SOP Library.',
    };
  } else if (labId.includes('ground') || labBadge.includes('ground')) {
    labSpecificAdvice = {
      scenario: 'Grounding instructs the model to rely strictly on provided documentation.',
      data: 'Review the attached source reference document before drafting.',
      prompt: 'Add strict constraint: "Rely only on provided context; do not extrapolate."',
      run: 'Run prompt to test factual adherence.',
      output: 'Cross-check output metrics against source data to verify zero hallucinations.',
      coach: 'Ask AI Coach for anti-hallucination constraint techniques.',
      compare: 'Compare ungrounded baseline (hallucinated numbers) vs grounded prompt (100% accurate).',
      library: 'Save your grounded prompt template.',
    };
  }

  labSpecificAdvice.scenario = `Current lesson objective: ${lab.taskGoal}`;
  labSpecificAdvice.data = lab.sampleInputContext
    ? 'Displaying control data for the current lesson, held constant across attempts.'
    : 'No control data for this lesson; tutorial displays labeled illustrative data.';
  labSpecificAdvice.output = `Verify output according to requirements: ${lab.expectedOutputFormat}`;
  labSpecificAdvice.library = `Save prompt once it successfully solves "${lab.title}".`;

  const isHybrid = mode === 'hybrid';

  const steps: TutorialStep[] = [
    // STEP 1
    {
      id: 'step-scenario',
      stepNumber: 1,
      totalSteps: 8,
      title: '1. Review Business Scenario',
      targetId: 'tour-scenario',
      description: isHybrid
        ? 'Start on the Left Column: Review the real-world scenario and objective to understand the core deliverable.'
        : 'First, review the scenario and business objective to understand what deliverable is required.',
      labAdvice: labSpecificAdvice.scenario,
    },

    // STEP 2
    {
      id: 'step-data',
      stepNumber: 2,
      totalSteps: 8,
      title: '2. Inspect Control Data',
      targetId: 'tour-data-trigger',
      description: 'Click "View Data" to examine fixed reference data (underwriting files, customer communications). This data stays constant across attempts for controlled testing.',
      labAdvice: labSpecificAdvice.data,
      fallbackNote: 'Located directly under the scenario. Click "Copy Data" to paste into prompt.',
      demoAction: 'show-data',
    },

    // STEP 3
    {
      id: 'step-prompt',
      stepNumber: 3,
      totalSteps: 8,
      title: '3. Draft Prompt in Composer',
      targetId: 'tour-prompt',
      description: isHybrid
        ? 'Move to the Right Column: This is your prompt workspace. Clarify role, requirements, and target format to guide the model accurately.'
        : 'This is where you instruct the AI model. Start with your initial prompt draft. Click "View Reference" if you need inspiration.',
      labAdvice: labSpecificAdvice.prompt,
      demoAction: 'show-prompt',
    },

    // STEP 4
    {
      id: 'step-run',
      stepNumber: 4,
      totalSteps: 8,
      title: '4. Execute Prompt',
      targetId: 'tour-run',
      description: 'Click "Run Prompt" (or press Ctrl + Enter) to submit your prompt to the AI model and trigger automated rubric evaluation.',
      labAdvice: labSpecificAdvice.run,
      demoAction: 'show-run',
    },

    // STEP 5
    {
      id: 'step-output',
      stepNumber: 5,
      totalSteps: 8,
      title: '5. Inspect Response & Scorecard',
      targetId: 'tour-output',
      description: 'Review the generated response in the output pane. Check the 5-factor rubric scorecard (Task, Groundedness, Format, Constraints, Usability) and diagnostic feedback.',
      labAdvice: labSpecificAdvice.output,
      fallbackNote: 'Output area appears immediately after your initial run.',
      demoAction: 'show-output',
    },

    // STEP 6
    {
      id: 'step-coach',
      stepNumber: 6,
      totalSteps: 8,
      title: '6. Iterate with AI Coach',
      targetId: 'tour-coach-panel',
      description: 'Refine your prompt by adding Role, Context, or formatting constraints. Click AI Coach in the bottom-right for pedagogical hints.',
      labAdvice: labSpecificAdvice.coach,
      demoAction: 'show-coach',
    },

    // STEP 7
    {
      id: 'step-compare',
      stepNumber: 7,
      totalSteps: 8,
      title: '7. Compare Progress (Compare Mode)',
      targetId: 'tour-compare-demo',
      description: 'After running at least 2 attempts, "Compare Attempts" unlocks. Open the side-by-side view to observe prompt diffs and metric gains.',
      labAdvice: labSpecificAdvice.compare,
      fallbackNote: 'Compare button appears under the output pane after your 2nd run.',
      demoAction: 'show-compare',
    },

    // STEP 8
    {
      id: 'step-library',
      stepNumber: 8,
      totalSteps: 8,
      title: '8. Save Prompt to Library (SOP)',
      targetId: 'tour-library-demo',
      description: 'Once you achieve high rubric marks, click "Save to Library" to preserve your proven prompt as an enterprise SOP for team collaboration.',
      labAdvice: labSpecificAdvice.library,
      fallbackNote: 'The Prompt Library is accessible anytime from the top navigation bar.',
      demoAction: 'show-library',
    },
  ];

  return steps;
}
