$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$taskBuildId='1ddfbef3-1794-475d-ad3b-58d754467182'
$taskBuildRaw=& gcloud.cmd builds describe $taskBuildId --project=ai-transformation-510302 --format=json
if($LASTEXITCODE -ne 0){throw 'Cannot read build'}
$taskBuild=($taskBuildRaw -join "`n") | ConvertFrom-Json
if($taskBuild.status -ne 'SUCCESS'){throw "Build not successful: $($taskBuild.status)"}
$taskImage=$taskBuild.results.images[0]
if($taskImage.name -ne 'asia-southeast1-docker.pkg.dev/ai-transformation-510302/promptify-intrepid/app:revised-ui-20261018' -or $taskImage.digest -notmatch '^sha256:[a-f0-9]{64}$'){throw 'Unexpected image'}
$taskRef="asia-southeast1-docker.pkg.dev/ai-transformation-510302/promptify-intrepid/app@$($taskImage.digest)"
@{buildId=$taskBuildId;image=$taskRef;buildFinished=$taskBuild.finishTime;at=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content 'outputs/staging-release-2026-10-18/image.json' -Encoding utf8
$taskRaw=& gcloud.cmd run services describe promptify-intrepid-api --project=ai-transformation-510302 --region=asia-southeast1 --format=json
if($LASTEXITCODE -ne 0){throw 'Cannot read target'}
$taskService=($taskRaw -join "`n") | ConvertFrom-Json
if($taskService.spec.template.metadata.annotations.'run.googleapis.com/cloudsql-instances' -ne 'ai-transformation-510302:asia-southeast1:promptify-staging' -or $taskService.spec.template.spec.serviceAccountName -ne 'promptify-api@ai-transformation-510302.iam.gserviceaccount.com'){throw 'Unexpected service target'}
if($taskService.status.latestReadyRevisionName -ne 'promptify-intrepid-api-00004-chg'){throw 'Staging changed since baseline; re-review required'}
$ErrorActionPreference='Continue'
& gcloud.cmd run services update promptify-intrepid-api --project=ai-transformation-510302 --region=asia-southeast1 --image=$taskRef --no-traffic --tag=revised-ui-review --quiet
if($LASTEXITCODE -ne 0){throw 'Staging revision update failed'}
