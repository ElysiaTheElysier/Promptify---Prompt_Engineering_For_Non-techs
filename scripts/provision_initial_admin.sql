-- Explicitly authorized initial administrator for the dedicated rebuild project.
-- Keep any existing profile name and identity binding; Google SSO binds on first verified login.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email)='duonglh.work@gmail.com' AND role <> 'admin') THEN
    RAISE EXCEPTION 'Existing account has another role; inspect before modifying its privileges.';
  END IF;
  INSERT INTO public.users(email,full_name,role)
  VALUES ('duonglh.work@gmail.com','','admin')
  ON CONFLICT (email) DO NOTHING;
END $$;
SELECT email,role,profile_confirmed_at IS NOT NULL AS profile_confirmed
FROM public.users WHERE email='duonglh.work@gmail.com';
COMMIT;
