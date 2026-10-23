$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$taskOut='outputs/staging-release-2026-10-19-sop-download'
$taskRaw=& gcloud.cmd builds describe ((Get-Content "$taskOut/build-submitted.json" -Raw | ConvertFrom-Json).id) --project=ai-transformation-510302 --format=json
if($LASTEXITCODE -ne 0){throw 'Cannot read staging build'}
$taskBuild=($taskRaw -join "`n")|ConvertFrom-Json
if($taskBuild.status -ne 'SUCCESS'){throw "Build not ready: $($taskBuild.status)"}
$taskImage=$taskBuild.results.images[0]
if($taskImage.name -ne 'asia-southeast1-docker.pkg.dev/ai-transformation-510302/promptify-intrepid/app:sop-download-20261019' -or $taskImage.digest -notmatch '^sha256:[a-f0-9]{64}$'){throw 'Unexpected image'}
$taskRef="asia-southeast1-docker.pkg.dev/ai-transformation-510302/promptify-intrepid/app@$($taskImage.digest)"
$taskSvcRaw=& gcloud.cmd run services describe promptify-intrepid-api --project=ai-transformation-510302 --region=asia-southeast1 --format=json
if($LASTEXITCODE -ne 0){throw 'Cannot read staging service'}
$taskSvc=($taskSvcRaw -join "`n")|ConvertFrom-Json
if($taskSvc.spec.template.metadata.annotations.'run.googleapis.com/cloudsql-instances' -ne 'ai-transformation-510302:asia-southeast1:promptify-staging' -or $taskSvc.spec.template.spec.serviceAccountName -ne 'promptify-api@ai-transformation-510302.iam.gserviceaccount.com'){throw 'Unexpected runtime target'}
$taskActive=@($taskSvc.status.traffic|Where-Object {$_.percent -gt 0})
if($taskActive.Count -ne 1 -or $taskActive[0].revisionName -ne 'promptify-intrepid-api-ready-1019' -or $taskActive[0].percent -ne 100){throw 'Staging active revision changed; review baseline first'}
@{buildId=$taskBuild.id;image=$taskRef;at=(Get-Date).ToUniversalTime().ToString('o');previousRevision=$taskActive[0].revisionName;nextRevision='promptify-intrepid-api-sopdl-1019'}|ConvertTo-Json|Set-Content "$taskOut/image.json"
& gcloud.cmd run services update promptify-intrepid-api --project=ai-transformation-510302 --region=asia-southeast1 --image=$taskRef --revision-suffix=sopdl-1019 --no-traffic --tag=sop-download-review --quiet
if($LASTEXITCODE -ne 0){throw 'Staging candidate deployment failed'}
Write-Output 'Candidate deployed with no traffic; test before promotion.'




