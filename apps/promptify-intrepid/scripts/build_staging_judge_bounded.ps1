$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$taskOut='outputs/staging-release-2026-10-19-judge-bounded'
$taskRaw=& gcloud.cmd builds submit . --project=ai-transformation-510302 --config=gcp/cloudbuild.judge-bounded.yaml --service-account=projects/ai-transformation-510302/serviceAccounts/promptify-build@ai-transformation-510302.iam.gserviceaccount.com --gcs-source-staging-dir=gs://ai-transformation-510302-intrepid-build-staging/source --async --format=json --quiet
if($LASTEXITCODE -ne 0){throw 'Staging build submission failed'}
$taskBuild=($taskRaw -join "`n")|ConvertFrom-Json
@{id=$taskBuild.id;status=$taskBuild.status;project='ai-transformation-510302';tag='judge-bounded-20261019';submittedAt=(Get-Date).ToUniversalTime().ToString('o');publicFirebaseValues='not retained in governance copy'}|ConvertTo-Json|Set-Content "$taskOut/build-submitted.json"
Write-Output "Staging build submitted: $($taskBuild.id)"



