$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$taskPublic=@{}
Get-Content '.env.staging.local' | ForEach-Object {
 if($_ -match '^(VITE_FIREBASE_(API_KEY|AUTH_DOMAIN|PROJECT_ID|APP_ID))=(.*)$'){$taskPublic[$Matches[1]]=$Matches[3].Trim()}
}
if($taskPublic['VITE_FIREBASE_PROJECT_ID'] -ne 'ai-transformation-510302' -or $taskPublic['VITE_FIREBASE_APP_ID'] -ne '1:390575746801:web:af750eeab9c2bcf097c350'){throw 'Unexpected Firebase target'}
$taskSubs="_REGION=asia-southeast1,_TAG=revised-ui-20261018,_FIREBASE_API_KEY=$($taskPublic['VITE_FIREBASE_API_KEY']),_FIREBASE_AUTH_DOMAIN=$($taskPublic['VITE_FIREBASE_AUTH_DOMAIN']),_FIREBASE_APP_ID=$($taskPublic['VITE_FIREBASE_APP_ID'])"
$ErrorActionPreference='Continue'
$taskBuild=& gcloud.cmd builds submit . --project=ai-transformation-510302 --config=gcp/cloudbuild.yaml --service-account=projects/ai-transformation-510302/serviceAccounts/promptify-build@ai-transformation-510302.iam.gserviceaccount.com --gcs-source-staging-dir=gs://ai-transformation-510302-intrepid-build-staging/source --substitutions=$taskSubs --async --format=json --quiet
if($LASTEXITCODE -ne 0){throw 'Cloud Build submission failed'}
$taskBuild -join "`n" | Set-Content -Encoding utf8 'outputs/staging-release-2026-10-18/build-submitted.json'
$taskObject=($taskBuild -join "`n") | ConvertFrom-Json
Write-Output "Submitted staging build: $($taskObject.id)"
