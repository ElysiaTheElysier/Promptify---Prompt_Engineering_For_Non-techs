# AI grading correction — 10 October 2026

User reported `hi` earned 6.5/10. Root cause: generation volunteered SOP task content, and Judge credited the resulting output without requiring learner task intent.

Changes in productionAiService.ts:
- Sandbox instructions prohibit inferring/completing the exercise from context alone.
- Greeting-only prompts receive zero across the configured active rubric, with EN/VI revision feedback and no Judge provider call.
- Other prompts require structured taskAttempt verdict; off-task verdict forces zero. Judge instructions distinguish learner instructions from output volunteered by the generator.
- Generation uses low thinking; older model fallback preserves includeThoughts while using bounded thinkingBudget.

Verification:
- Offline task-alignment regression, Judge schema, learner provider contract, backend failure recovery, provider fallback PASS.
- npm run build PASS; existing chunk-size warning.
- Direct live fictional SOP: greeting 3386ms, no SOP answer; valid extraction 3246ms, exactly two cited bullets; Judge scored 10. This is a calibration example, not a comprehensive pedagogical scoring benchmark.
- Production dedicated QA: greeting Generate 860ms, short greeting only; Judge HTTP200, total0, endpoint5688ms (DB/auth/persistence remain). No Judge provider call for this greeting branch.
- Production READY and root alias verified: dpl_DM6zsjcBVS1Z6bTXPQ3YjGTUoJh8, promptify-rebuild-ifjfja4me-promptify3.vercel.app.
- Existing scored attempts remain unchanged; use a new run to evaluate corrected behavior. No migration or data rewrite.

Worker preference: user requested Antigravity CLI for simple tasks and GPT Sol supervisor. Attempted existing isolated Gemini3.8Flash worker on one new rubric test only. Run outputs/multi-agent/promptify-ma-rubric-rounding-ef4ce2350c BLOCKED: CLI requested find /workspace outside exact command allowlist, auto-denied, empty response despite SUCCESS. Candidate not applied; no permissions bypass or production credentials mounted. Existing controller remains unchanged.

Remaining limits: arbitrary task alignment is still an AI judgement, not a deterministic guarantee. Provider latency varies. Canonical rubric configuration still controls each lesson's weights and criteria.

Worker follow-up: explicit source in prompt allowed creation of a valid rubric regression test, independently rerun locally PASS, but CLI timed out with empty final response so controller correctly BLOCKED/no apply. OAuth metadata identified prior account duonglh.work@gmail.com. User requires kangseobi123@gmail.com; new isolated auth volume promptify-kang-coding-auth created and controller switched to it without fallback. Fresh OAuth container promptify-kang-oauth awaits user authentication (terminal session74350). No candidate accepted or integrated yet.
