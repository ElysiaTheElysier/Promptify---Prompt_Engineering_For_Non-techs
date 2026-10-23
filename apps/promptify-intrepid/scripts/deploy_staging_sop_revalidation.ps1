$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$taskOut='outputs/staging-release-2026-10-20-readiness-audit'
$taskBuildId=(Get-Content "$taskOut/build-submitted.json" -Raw|ConvertFrom-Json).id
$taskRaw=& gcloud.cmd builds describe $taskBuildId --project=ai-transformation-510302 --format=json
if($LASTEXITCODE -ne 0){throw 'Cannot read build'}
$taskBuild=($taskRaw -join "`n")|ConvertFrom-Json
if($taskBuild.status -ne 'SUCCESS'){throw 'Build is not successful'}
$taskImage=$taskBuild.results.images[0]
if($taskImage.name -ne 'asia-southeast1-docker.pkg.dev/ai-transformation-510302/promptify-intrepid/app:sop-revalidation-20261020' -or $taskImage.digest -notmatch '^sha256:[a-f0-9]{64}$'){throw 'Unexpected candidate image'}
$taskRaw=& gcloud.cmd run services describe promptify-intrepid-api --project=ai-transformation-510302 --region=asia-southeast1 --format=json
if($LASTEXITCODE -ne 0){throw 'Cannot inspect staging target'}
$taskService=($taskRaw -join "`n")|ConvertFrom-Json
$taskTraffic=@($taskService.status.traffic|Where-Object{$_.percent -gt 0})
if($taskService.spec.template.metadata.annotations.'run.googleapis.com/cloudsql-instances' -ne 'ai-transformation-510302:asia-southeast1:promptify-staging' -or $taskService.spec.template.spec.serviceAccountName -ne 'promptify-api@ai-transformation-510302.iam.gserviceaccount.com' -or $taskTraffic.Count -ne 1 -or $taskTraffic[0].revisionName -ne 'promptify-intrepid-api-sopdl-1019' -or $taskTraffic[0].percent -ne 100 -or $taskService.spec.template.spec.containers[0].image -notlike '*sha256:77fa1dd043279d6d57a77b84da375fc574465e9cd75878ac9cfa814568684a72'){throw 'Staging baseline changed; stop for review'}
$taskImageRef="asia-southeast1-docker.pkg.dev/ai-transformation-510302/promptify-intrepid/app@$($taskImage.digest)"
@{at=(Get-Date).ToUniversalTime().ToString('o');buildId=$taskBuildId;image=$taskImageRef;previousRevision='promptify-intrepid-api-sopdl-1019';nextRevision='promptify-intrepid-api-sopcheck-1020'}|ConvertTo-Json|Set-Content "$taskOut/image.json"
& gcloud.cmd run services update promptify-intrepid-api --project=ai-transformation-510302 --region=asia-southeast1 --image=$taskImageRef --revision-suffix=sopcheck-1020 --no-traffic --tag=sop-revalidation-review --quiet
if($LASTEXITCODE -ne 0){throw 'Candidate deploy failed'}
Write-Output 'Staging candidate ready with zero main traffic; verify before promotion.'
