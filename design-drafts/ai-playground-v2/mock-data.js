// mock-data.js - Mock data for Promptify AI Playground v2 Prototype
const PROMPTIFY_MOCK = {
  activeCohort: {
    id: "cohort-en-review",
    code: "PROMPTIFY-EN-REVIEW",
    name: "Executive AI Prompting • Cohort 2026",
    organization: "Global Enterprise",
    expiryText: "Access expires at 18:00 today",
    totalLessons: 6,
    completedLessons: 1
  },
  lessons: [
    {
      id: "lesson-1",
      number: 1,
      title: "Professional Email Briefing",
      badge: "Tone & Diplomacy",
      status: "completed",
      score: 9.6
    },
    {
      id: "lesson-2",
      number: 2,
      title: "Q3 Executive Status Memo",
      badge: "Groundedness & Constraints",
      status: "active",
      score: 9.4
    },
    {
      id: "lesson-3",
      number: 3,
      title: "PII Redaction & Compliance",
      badge: "Data Privacy & Decree 13",
      status: "locked",
      score: null
    },
    {
      id: "lesson-4",
      number: 4,
      title: "Customer Dispute Resolution",
      badge: "De-escalation & Policy",
      status: "locked",
      score: null
    },
    {
      id: "lesson-5",
      number: 5,
      title: "Spreadsheet Data Extraction",
      badge: "Structured Output (JSON/Table)",
      status: "locked",
      score: null
    },
    {
      id: "lesson-6",
      number: 6,
      title: "Complex Policy Synthesis",
      badge: "Multi-Source Reasoning",
      status: "locked",
      score: null
    }
  ],
  currentLesson: {
    id: "lesson-2",
    number: 2,
    title: "Q3 Executive Status Memo",
    skill: "Grounded Business Communication",
    level: "Intermediate",
    taskContext: {
      summary: "Draft a 3-bullet executive briefing memo to the Executive VP regarding Project Orion status.",
      groundedData: `[INTERNAL MEMO - CONFIDENTIAL]
From: Tech Lead - Project Orion
To: Operations PMO
Date: Sept 24, 2026
Status Update: Backend API integration is delayed by 14 days due to mandatory SOC2 security compliance audits. As a result, end-to-end QA validation cannot begin until October 1st. Budget impact: $12,500 allocated for additional external security reviewers. Revised project launch date is now October 28th. Risk level is Moderate, no customer impact expected for Q3.`
    },
    theory: {
      title: "The CRISP Principle for Executive Briefings",
      points: [
        "Context: Establish your seniority and direct audience (VP level) in the very first sentence.",
        "Restraint: Never speculate or promise unconfirmed dates. Rely 100% on the grounded internal memo.",
        "Isolation: Force a strict bulleted format (maximum 3 bullets) so busy stakeholders can read in 10 seconds.",
        "Negative Constraints: Explicitly instruct 'Do not include conversational filler or technical jargon'."
      ]
    },
    hint: "Make sure to declare your role as Senior Operations Manager and instruct the model to state the exact $12,500 budget impact and revised Oct 28 launch date without guessing reasons.",
    solutionPrompt: `You are the Senior Operations Manager at Global Enterprise.
Context: You are providing a critical status memo directly to the Executive Vice President.
Source Truth: Use ONLY the provided internal memo details regarding Project Orion.
Task: Write a concise, diplomatic briefing update.
Constraints:
- Exactly 3 bullet points in markdown format.
- State the 14-day delay reason, budget adjustment ($12,500), and new launch target (Oct 28).
- Do not speculate or add technical jargon.
- Tone: Formal, objective, solutions-oriented.`,
    attempts: [
      {
        version: 1,
        label: "Attempt 1 (Initial Draft)",
        date: "10:14 AM",
        promptText: "Summarize the project orion memo for the VP.",
        output: `Subject: Project Orion Update

Hey there,

Here's what is going on with Project Orion:
It looks like the project is delayed because the developers are taking longer with the API and audits. We might need some more money, around ten thousand dollars or so, and it will probably finish sometime in late October. Let me know if you want to hop on a call to chat more about it!

Best,
The Team`,
        score: 5.4,
        metrics: {
          taskCompletion: 1.2,
          groundedness: 1.0,
          formatAdherence: 1.0,
          constraintCompliance: 1.0,
          businessUsability: 1.2
        },
        strengths: "Mentioned delay and general month timeframe.",
        improvements: "Too informal for VP; hallucinated 'developers taking longer'; approximated numbers instead of citing exact $12,500; failed to format as 3 bullets."
      },
      {
        version: 2,
        label: "Attempt 2 (Structural Tags Added)",
        date: "10:22 AM",
        promptText: `[Role: Operations Manager]
Write an executive memo to VP about Project Orion.
Use the memo provided. Include 3 bullets with delay, budget, and new date. No fluff.`,
        output: `MEMORANDUM
To: Executive Vice President
From: Operations Management
Date: September 25, 2026
Subject: Project Orion Status Summary

• Schedule: Backend integration delayed by 14 days due to SOC2 security compliance, pushing QA start to October 1st.
• Financial Impact: $12,500 approved for supplementary external security auditors.
• Target Delivery: Revised target launch date is October 28th with zero anticipated customer disruption.`,
        score: 8.4,
        metrics: {
          taskCompletion: 1.8,
          groundedness: 1.8,
          formatAdherence: 1.8,
          constraintCompliance: 1.5,
          businessUsability: 1.5
        },
        strengths: "Accurate figures, clean bulleted layout, correct facts.",
        improvements: "Tone is slightly bureaucratic; could be more proactive and diplomatic in framing the mitigation."
      },
      {
        version: 3,
        label: "Attempt 3 (Mastered & Calibrated)",
        date: "10:35 AM",
        promptText: `You are the Senior Operations Manager at Global Enterprise.
Audience: Executive Vice President.
Source Data: Rely strictly on the attached confidential memo for Project Orion.
Task: Compose an executive status briefing.
Constraints:
- Exactly 3 bullet points.
- Highlight the 14-day timeline adjustment for SOC2 compliance, the $12,500 budget impact, and the Oct 28 release.
- Maintain a proactive, diplomatic tone. Zero speculation.`,
        output: `MEMORANDUM

TO: Executive Vice President
FROM: Senior Operations Manager
DATE: September 25, 2026
SUBJECT: Executive Briefing: Project Orion Schedule & Resource Alignment

• Schedule Realignment: Backend integration is adjusted by 14 days to accommodate mandatory SOC2 security compliance audits, scheduling QA commencement for October 1.
• Resource Investment: An additional $12,500 has been allocated for specialized security verification to protect enterprise data integrity.
• Milestone Target: Revised launch is scheduled for October 28, 2026, with risk rated Moderate and zero customer operational disruption in Q3.`,
        score: 9.4,
        metrics: {
          taskCompletion: 2.0,
          groundedness: 2.0,
          formatAdherence: 2.0,
          constraintCompliance: 1.7,
          businessUsability: 1.7
        },
        strengths: "Flawless alignment with source data, boardroom-ready diplomatic tone, exact 3-bullet structure, zero hallucinations.",
        improvements: "Minor: Bullet 2 could be 3 words shorter for extreme executive brevity."
      }
    ]
  }
};
