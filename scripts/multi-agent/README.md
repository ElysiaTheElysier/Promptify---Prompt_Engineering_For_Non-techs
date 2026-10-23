# Minimal Gemini coding workers

Supervisor: GPT Sol. Coding: installed Antigravity CLI 1.3.2, `gemini-3.8-flash`, low effort, separate Google OAuth account `kangseobi123@gmail.com` (CLI confirms Google AI Pro). Telemetry disabled. Production secrets are never mounted.

Verified 10 October 2026:
- No-tools response exactly PROBE_OK, 3.72 seconds.
- Real code-return task, 7.57 seconds; independent network-disabled container test passed; supervisor reviewed entire diff, approved, and applied one new test. Local rerun passed.
- Evidence: outputs/multi-agent/promptify-ma-rubric-rounding-795e2b39b4 (contract, baseline hashes, structured worker output, gates, review, resumable state).
- Added test/verify_rubric_rounding.ts. Application code untouched.

Default delivery is `code`: Gemini returns source without using tools; controller writes only the one permitted candidate file. Independent tools run tests; Gemini does not itself run tests in this mode. Direct `edits` mode is experimental: CLI wrote files but returned empty final output and timed out, so results were rejected. No permission bypass was used.

Usage from repository root:

```powershell
node scripts/multi-agent/run.mjs run scripts/multi-agent/tasks/rubric.json
# Or pass two or three contracts with distinct output files for parallel runs.
node scripts/multi-agent/run.mjs review outputs/multi-agent/<run> APPROVE "Specific review evidence"
node scripts/multi-agent/run.mjs apply outputs/multi-agent/<run>
```

Current contracts intentionally allow only one NEW test file per worker. Source inputs are explicit and read-only. Existing files are never overwritten on apply. No automatic review, merge, push or deployment. Writes are accepted only after independent tests and explicit supervisor approval. Do not pass application credentials into the container. Docker must be running. Single-worker execution is verified; two/three concurrent execution is supported by scope checks but was not newly exercised in this verification.

This offloads code generation from Sol; planning, context preparation and review still consume Sol usage. It does not guarantee a particular percentage of quota savings or unlimited Pro capacity.
