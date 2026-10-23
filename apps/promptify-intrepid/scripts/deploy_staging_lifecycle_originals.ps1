$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$taskOut='outputs/staging-release-2026-10-21-lifecycle-resume'
$taskCatalog=Get-Content "$taskOut/roster-catalog-after.json" -Raw|ConvertFrom-Json
if(-not $taskCatalog.exists.ownership -or -not $taskCatalog.exists.finalizer -or $taskCatalog.catalog.privilege.anon -or $taskCatalog.catalog.privilege.authenticated -or -not $taskCatalog.catalog.privilege.service_role){throw 'Reviewed migration verification required'}
$taskHash=(Get-FileHash gcp/sql/011_roster_lifecycle.sql -Algorithm SHA256).Hash
if($taskHash -ne '186642A407C8A9E83D368E0AE65A72A03B67E53478CA8120DAA3ACA0A44F9DCE'){throw 'Migration hash changed'}
$taskRaw=& gcloud.cmd builds describe 27adbe74-ae50-455c-8c24-2f879cd99047 --project=ai-transformation-510302 --format=json
if($LASTEXITCODE -ne 0){throw 'Cannot read staging build'}
$taskBuild=($taskRaw -join "`n")|ConvertFrom-Json
$taskBuild|ConvertTo-Json -Depth 100|Set-Content "$taskOut/build.json"
if($taskBuild.status -ne 'SUCCESS'){throw 'Combined staging build is not successful'}
$taskImage=$taskBuild.results.images[0]
if($taskImage.name -ne 'asia-southeast1-docker.pkg.dev/ai-transformation-510302/promptify-intrepid/app:lifecycle-originals-20261021' -or $taskImage.digest -notmatch '^sha256:[a-f0-9]{64}$'){throw 'Unexpected staging image'}
$taskRaw=& gcloud.cmd run services describe promptify-intrepid-api --project=ai-transformation-510302 --region=asia-southeast1 --format=json
if($LASTEXITCODE -ne 0){throw 'Cannot inspect staging target'}
$taskService=($taskRaw -join "`n")|ConvertFrom-Json
$taskTraffic=@($taskService.status.traffic|Where-Object{$_.percent -gt 0})
if($taskService.spec.template.metadata.annotations.'run.googleapis.com/cloudsql-instances' -ne 'ai-transformation-510302:asia-southeast1:promptify-staging' -or $taskService.spec.template.spec.serviceAccountName -ne 'promptify-api@ai-transformation-510302.iam.gserviceaccount.com' -or $taskTraffic.Count -ne 1 -or $taskTraffic[0].revisionName -ne 'promptify-intrepid-api-drv-1021' -or $taskTraffic[0].percent -ne 100 -or $taskService.spec.template.spec.containers[0].image -notlike '*sha256:5b252c4dbcb51e43e2e7c74afc28a11964ed8ce3c14462aabf666a0189625314'){throw 'Staging baseline changed; stop for review'}
$taskImageRef="asia-southeast1-docker.pkg.dev/ai-transformation-510302/promptify-intrepid/app@$($taskImage.digest)"
@{at=(Get-Date).ToUniversalTime().ToString('o');buildId=$taskBuild.id;image=$taskImageRef;previousRevision='promptify-intrepid-api-drv-1021';nextRevision='promptify-intrepid-api-life-1021';schemaSha256=$taskHash;scope='Staging only; migration 011 verified before new roster RPC caller.'}|ConvertTo-Json|Set-Content "$taskOut/image.json"
& gcloud.cmd run services update promptify-intrepid-api --project=ai-transformation-510302 --region=asia-southeast1 --image=$taskImageRef --revision-suffix=life-1021 --no-traffic --tag=lifecycle-review --quiet
if($LASTEXITCODE -ne 0){throw 'Staging candidate failed'}
Write-Output 'Combined staging candidate ready with zero main traffic. Verify before promotion.'
