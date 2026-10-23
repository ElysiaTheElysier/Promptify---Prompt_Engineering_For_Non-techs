-- 016: learner safeguards (additive). Reference test log TC-AUTH-04, TC-SEC-03, TC-SEC-04.
-- Each feature is also gated by its own API flag (ACCESS_EXPIRY_MODE, SESSION_TOKEN_CAP, INJECTION_GUARD),
-- all default OFF, so applying this migration alone changes no behaviour.
BEGIN;
-- TC-AUTH-04: per-learner, per-class access expiry. NULL = no expiry. After it passes the class is read-only.
ALTER TABLE public.enrollments ADD COLUMN access_expires_at timestamptz;

-- TC-SEC-03: cumulative provider tokens per learner, class and lesson session.
CREATE TABLE public.product_ai_sessions (
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes (id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons (id) ON DELETE CASCADE,
  session_no integer NOT NULL DEFAULT 1 CHECK (session_no >= 1),
  tokens_used integer NOT NULL DEFAULT 0 CHECK (tokens_used >= 0),
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, class_id, lesson_id)
);
-- One charge per run request, so a replayed or retried save never counts twice.
CREATE TABLE public.product_ai_session_charges (
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  class_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  session_no integer NOT NULL,
  tokens integer NOT NULL CHECK (tokens >= 0),
  estimated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_id)
);

-- TC-SEC-04: prompt-injection events. Only a hash of the prompt is kept, never its text.
CREATE TABLE public.product_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes (id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.lessons (id) ON DELETE SET NULL,
  request_id uuid,
  kind text NOT NULL CHECK (kind IN ('prompt_injection')),
  action text NOT NULL CHECK (action IN ('blocked','allowed_practice','logged')),
  signals text[] NOT NULL CHECK (cardinality(signals) BETWEEN 1 AND 20),
  prompt_sha256 text NOT NULL CHECK (prompt_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_security_events_class_idx ON public.product_security_events (class_id, created_at DESC);

DO $$ DECLARE name text; BEGIN
 FOREACH name IN ARRAY ARRAY['product_ai_sessions','product_ai_session_charges','product_security_events'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
  EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated',name);
  EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role',name);
  EXECUTE format('CREATE POLICY service_only ON public.%I TO service_role USING(true) WITH CHECK(true)',name);
 END LOOP;
END $$;
COMMIT;
