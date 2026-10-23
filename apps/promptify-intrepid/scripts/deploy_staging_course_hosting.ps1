$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$taskConfig=Get-Content firebase.staging.json -Raw|ConvertFrom-Json
if($taskConfig.hosting.site -ne 'ai-transformation-510302-intrepid-staging' -or $taskConfig.hosting.public -ne 'dist'){throw 'Unexpected Hosting target'}
$taskOldToken=$env:FIREBASE_TOKEN
$taskOldQuota=$env:GOOGLE_CLOUD_QUOTA_PROJECT
try{
 $env:FIREBASE_TOKEN=(& gcloud.cmd auth print-access-token --account=demo.biz@intrepid.asia) -join ''
 if($LASTEXITCODE -ne 0 -or !$env:FIREBASE_TOKEN){throw 'Cloud session unavailable'}
 $env:GOOGLE_CLOUD_QUOTA_PROJECT='ai-transformation-510302'
 & node node_modules/firebase-tools/lib/bin/firebase.js deploy --project ai-transformation-510302 --config firebase.staging.json --only hosting --non-interactive
 if($LASTEXITCODE -ne 0){throw 'Staging Hosting deployment failed'}
}finally{
 $env:FIREBASE_TOKEN=$taskOldToken
 $env:GOOGLE_CLOUD_QUOTA_PROJECT=$taskOldQuota
 $taskOldToken=$null
}
