BEGIN;
-- Private originals; upload/download tokens are minted only after class/lesson authorization.
INSERT INTO storage.buckets(id,name,public,file_size_limit)
VALUES ('product-sop-originals','product-sop-originals',false,26214400)
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=26214400;
COMMIT;
