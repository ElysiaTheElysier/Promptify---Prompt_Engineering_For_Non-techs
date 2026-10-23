$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$taskOut='outputs/staging-release-2026-10-21-lifecycle-originals'
$taskRaw=& gcloud.cmd builds describe b3ced37d-85dc-42f5-a2d3-eb33a1c92a24 --project=ai-transformation-510302 --format=json
if($LASTEXITCODE -ne 0){throw 'Cannot read staging build'}
$taskBuild=($taskRaw -join "`n")|ConvertFrom-Json
if($taskBuild.status -ne 'SUCCESS'){throw 'Staging Drive build is not successful'}
$taskImage=$taskBuild.results.images[0]
if($taskImage.name -ne 'asia-southeast1-docker.pkg.dev/ai-transformation-510302/promptify-intrepid/app:drive-originals-20261021' -or $taskImage.digest -notmatch '^sha256:[a-f0-9]{64}$'){throw 'Unexpected staging image'}
$taskRaw=& gcloud.cmd run services describe promptify-intrepid-api --project=ai-transformation-510302 --region=asia-southeast1 --format=json
if($LASTEXITCODE -ne 0){throw 'Cannot inspect staging target'}
$taskService=($taskRaw -join "`n")|ConvertFrom-Json
$taskTraffic=@($taskService.status.traffic|Where-Object{$_.percent -gt 0})
if($taskService.spec.template.metadata.annotations.'run.googleapis.com/cloudsql-instances' -ne 'ai-transformation-510302:asia-southeast1:promptify-staging' -or $taskService.spec.template.spec.serviceAccountName -ne 'promptify-api@ai-transformation-510302.iam.gserviceaccount.com' -or $taskTraffic.Count -ne 1 -or $taskTraffic[0].revisionName -ne 'promptify-intrepid-api-ws-1020' -or $taskTraffic[0].percent -ne 100 -or $taskService.spec.template.spec.containers[0].image -notlike '*sha256:291f2183a0e4dbe78ff0768f34afd85580b1a85685701b69ff6d55305558dfd9'){throw 'Staging baseline changed; stop for review'}
$taskImageRef="asia-southeast1-docker.pkg.dev/ai-transformation-510302/promptify-intrepid/app@$($taskImage.digest)"
@{at=(Get-Date).ToUniversalTime().ToString('o');buildId=$taskBuild.id;image=$taskImageRef;previousRevision='promptify-intrepid-api-ws-1020';nextRevision='promptify-intrepid-api-drv-1021';scope='Drive originals only. Existing roster implementation retained; migration 011 NOT assumed applied.'}|ConvertTo-Json|Set-Content "$taskOut/drive-image.json"
& gcloud.cmd run services update promptify-intrepid-api --project=ai-transformation-510302 --region=asia-southeast1 --image=$taskImageRef --revision-suffix=drv-1021 --no-traffic --tag=drive-original-review --quiet
if($LASTEXITCODE -ne 0){throw 'Staging candidate failed'}
Write-Output 'Drive-only candidate ready with zero main traffic. Verify before promotion.'
