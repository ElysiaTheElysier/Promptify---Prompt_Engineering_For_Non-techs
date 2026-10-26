# Promptify UI review — 24 October 2026

Evidence: **CODE + OFFLINE**. No cloud requests, deployments, commits or pushes are authorized for this review. The existing dirty tree was inspected and is the baseline; earlier contributors' changes are preserved.

## Before implementation

Read AGENTS.md, CLAUDE.md, documentation index/current state/open issues/latest handoff, the shared tracker (including UI Waves C, Hosting A/B/C, refactor rounds 1 and 2), and UI_UX_REVIEW_2026-10-23.md.

Captured all 13 original preview routes at 1440×1000 and 375×812, with English and Vietnamese toggle attempts (52 screenshots under ignored `tmp/ui-review-2026-10-24/before`). Important baseline defect: modal routes can keep their English content when the language toggle behind the modal is used. These images are evidence of the defect, **not** a clean bilingual result. The preview itself also contains hard-coded Vietnamese navigation. Add an explicit preview language selector via URL and verify rendered language before accepting subsequent captures.

| Screen | Critique and primary job |
| --- | --- |
| Learner workspace | Writing is buried under auto-save explanation, system instructions, framework buttons and seven chips. The toolbar repeats title/context and wraps. History competes below Run. Lead with the editor and Run; put learning aids in a disclosure and history with results. Preserve desktop three columns and mobile panel tabs. |
| Learner hub | Welcome, resume, accreditation and filtering all have similar weight. Lab status is buried in its footer; empty scores look like broken data. Lead with the next available lab, retain filters and badges as secondary information, make each lab's next action explicit. Fixture times currently render Invalid Date. |
| Workshop | Hint queue precedes the page heading; KPI cards and a large banner delay the learner table, especially on mobile. Phase labels conflict with numbered content. One page header with phase navigation, live learner support first, secondary metrics collapsed. |
| SOP / learner SOP | Opens a modal immediately over a nearly empty “ingestion engine” page. Language such as RLS and RAG describes implementation rather than the user's job. Lead with submissions and status; retain upload/Drive/review actions in a deliberate dialog. |
| Studio | Four equal KPI cards precede the actual lab directory. Lifecycle pills, nested surfaces and tiny labels make editing hard to scan. Lead with find/create/edit a lab; make summary counts quiet and retain the existing editor tabs and unsaved-change guard. |
| Governance | Vault/gateway banner and four KPI cards dominate access tasks. Fake masked-key styling suggests secrets users cannot actually manage here. Lead with cohort/domain access, keep credential configuration and audit available as secondary tabs/disclosures; preserve every permission check and action. |
| Roster | Workbook setup and support requests appear before the roster heading. A second large technical banner and four cards repeat status. Lead with connected sources and synchronization; put setup guidance and support in labeled secondary sections. |
| Analytics | Oversized dark banner and four no-data KPI cards show “—%”, “—h”, and repeated unknowns. Lead with learning progress; state missing-data requirements in the panel, subordinate productivity estimates and preserve export/filters. |
| Compare | Toolbar is cramped, uppercase source labels persist and metadata overwhelms actual comparison. Keep two readable versions, clear restore action and responsive stacked comparison. |
| Judge | Drawer works but heading/copy is technical, typography inconsistent and visible criteria must remain readable. Use the shared palette, restrained score treatment, plain guidance and accessible close/revise controls. |
| Learner inspector | Nested profile, stat and output cards obscure coaching. Lead with the learner's selected attempt and feedback; demote absent metrics and retain private hint/expiry controls. |
| Feedback | Preview copy is Vietnamese in English mode; it demonstrates neither the actual ProductDialog nor focus return adequately. Make the fixture bilingual and exercise real dialog/toast states. |
| Landing / entry / ProductDialog | Not included in the original preview routes. Add offline fixtures before visual acceptance; align their surfaces, typography, focus and mobile forms with the signed-in product. |

## Design decision

Use the open-source [Anthropic frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md), read from its official source. No executable package installation or runtime dependency is required. Apply its task-first hierarchy, restrained typography, deliberate spacing, plain copy and action-driven motion within the owner's explicit palette.

Be Vietnam Pro throughout. Pine #103b30 for the shell and limited emphasis; emerald #047857 for primary actions; mint #e1f4eb for selection; paper #f3f6f4; line #d6e1dc; ink #15231e. Flat sections and separators instead of nested cards. Native disclosures retain secondary controls. Short opacity/transform feedback, reduced-motion alternative, visible keyboard focus and 44px mobile controls. Replace utility-selector overrides with semantic markup classes. No scoring, permissions, data ownership, models or quota changes.

## Validation log

Implementation and final checks will be appended below. Baseline screenshots alone do not establish functional or LIVE acceptance.
