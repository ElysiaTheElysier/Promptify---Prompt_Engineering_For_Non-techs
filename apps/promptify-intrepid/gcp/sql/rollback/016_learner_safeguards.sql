-- Rollback for 016. Turn ACCESS_EXPIRY_MODE, SESSION_TOKEN_CAP and INJECTION_GUARD off first.
-- Drops session ledgers, security events and per-learner expiry dates; attempts, grades and enrollments stay.
-- Export product_security_events first if the audit trail must be kept.
BEGIN;
DROP TABLE public.product_security_events;
DROP TABLE public.product_ai_session_charges;
DROP TABLE public.product_ai_sessions;
ALTER TABLE public.enrollments DROP COLUMN access_expires_at;
COMMIT;
