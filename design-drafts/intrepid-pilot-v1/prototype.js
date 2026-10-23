/* ==============================================================================
   PROMPTIFY INTREPID PILOT — PROTOYPE CONTROLLER (ZERO RUNTIME DEPENDENCY)
   Full mock state engine for:
   1. Learner (Nguyen Hai Dang - Commercial Ops, SG)
   2. Trainer (Vo Tu Duc - Lead Trainer)
   3. Head / PIC (Sarah Tan - Head of Commercial, SG)
   ============================================================================== */

const PROTOTYPE_STATE = {
  role: 'learner',       // 'learner' | 'trainer' | 'head'
  mode: 'workspace',     // 'onboarding' | 'workspace'
  version: 'v1',         // 'v1' (AI Studio Workbench) | 'v2' (Guided Executive)
  lang: 'en',            // 'en' | 'vi'
  activeAttempt: 2,      // 1 or 2
  isAiRunning: false,
  isSyncing: false,
  
  // Data models
  learner: {
    fullName: 'Nguyen Hai Dang',
    email: 'dang.nguyen@intrepid.asia',
    department: 'Commercial Operations',
    country: 'Singapore',
    assignedCourse: 'Applied AI for Commercial Operations',
    assignedCohort: 'Q4 Enablement Cohort #02',
    profileConfirmed: true
  },
  
  attempts: [
    {
      id: 1,
      title: 'Attempt 1 (Baseline Run)',
      prompt: `Please summarize the campaign performance from the provided Lazada sales numbers and tell me if CAC is too high.`,
      score: 7.2,
      rubric: {
        clarity: 7,
        context: 6,
        constraints: 7,
        format: 8
      },
      feedback: "Good starting point. However, the prompt does not cite SOP-MKT-042 CAC thresholds (>25% WoW increase) and lacks role specification. The AI gave a generic summary instead of a targeted commercial report.",
      output: `### Campaign Performance Summary
The campaign generated 1,450 orders with a total ad spend of SGD 28,400.
Overall CAC stands at SGD 19.58, which is moderately high compared to previous quarters.
ROAS is currently at 3.4x.

Recommendations:
- Check Campaign B which seems to have higher costs.
- Consider pausing underperforming ad sets.`
    },
    {
      id: 2,
      title: 'Attempt 2 (SOP-Grounded Run)',
      prompt: `Role: Senior Commercial & Media Analyst at Intrepid.
Context: Apply guidelines from SOP-MKT-042 (CAC anomaly flag threshold: >25% WoW increase).
Task: Analyze the attached Q4 Lazada Mega-Campaign metrics.
Constraints:
1. Identify any campaigns where CAC exceeded target by >25% WoW.
2. Format output with: (A) 3-bullet Executive Summary, (B) Structured Markdown Table with Campaign, Spend, ROAS, CAC, Anomaly Flag, (C) 3 Immediate Action Items for the Brand Manager.`,
      score: 8.8,
      rubric: {
        clarity: 9,
        context: 9,
        constraints: 8,
        format: 9
      },
      feedback: "Strong grounding in SOP-MKT-042. Role and business constraints were strictly applied. The output table clearly flags Campaign B as anomalous (+32.4% CAC) with actionable next steps.",
      output: `### Executive Summary
• Total ad investment reached SGD 28,400 across 4 active campaign clusters, delivering 1,450 conversions (SGD 19.58 blended CAC).
• Anomaly Triggered per SOP-MKT-042: **Campaign B (Electronics Super Day)** experienced a +32.4% CAC spike (SGD 26.50 vs target SGD 20.00), breaching the 25% threshold.
• Campaigns A, C, and D operated within healthy ROAS benchmarks (3.8x - 4.5x).

### Performance Breakdown Table
| Campaign Name | Ad Spend (SGD) | ROAS | CAC (SGD) | WoW Shift | SOP-MKT-042 Status |
|:---|:---|:---|:---|:---|:---|
| Campaign A (Beauty Mega) | $8,500 | 4.2x | $16.20 | +4.1% | ✅ Normal |
| Campaign B (Tech Super Day) | $12,400 | 2.6x | $26.50 | +32.4% | 🚨 CAC Anomaly |
| Campaign C (Home & Living) | $4,300 | 3.9x | $17.80 | -2.3% | ✅ Normal |
| Campaign D (Flash Voucher) | $3,200 | 4.5x | $14.10 | -6.5% | ✅ High Efficiency |

### Immediate Action Items
1. **Reallocate Budget**: Reallocate 30% of remaining daily budget from Campaign B into Campaign D.
2. **Creative Fatigue Audit**: Request brand creative refresh from the creative team for Campaign B ad sets.
3. **Escalate to Head of Commercial**: File standard anomaly report form in Intrepid Box per section 4.1 of SOP-MKT-042.`
    }
  ],

  // Translations
  i18n: {
    en: {
      learner: "Learner",
      trainer: "Trainer (Duc Vo)",
      head: "Head / PIC (Commercial)",
      onboarding: "Onboarding Flow",
      workspace: "Working Screen",
      runAi: "Run Live AI",
      runningAi: "Executing via Intrepid GCP...",
      compare: "Compare Attempts",
      score: "Score",
      completedRun: "Completed Run",
      mastery: "Mastery Verified",
      syncNow: "Sync Roster Now",
      syncing: "Syncing Google Sheet...",
      toastSyncSuccess: "Google Sheet roster synchronized: 25 valid learners updated, 2 flagged for review.",
      toastSopSuccess: "SOP update & sample dataset submitted to Trainer Duc Vo successfully.",
      toastProfileSuccess: "Profile confirmed! Welcome to the Commercial Operations Learning Zone."
    },
    vi: {
      learner: "Học viên",
      trainer: "Giảng viên (Võ Tự Đức)",
      head: "Trưởng phòng (Commercial)",
      onboarding: "Luồng Onboarding",
      workspace: "Màn hình Làm việc",
      runAi: "Chạy Live AI",
      runningAi: "Đang gọi AI Intrepid qua GCP...",
      compare: "So sánh các lần chạy",
      score: "Điểm",
      completedRun: "Đã hoàn thành lượt chạy",
      mastery: "Đạt chuẩn thành thạo",
      syncNow: "Đồng bộ Roster ngay",
      syncing: "Đang đọc Google Sheet...",
      toastSyncSuccess: "Đã đồng bộ Google Sheet: 25 học viên hợp lệ, 2 dòng cảnh báo lỗi.",
      toastSopSuccess: "Đã gửi tài liệu SOP và dữ liệu mẫu thực tế tới Giảng viên Võ Tự Đức.",
      toastProfileSuccess: "Đã xác nhận hồ sơ! Chào mừng bạn đến Zone Commercial Operations."
    }
  }
};

// Main Controller Functions
function setRole(newRole) {
  PROTOTYPE_STATE.role = newRole;
  updateControllerUI();
  renderActiveView();
}

function setMode(newMode) {
  PROTOTYPE_STATE.mode = newMode;
  updateControllerUI();
  renderActiveView();
}

function setVersion(newVersion) {
  PROTOTYPE_STATE.version = newVersion;
  updateControllerUI();
  renderActiveView();
}

function setLang(newLang) {
  PROTOTYPE_STATE.lang = newLang;
  updateControllerUI();
  renderActiveView();
  showToast(`Language switched to ${newLang.toUpperCase()}`);
}

function updateControllerUI() {
  // Update Role buttons
  document.querySelectorAll('[data-role]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-role') === PROTOTYPE_STATE.role);
  });
  
  // Update Mode buttons
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === PROTOTYPE_STATE.mode);
  });
  
  // Update Version buttons
  document.querySelectorAll('[data-version]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-version') === PROTOTYPE_STATE.version);
  });
  
  // Update Lang buttons
  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === PROTOTYPE_STATE.lang);
  });
}

function renderActiveView() {
  const { role, mode, version } = PROTOTYPE_STATE;
  
  // Hide all views first
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));

  // 1. Onboarding Mode
  if (mode === 'onboarding') {
    const obId = `view-onboarding-${role}`;
    const target = document.getElementById(obId);
    if (target) target.classList.add('active');
    return;
  }

  // 2. Direct Workspace Mode
  if (role === 'learner') {
    const wsId = version === 'v1' ? 'view-learner-v1' : 'view-learner-v2';
    const target = document.getElementById(wsId);
    if (target) target.classList.add('active');
  } else if (role === 'trainer') {
    const target = document.getElementById('view-trainer');
    if (target) target.classList.add('active');
  } else if (role === 'head') {
    const target = document.getElementById('view-head');
    if (target) target.classList.add('active');
  }
}

// Learner Actions
function switchAttempt(attemptNum) {
  PROTOTYPE_STATE.activeAttempt = attemptNum;
  const attempt = PROTOTYPE_STATE.attempts.find(a => a.id === attemptNum);
  if (!attempt) return;

  // Update prompt textarea in both V1 and V2
  document.querySelectorAll('.prompt-textarea').forEach(el => {
    el.value = attempt.prompt;
  });

  // Update output body
  document.querySelectorAll('.ai-output-content').forEach(el => {
    el.innerHTML = formatMarkdown(attempt.output);
  });

  // Update score
  document.querySelectorAll('.score-big-val').forEach(el => {
    el.textContent = `${attempt.score} / 10`;
  });

  // Update feedback note
  document.querySelectorAll('.judge-feedback-note').forEach(el => {
    el.textContent = attempt.feedback;
  });

  // Update active pill button
  document.querySelectorAll('.attempt-switch-btn').forEach(btn => {
    const btnNum = parseInt(btn.getAttribute('data-attempt'), 10);
    btn.classList.toggle('active', btnNum === attemptNum);
  });
}

function runAiSimulation() {
  if (PROTOTYPE_STATE.isAiRunning) return;
  PROTOTYPE_STATE.isAiRunning = true;

  const btn = document.getElementById('btn-run-ai-action');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${PROTOTYPE_STATE.i18n[PROTOTYPE_STATE.lang].runningAi}`;
  }

  showToast("Dispatching prompt to Intrepid GCP Service Account (Vertex / Gemini 1.5 Pro)...");

  setTimeout(() => {
    PROTOTYPE_STATE.isAiRunning = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
    // Switch to attempt 2 to show perfected result
    switchAttempt(2);
    showToast("Response & AI Judge evaluation completed! Score: 8.8 / 10");
  }, 1600);
}

function openCompareModal() {
  const modal = document.getElementById('compare-attempts-modal');
  if (modal) {
    modal.classList.add('active');
  }
}

function closeCompareModal() {
  const modal = document.getElementById('compare-attempts-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Trainer Actions (Roster Sync)
function triggerRosterSync() {
  if (PROTOTYPE_STATE.isSyncing) return;
  PROTOTYPE_STATE.isSyncing = true;

  const btn = document.getElementById('btn-sync-roster');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Syncing...`;
  }

  showToast("Connecting to Google Sheets API (Tab: Pilot_Learners_Oct26)...");

  setTimeout(() => {
    PROTOTYPE_STATE.isSyncing = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `✓ Sync Complete`;
    }
    const syncTime = document.getElementById('last-sync-time');
    if (syncTime) {
      syncTime.textContent = 'Just now (Batch #20261006-03)';
    }
    showToast(PROTOTYPE_STATE.i18n[PROTOTYPE_STATE.lang].toastSyncSuccess);
  }, 1400);
}

// Head of Department Actions (SOP Feedback)
function submitSopFeedback(e) {
  if (e) e.preventDefault();
  const form = document.getElementById('sop-feedback-form');
  if (form) form.reset();
  showToast(PROTOTYPE_STATE.i18n[PROTOTYPE_STATE.lang].toastSopSuccess);
}

// Learner Onboarding Actions
function confirmLearnerProfile() {
  showToast(PROTOTYPE_STATE.i18n[PROTOTYPE_STATE.lang].toastProfileSuccess);
  setTimeout(() => {
    setMode('workspace');
    setRole('learner');
  }, 800);
}

function reportRosterDiscrepancy() {
  const modal = document.getElementById('roster-report-modal');
  if (modal) modal.classList.add('active');
}

function closeRosterReportModal() {
  const modal = document.getElementById('roster-report-modal');
  if (modal) modal.classList.remove('active');
}

function submitRosterDiscrepancyReport(e) {
  if (e) e.preventDefault();
  closeRosterReportModal();
  showToast("Correction request logged. Trainer Duc Vo has been notified.");
}

// Toast Notification
function showToast(message) {
  let toast = document.getElementById('prototype-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'prototype-toast';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>${message}</span>`;
  toast.classList.add('active');

  setTimeout(() => {
    toast.classList.remove('active');
  }, 3500);
}

// Enhanced Markdown Formatter with Table Support
function formatMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let html = '';
  let inTable = false;
  let tableHeaderParsed = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Table line
    if (line.startsWith('|') && line.endsWith('|')) {
      if (line.includes('---')) {
        // Separator row
        continue;
      }
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (!inTable) {
        inTable = true;
        tableHeaderParsed = true;
        html += '<table class="roster-preview-table" style="margin: 10px 0; font-size: 12px;"><thead><tr>';
        cells.forEach(c => { html += `<th>${c}</th>`; });
        html += '</tr></thead><tbody>';
      } else {
        html += '<tr>';
        cells.forEach(c => { html += `<td>${c}</td>`; });
        html += '</tr>';
      }
      continue;
    } else if (inTable) {
      inTable = false;
      html += '</tbody></table>';
    }
    
    // Headings
    if (line.startsWith('### ')) {
      html += `<h3 style="font-size: 14px; font-weight: 700; margin: 14px 0 6px 0; color: #0f172a;">${line.substring(4)}</h3>`;
    } else if (line.startsWith('## ')) {
      html += `<h2 style="font-size: 16px; font-weight: 700; margin: 16px 0 8px 0; color: #0f172a;">${line.substring(3)}</h2>`;
    } else if (line.startsWith('• ') || line.startsWith('- ')) {
      html += `<li style="margin-left: 18px; margin-bottom: 4px; font-size: 13px;">${line.substring(2)}</li>`;
    } else if (/^\d+\.\s/.test(line)) {
      html += `<li style="margin-left: 18px; margin-bottom: 4px; font-size: 13px;">${line.replace(/^\d+\.\s/, '')}</li>`;
    } else if (line.length > 0) {
      html += `<p style="margin-bottom: 8px; font-size: 13px;">${line}</p>`;
    }
  }
  
  if (inTable) {
    html += '</tbody></table>';
  }
  
  // Format bold tags
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return html;
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  // Check URL params for direct linking
  const urlParams = new URLSearchParams(window.location.search);
  const paramRole = urlParams.get('role');
  const paramMode = urlParams.get('mode');
  const paramVersion = urlParams.get('version');
  const paramLang = urlParams.get('lang');

  if (paramRole && ['learner', 'trainer', 'head'].includes(paramRole)) {
    PROTOTYPE_STATE.role = paramRole;
  }
  if (paramMode && ['onboarding', 'workspace'].includes(paramMode)) {
    PROTOTYPE_STATE.mode = paramMode;
  }
  if (paramVersion && ['v1', 'v2'].includes(paramVersion)) {
    PROTOTYPE_STATE.version = paramVersion;
  }
  if (paramLang && ['en', 'vi'].includes(paramLang)) {
    PROTOTYPE_STATE.lang = paramLang;
  }

  updateControllerUI();
  renderActiveView();
  switchAttempt(2); // Start with Attempt 2 loaded
});
