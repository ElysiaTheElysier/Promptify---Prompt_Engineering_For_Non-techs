# Operator-run (values are typed or generated here and never printed). Load-test only: instance promptify-loadtest,
# secrets promptify-loadtest-identity / promptify-loadtest-db-password. Requires an authenticated gcloud (gcloud auth login).
$ErrorActionPreference = 'Stop'
$project = 'ai-transformation-510302'
$dir = Join-Path $env:USERPROFILE '.promptify-loadtest'
New-Item -ItemType Directory -Force $dir | Out-Null
icacls $dir /inheritance:r /grant:r "$($env:USERNAME):(OI)(CI)F" | Out-Null

# 1. Synthetic-identity HMAC secret: random 32 bytes, stored in Secret Manager and in the operator-only file.
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = ([BitConverter]::ToString($bytes) -replace '-', '').ToLower()
$file = Join-Path $dir 'identity.secret'
[IO.File]::WriteAllText($file, $secret)
gcloud secrets versions add promptify-loadtest-identity --project $project --data-file="$file" | Out-Null
Write-Host 'identity secret: version added (value not shown)'

# 2. Runtime DB password: typed by you, used again at the \password prompt of setup_loadtest_db.sql.
$pw = Read-Host -AsSecureString 'Choose the promptify_runtime password (load-test instance only)'
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw))
$tmp = Join-Path $dir 'db.tmp'
try { [IO.File]::WriteAllText($tmp, $plain); gcloud secrets versions add promptify-loadtest-db-password --project $project --data-file="$tmp" | Out-Null }
finally { Remove-Item -Force $tmp -ErrorAction SilentlyContinue; $plain = $null }
Write-Host 'db password secret: version added (value not shown)'

# 3. postgres password of the NEW instance (gcloud prompts; not the staging instance).
gcloud sql users set-password postgres --instance promptify-loadtest --project $project --prompt-for-password
Write-Host 'done'
