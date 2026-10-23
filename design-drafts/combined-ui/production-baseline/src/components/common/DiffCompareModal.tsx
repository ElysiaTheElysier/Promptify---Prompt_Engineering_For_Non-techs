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
 * Wrapper chuyển tiếp về ABCompareModal để đảm bảo tính đồng nhất trên toàn hệ thống
 */
export const DiffCompareModal: React.FC<Props> = ({ isOpen, onClose, lab, versions }) => {
  const defaultVersions: PromptVersion[] = versions && versions.length > 0 ? versions : [
    {
      id: `v-base-${lab.id}`,
      versionNumber: 1,
      labId: lab.id,
      promptText: lab.baselinePrompt,
      output: lab.simulatedBaselineOutput,
      techniqueUsed: 'Prompt thô ban đầu',
      detectedChanges: detectPromptComponents(lab.baselinePrompt),
      timestamp: 'Lần thử 1',
      businessEvaluation: evaluateBusinessMetrics(lab.baselinePrompt, lab.simulatedBaselineOutput, lab.sampleInputContext),
    },
    {
      id: `v-impr-${lab.id}`,
      versionNumber: 2,
      labId: lab.id,
      promptText: lab.improvedPrompt,
      output: lab.simulatedImprovedOutput,
      techniqueUsed: 'Prompt chuẩn hóa',
      detectedChanges: detectPromptComponents(lab.improvedPrompt),
      timestamp: 'Lần thử 2',
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
