-- Remove only the legacy seed identities that never became authenticated users.
-- Real OAuth accounts are preserved even if an email happens to match a seed row.
BEGIN;

DELETE FROM public.users
WHERE auth_provider_id IS NULL
  AND (id, email) IN (
    ('00000000-0000-0000-0000-000000000001'::uuid, 'nam.nh@agribank.com.vn'),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'linh.pham@agribank.com.vn'),
    ('00000000-0000-0000-0000-000000000003'::uuid, 'minh.tran@agribank.com.vn'),
    ('00000000-0000-0000-0000-000000000004'::uuid, 'phuong.nguyen@enterprise.com')
  );

COMMIT;
NOTIFY pgrst, 'reload schema';
