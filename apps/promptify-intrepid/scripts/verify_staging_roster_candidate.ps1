param()
$ErrorActionPreference='Stop'
$taskProject='ai-transformation-510302'
$taskBase='https://roster-review---promptify-intrepid-api-zmyu4rhkmq-as.a.run.app'
$taskAudience='https://promptify-intrepid-api-zmyu4rhkmq-as.a.run.app'
$taskOut='outputs/staging-release-2026-10-22-capacity-roster'
$taskRows=@()
function Check-Request($Name,$Path,$Method,$Expected,$Headers){
 $taskParams=@{Uri="$taskBase$Path";Method=$Method;Headers=$Headers;SkipHttpErrorCheck=$true;TimeoutSec=45}
 if($Method -eq 'POST'){$taskParams.ContentType='application/json';$taskParams.Body='{"action":"snapshot"}'}
 $response=Invoke-WebRequest @taskParams
 $script:taskRows+=@{name=$Name;status=[int]$response.StatusCode;expected=$Expected;ok=([int]$response.StatusCode -eq $Expected);body=($response.Content|ConvertFrom-Json)}
}
Check-Request 'readiness' '/readyz' 'GET' 200 @{}
Check-Request 'unsigned roster denied' '/internal/roster' 'POST' 401 @{}
Check-Request 'wrong method denied' '/internal/roster' 'GET' 405 @{}
Check-Request 'projection remains disabled on API' '/internal/projections' 'POST' 404 @{}
Check-Request 'Firebase API remains protected' '/api/product' 'POST' 401 @{}
$taskToken=(& gcloud.cmd auth print-identity-token --impersonate-service-account="promptify-scheduler@$taskProject.iam.gserviceaccount.com" --audiences=$taskAudience --include-email --project=$taskProject --quiet 2>$null) -join ''
try{
 if($LASTEXITCODE -eq 0 -and $taskToken){Check-Request 'existing Scheduler principal; no due enabled sources' '/internal/roster' 'POST' 200 @{Authorization="Bearer $taskToken"}}
 else{$taskRows+=@{name='manual Scheduler identity probe';pending=$true;reason='Existing operator cannot impersonate Scheduler identity; actual scheduled OIDC delivery must prove authorization; no IAM change attempted'}}
}finally{$taskToken=$null}
$taskRows|ConvertTo-Json -Depth 12|Set-Content "$taskOut/roster-candidate-checks.json" -Encoding utf8
$taskRows|ForEach-Object{"$($_.name): $($_.ok)"}
if(@($taskRows|Where-Object{$_.ContainsKey('ok') -and -not $_.ok}).Count){exit 1}
