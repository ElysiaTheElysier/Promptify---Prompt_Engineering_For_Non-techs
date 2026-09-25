import React from 'react';
import { ArrowRight, Check, Navigation, X } from 'lucide-react';
import './LandingKeyVisuals.css';

type LandingLocale = 'en' | 'vi';

const visualCopy = {
  en: {
    compareTitle: 'One task. Two outcomes.',
    compareLabel: 'A vague prompt compared with a structured prompt',
    vague: 'Vague prompt',
    structured: 'Structured prompt',
    output: 'AI output',
    vagueLines: ['Write an email', 'about the meeting.'],
    vagueOutput: 'Hi team, I wanted to let you know about our upcoming meeting. Please attend if you can.',
    vagueNote: 'No time, audience, or action to take',
    structuredLines: [
      'Email the project team',
      'Friday 9:00, Room A3',
      'Confirm by Thu 17:00',
      'Under 80 words',
    ],
    structuredSubject: 'Subject: Confirm Friday’s meeting',
    structuredOutput: 'Hi team, please confirm your attendance at Friday’s 9:00 meeting in Room A3 by 17:00 Thursday.',
    structuredNote: 'Specific. Actionable. Ready to send.',
    directionTitle: 'The prompt chooses the route.',
    directionIntro: 'The goal stays the same. The instructions determine whether AI wanders or delivers a decision-ready result.',
    directionLabel: 'For the same project goal, an open-ended request leads to generic ideas while a grounded prompt leads to prioritized actions',
    goalLabel: 'Same goal',
    goal: 'Prioritize project work',
    wrongLabel: 'Vague direction',
    wrongPrompt: '“What should we do?”',
    wrongStep: 'No role, context, or constraints',
    wrongResult: 'Generic ideas',
    wrongOutcome: 'More rewriting before anyone can act',
    wrongCosts: ['Time wasted', 'Memory clutter', 'Digital clutter'],
    rightLabel: 'Clear direction',
    rightPrompt: 'Role + task + constraints',
    rightStep: 'Act as project lead. Use the status and deadlines to rank 3 next steps.',
    rightResult: 'Priorities ready to assign',
    rightOutcome: 'Each action has an owner, due date, and reason',
  },
  vi: {
    compareTitle: 'Cùng một việc. Hai kết quả.',
    compareLabel: 'So sánh prompt mơ hồ và prompt có cấu trúc',
    vague: 'Prompt mơ hồ',
    structured: 'Prompt có cấu trúc',
    output: 'Kết quả AI',
    vagueLines: ['Viết email', 'về buổi họp.'],
    vagueOutput: 'Chào mọi người, sắp tới sẽ có một buổi họp. Mong mọi người tham gia nếu có thể.',
    vagueNote: 'Thiếu thời gian, người nhận và việc cần làm',
    structuredLines: [
      'Gửi email cho nhóm dự án',
      'Họp 9:00 thứ Sáu, phòng A3',
      'Xác nhận trước 17:00 thứ Năm',
      'Tối đa 80 từ',
    ],
    structuredSubject: 'Chủ đề: Xác nhận họp thứ Sáu',
    structuredOutput: 'Chào nhóm, vui lòng xác nhận tham dự buổi họp lúc 9:00 thứ Sáu tại phòng A3 trước 17:00 thứ Năm.',
    structuredNote: 'Rõ việc. Rõ hạn. Dùng được ngay.',
    directionTitle: 'Prompt quyết định hướng đi.',
    directionIntro: 'Mục tiêu không đổi. Cách giao việc quyết định AI đi lòng vòng hay đưa ra kết quả có thể hành động.',
    directionLabel: 'Với cùng mục tiêu dự án, yêu cầu mơ hồ dẫn đến ý tưởng chung chung còn prompt có dữ kiện dẫn đến hành động ưu tiên',
    goalLabel: 'Cùng mục tiêu',
    goal: 'Ưu tiên công việc dự án',
    wrongLabel: 'Hướng đi mơ hồ',
    wrongPrompt: '“Giờ nên làm gì?”',
    wrongStep: 'Thiếu vai trò, bối cảnh và ràng buộc',
    wrongResult: 'Gợi ý chung chung',
    wrongOutcome: 'Phải sửa thêm mới giao việc được',
    wrongCosts: ['Tốn thời gian', 'Rác bộ nhớ', 'Rác dữ liệu số'],
    rightLabel: 'Hướng đi rõ ràng',
    rightPrompt: 'Vai trò + nhiệm vụ + ràng buộc',
    rightStep: 'Đóng vai quản lý dự án. Dựa vào tiến độ và hạn chót, chọn 3 việc ưu tiên.',
    rightResult: 'Việc ưu tiên có thể giao ngay',
    rightOutcome: 'Mỗi việc có người phụ trách, hạn chót và lý do',
  },
} as const;

export const PromptCompareVisual: React.FC<{ locale?: LandingLocale }> = ({ locale = 'en' }) => {
  const copy = visualCopy[locale];

  return (
    <div className="kv-compare" role="group" aria-label={copy.compareLabel}>
      <h2 className="kv-compare-title">{copy.compareTitle}</h2>
      <div className="kv-compare-grid">
        <div className="kv-compare-panel kv-compare-before">
          <div className="kv-panel-label"><X aria-hidden="true" size={15} /> {copy.vague}</div>
          <div className="kv-prompt kv-vague-prompt">
            {copy.vagueLines.map((line, index) => (
              <span className={`kv-typed-line kv-vague-line-${index + 1}`} key={line}>{line}</span>
            ))}
          </div>
          <div className="kv-output kv-weak-output">
            <span className="kv-output-label">{copy.output}</span>
            <p>{copy.vagueOutput}</p>
            <span className="kv-output-note">{copy.vagueNote}</span>
          </div>
        </div>

        <span className="kv-compare-arrow" aria-hidden="true"><ArrowRight size={18} /></span>

        <div className="kv-compare-panel kv-compare-after">
          <div className="kv-panel-label"><Check aria-hidden="true" size={15} /> {copy.structured}</div>
          <div className="kv-prompt kv-structured-prompt">
            {copy.structuredLines.map((line, index) => (
              <span className={`kv-typed-line kv-structured-line-${index + 1}`} key={line}>{line}</span>
            ))}
          </div>
          <div className="kv-output kv-improved-output">
            <span className="kv-output-label">{copy.output}</span>
            <p><strong>{copy.structuredSubject}</strong></p>
            <p>{copy.structuredOutput}</p>
            <span className="kv-output-note">{copy.structuredNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export const PromptDirectionVisual: React.FC<{ locale?: LandingLocale }> = ({ locale = 'en' }) => {
  const copy = visualCopy[locale];

  return (
    <section className="kv-direction-section" aria-labelledby="kv-direction-title">
      <div className="kv-direction-wrap">
        <div className="kv-direction-intro">
          <h2 id="kv-direction-title">{copy.directionTitle}</h2>
          <p>{copy.directionIntro}</p>
        </div>

        <div className="kv-map" role="group" aria-label={copy.directionLabel}>
          <svg className="kv-map-lines" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
            <path className="kv-map-line-base kv-map-line-bad" d="M 190 200 C 260 200 250 100 330 100 H 360" />
            <path className="kv-map-line-base kv-map-line-good" d="M 190 200 C 260 200 250 300 330 300 H 360" />
            <path className="kv-map-line-progress kv-map-line-bad" pathLength="1" d="M 190 200 C 260 200 250 100 330 100 H 360" />
            <path className="kv-map-line-progress kv-map-line-good" pathLength="1" d="M 190 200 C 260 200 250 300 330 300 H 360" />
          </svg>

          <div className="kv-map-start">
            <span className="kv-map-start-icon"><Navigation aria-hidden="true" size={23} /></span>
            <span className="kv-map-eyebrow">{copy.goalLabel}</span>
            <strong>{copy.goal}</strong>
          </div>

          <div className="kv-map-lanes">
            <div className="kv-map-lane kv-map-lane-bad">
              <div className="kv-map-prompt">
                <span className="kv-map-lane-label"><X aria-hidden="true" size={14} />{copy.wrongLabel}</span>
                <strong>{copy.wrongPrompt}</strong>
                <small>{copy.wrongStep}</small>
              </div>
              <div className="kv-map-connector" aria-hidden="true">
                <span className="kv-map-connector-progress" />
                <span className="kv-map-connector-runner"><ArrowRight size={19} /></span>
              </div>
              <div className="kv-map-destination">
                <span className="kv-map-end-dot" aria-hidden="true" />
                <strong>{copy.wrongResult}</strong>
                <small>{copy.wrongOutcome}</small>
                <div className="kv-map-fallout">
                  {copy.wrongCosts.map((item) => <span key={item}>{item}</span>)}
                </div>
              </div>
            </div>

            <div className="kv-map-lane kv-map-lane-good">
              <div className="kv-map-prompt">
                <span className="kv-map-lane-label"><Check aria-hidden="true" size={14} />{copy.rightLabel}</span>
                <strong>{copy.rightPrompt}</strong>
                <small>{copy.rightStep}</small>
              </div>
              <div className="kv-map-connector" aria-hidden="true">
                <span className="kv-map-connector-progress" />
                <span className="kv-map-connector-runner"><ArrowRight size={19} /></span>
              </div>
              <div className="kv-map-destination">
                <span className="kv-map-end-dot" aria-hidden="true" />
                <strong>{copy.rightResult}</strong>
                <small>{copy.rightOutcome}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
