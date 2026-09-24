-- =============================================================================
-- MIGRATION 017: ENFORCE RPC-ONLY ATTEMPT/PROGRESS WRITES
-- Apply only after the RPC-backed application has been deployed and verified
-- on BOTH Vietnamese production and English review.
-- =============================================================================

BEGIN;

-- Migration 003 granted SELECT, INSERT, UPDATE and DELETE to authenticated.
-- Preserve SELECT and DELETE exactly as-is; remove only the two write paths now
-- replaced by record/update RPCs.
REVOKE INSERT, UPDATE ON TABLE public.prompt_attempts FROM authenticated;

COMMIT;
NOTIFY pgrst, 'reload schema';
