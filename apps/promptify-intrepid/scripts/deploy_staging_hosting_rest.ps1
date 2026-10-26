param([ValidateSet('access-roster','synthetic-workspace','lifecycle-originals','lifecycle-resume','lifecycle-ui-download','judge-repair','judge-async-p3','test-log-gaps','workshop-messaging','hint-requests','hint-multi','hint-inline','role-promote','hint-later','sop-upload-ux','ui-waves-abc','ui-refactor')][string]$ReleaseSuffix='access-roster', [ValidatePattern('^2026-[0-9]{2}-[0-9]{2}$')][string]$ReleaseDate='2026-10-20', [switch]$ResumeCreatedVersion)
$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$taskOut="outputs/staging-release-$ReleaseDate-$ReleaseSuffix"
$taskSite='ai-transformation-510302-intrepid-staging'
$taskConfig=Get-Content firebase.staging.json -Raw|ConvertFrom-Json
if($taskConfig.hosting.site -ne $taskSite -or $taskConfig.hosting.public -ne 'dist'){throw 'Unexpected staging target'}
$taskBefore=Join-Path $taskOut "before/$taskSite-releases.json"
if(Test-Path $taskBefore){
 $taskBeforeReleases=Get-Content $taskBefore -Raw|ConvertFrom-Json
 $taskBeforeId=$taskBeforeReleases.releases[0].version.name.Split('/')[-1]
 $taskBaseline=Get-Content (Join-Path $taskOut "before/$taskSite-version-$taskBeforeId.json") -Raw|ConvertFrom-Json
}else{
 if($ReleaseSuffix -like 'lifecycle-*' -or $ReleaseSuffix -in @('judge-repair','judge-async-p3','test-log-gaps','workshop-messaging','hint-requests','hint-multi','hint-inline','role-promote','hint-later','sop-upload-ux','ui-waves-abc','ui-refactor')){throw 'Current staging Hosting baseline inventory required'}
 $taskBaseline=Get-Content "outputs/staging-release-2026-10-20-access-roster/after/$taskSite-version-bf274db45915e5f0.json" -Raw|ConvertFrom-Json
}
if($taskBaseline.config.rewrites[0].run.serviceId -ne 'promptify-intrepid-api' -or $taskBaseline.config.rewrites[0].run.region -ne 'asia-southeast1'){throw 'Unexpected API rewrite'}
$taskToken=(& gcloud.cmd auth print-access-token --account=demo.biz@intrepid.asia) -join ''
if($LASTEXITCODE -ne 0 -or !$taskToken){throw 'Cloud session unavailable'}
$taskHeaders=@{Authorization="Bearer $taskToken";'x-goog-user-project'='ai-transformation-510302'}
$taskRoot=(Resolve-Path dist).Path
$taskFiles=@{};$taskBlobs=@{}
try{
 foreach($taskFile in Get-ChildItem -LiteralPath $taskRoot -File -Recurse){
  $taskName='/'+$taskFile.FullName.Substring($taskRoot.Length+1).Replace('\','/')
  if($taskName -match '(^|/)\.|\.env|\.map$' -or $taskFile.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Unexpected public file'}
  $taskMemory=[IO.MemoryStream]::new();$taskGzip=[IO.Compression.GZipStream]::new($taskMemory,[IO.Compression.CompressionLevel]::Optimal,$true)
  $taskBytes=[IO.File]::ReadAllBytes($taskFile.FullName);$taskGzip.Write($taskBytes,0,$taskBytes.Length);$taskGzip.Dispose();$taskCompressed=$taskMemory.ToArray();$taskMemory.Dispose()
  $taskSha=[Security.Cryptography.SHA256]::Create();$taskHash=([BitConverter]::ToString($taskSha.ComputeHash($taskCompressed)) -replace '-','').ToLowerInvariant();$taskSha.Dispose()
  $taskFiles[$taskName]=$taskHash;$taskBlobs[$taskHash]=$taskCompressed
 }
 if(!$taskFiles.ContainsKey('/index.html') -or !$taskFiles.ContainsKey('/staging-access-qa.html') -or $taskFiles.Count -gt 100){throw 'Unexpected build inventory'}
 $taskBase="https://firebasehosting.googleapis.com/v1beta1/sites/$taskSite"
 $taskCurrent=Invoke-RestMethod -Uri "$taskBase/releases?pageSize=1" -Headers $taskHeaders
 $taskPrevious=$taskCurrent.releases[0].version.name
 if($taskPrevious -notlike "sites/$taskSite/versions/*"){throw 'Missing rollback version'}
 if($taskBeforeReleases -and $taskPrevious -ne $taskBeforeReleases.releases[0].version.name){throw 'Staging Hosting baseline changed after capture'}
 if($ResumeCreatedVersion){
  $taskProgress=Get-Content "$taskOut/hosting-rest-progress.json" -Raw|ConvertFrom-Json
  if($taskProgress.stage -ne 'created' -or $taskProgress.previous -ne $taskPrevious -or $taskProgress.version -notmatch "^sites/$taskSite/versions/[a-f0-9]+$"){throw 'Unexpected partial staging version checkpoint'}
  $taskVersion=Invoke-RestMethod -Uri "https://firebasehosting.googleapis.com/v1beta1/$($taskProgress.version)" -Headers $taskHeaders
  if($taskVersion.name -ne $taskProgress.version -or $taskVersion.status -ne 'CREATED' -or ($taskVersion.config|ConvertTo-Json -Depth 30 -Compress) -cne ($taskBaseline.config|ConvertTo-Json -Depth 30 -Compress)){throw 'Partial staging version is not an unchanged created candidate'}
 }else{
  $taskVersion=Invoke-RestMethod -Method Post -Uri "$taskBase/versions" -Headers $taskHeaders -ContentType application/json -Body (@{config=$taskBaseline.config;labels=@{'deployment-tool'='staging-governance-rest'}}|ConvertTo-Json -Depth 20)
 }
 @{at=(Get-Date).ToUniversalTime().ToString('o');previous=$taskPrevious;version=$taskVersion.name;stage='created'}|ConvertTo-Json|Set-Content "$taskOut/hosting-rest-progress.json"
 $taskPopulate=Invoke-RestMethod -Method Post -Uri "https://firebasehosting.googleapis.com/v1beta1/$($taskVersion.name):populateFiles" -Headers $taskHeaders -ContentType application/json -Body (@{files=$taskFiles}|ConvertTo-Json -Depth 5)
 if($taskPopulate.uploadUrl -notmatch '^https://upload-firebasehosting\.googleapis\.com/'){throw 'Unexpected upload destination'}
 foreach($taskHash in $taskPopulate.uploadRequiredHashes){
  if(!$taskBlobs.ContainsKey($taskHash)){throw 'Unexpected content hash'}
  Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$($taskPopulate.uploadUrl)/$taskHash" -Headers $taskHeaders -ContentType application/octet-stream -Body $taskBlobs[$taskHash] -TimeoutSec 45|Out-Null
 }
 Invoke-RestMethod -Method Patch -Uri "https://firebasehosting.googleapis.com/v1beta1/$($taskVersion.name)?updateMask=status" -Headers $taskHeaders -ContentType application/json -Body '{"status":"FINALIZED"}'|Out-Null
 $taskPreRelease=Invoke-RestMethod -Uri "$taskBase/releases?pageSize=1" -Headers $taskHeaders
 if($taskPreRelease.releases[0].version.name -ne $taskPrevious){throw 'Staging Hosting changed before release; finalized candidate retained without promotion'}
 $taskRelease=Invoke-RestMethod -Method Post -Uri "$taskBase/releases?versionName=$([uri]::EscapeDataString($taskVersion.name))" -Headers $taskHeaders -ContentType application/json -Body '{"message":"Staging source access controls and clear quota messages; no IAM or production changes"}'
 @{at=(Get-Date).ToUniversalTime().ToString('o');site=$taskSite;previous=$taskPrevious;version=$taskVersion.name;release=$taskRelease.name;fileCount=$taskFiles.Count;scope='Staging site only; existing Cloud Run rewrite preserved; temporary operator token in memory'}|ConvertTo-Json -Depth 10|Set-Content "$taskOut/hosting-rest-release.json"
 Write-Output "Released staging Hosting $($taskVersion.name), $($taskFiles.Count) files"
}finally{$taskToken=$null;$taskHeaders=$null;$taskBlobs=$null}
