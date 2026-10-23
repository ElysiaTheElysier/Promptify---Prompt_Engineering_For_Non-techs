$ErrorActionPreference='Stop'
$taskOut='outputs/staging-release-2026-10-20-access-roster'
$taskChecks=Get-Content "$taskOut/candidate-checks.json" -Raw|ConvertFrom-Json
if(@($taskChecks.results|Where-Object{!$_.ok}).Count -or @($taskChecks.results).Count -ne 5){throw 'Candidate probe failure'}
$taskService=gcloud.cmd run services describe promptify-intrepid-api --project=ai-transformation-510302 --region=asia-southeast1 --format=json|ConvertFrom-Json
if($LASTEXITCODE -ne 0){throw 'Staging inspection failed'}
$taskTraffic=@($taskService.status.traffic|Where-Object{$_.percent -gt 0})
if($taskService.status.latestReadyRevisionName -ne 'promptify-intrepid-api-ar2-1020' -or $taskService.spec.template.metadata.annotations.'run.googleapis.com/cloudsql-instances' -ne 'ai-transformation-510302:asia-southeast1:promptify-staging' -or $taskTraffic.Count -ne 1 -or $taskTraffic[0].revisionName -ne 'promptify-intrepid-api-sopcheck-1020' -or $taskTraffic[0].percent -ne 100){throw 'Staging baseline guard failed'}
$taskImage=Get-Content "$taskOut/image.json" -Raw|ConvertFrom-Json
if($taskService.spec.template.spec.containers[0].image -ne $taskImage.image){throw 'Candidate image mismatch'}
gcloud.cmd run services update-traffic promptify-intrepid-api --project=ai-transformation-510302 --region=asia-southeast1 --to-revisions=promptify-intrepid-api-ar2-1020=100 --quiet
if($LASTEXITCODE -ne 0){throw 'Promotion failed'}
@{at=(Get-Date).ToUniversalTime().ToString('o');previous='promptify-intrepid-api-sopcheck-1020';active='promptify-intrepid-api-ar2-1020';image=$taskImage.image;scope='Staging API only; Workspace unbound sources fail closed; no IAM change'}|ConvertTo-Json|Set-Content "$taskOut/promotion.json"
