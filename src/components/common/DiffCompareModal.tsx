import React from 'react';
import { LabStep, PromptVersion } from '../../types';
import { ABCompareModal } from './ABCompareModal';
import { detectPromptComponents, evaluateBusinessMetrics } from '../../services/businessEvaluationService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lab: LabStep;
  currentOutput?: string;
  versions?: PromptVersion[];
}

/**
 * Forwarding wrapper to ABCompareModal to ensure system-wide consistency
 */
export const DiffCompareModal: React.FC<Props> = ({ isOpen, onClose, lab, versions }) => {
  const defaultVersions: PromptVersion[] = versions && versions.length > 0 ? versions : [
    {
      id: `v-base-${lab.id}`,
      versionNumber: 1,
      labId: lab.id,
      promptText: lab.baselinePrompt,
      output: lab.simulatedBaselineOutput,
      techniqueUsed: 'Initial draft prompt',
      detectedChanges: detectPromptComponents(lab.baselinePrompt),
      timestamp: 'Attempt 1',
      businessEvaluation: evaluateBusinessMetrics(lab.baselinePrompt, lab.simulatedBaselineOutput, lab.sampleInputContext),
    },
    {
      id: `v-impr-${lab.id}`,
      versionNumber: 2,
      labId: lab.id,
      promptText: lab.improvedPrompt,
      output: lab.simulatedImprovedOutput,
      techniqueUsed: 'Standardized prompt',
      detectedChanges: detectPromptComponents(lab.improvedPrompt),
      timestamp: 'Attempt 2',
      businessEvaluation: evaluateBusinessMetrics(lab.improvedPrompt, lab.simulatedImprovedOutput, lab.sampleInputContext),
    }
  ];

  return (
    <ABCompareModal
      isOpen={isOpen}
      onClose={onClose}
      lab={lab}
      versions={defaultVersions}
    />
  );
};
