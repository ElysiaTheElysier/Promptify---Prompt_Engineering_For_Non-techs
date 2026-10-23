$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$taskProject='ai-transformation-510302'
$taskOut='outputs/staging-release-2026-10-20-access-roster/monitoring'
New-Item -ItemType Directory -Force $taskOut|Out-Null
$taskToken=(& gcloud.cmd auth print-access-token --account=demo.biz@intrepid.asia)-join ''
if($LASTEXITCODE -ne 0 -or !$taskToken){throw 'Operator auth unavailable'}
$taskHeaders=@{Authorization="Bearer $taskToken";'x-goog-user-project'=$taskProject}
$taskBase="https://monitoring.googleapis.com/v3/projects/$taskProject"
function Read-All($taskKind){
 $taskItems=@();$taskNext=''
 do{$taskUri="$taskBase/${taskKind}?pageSize=100";if($taskNext){$taskUri+='&pageToken='+[uri]::EscapeDataString($taskNext)};$taskPage=Invoke-RestMethod -Uri $taskUri -Headers $taskHeaders;$taskItems+=@($taskPage.$taskKind|Where-Object{$_});$taskNext=$taskPage.nextPageToken}while($taskNext)
 return $taskItems
}
function Save-Or-Reuse($taskKind,$taskBody){
 $taskExisting=@(Read-All $taskKind|Where-Object{$_.displayName -eq $taskBody.displayName})
 if($taskExisting.Count -gt 1){throw 'Duplicate monitoring resource; stop for review'}
 if($taskExisting.Count){return $taskExisting[0]}
 $taskBody|ConvertTo-Json -Depth 30|Set-Content "$taskOut/request-$taskKind-$($taskBody.displayName -replace '[^a-zA-Z0-9]','-').json"
 return Invoke-RestMethod -Method Post -Uri "$taskBase/$taskKind" -Headers $taskHeaders -ContentType application/json -Body ($taskBody|ConvertTo-Json -Depth 30)
}
try{
 $taskChannel=Save-Or-Reuse 'notificationChannels' @{displayName='Promptify staging operator';type='email';enabled=$true;labels=@{email_address='duonglh.work@gmail.com'};userLabels=@{environment='staging';application='promptify'}}
 if($taskChannel.type -ne 'email' -or $taskChannel.labels.email_address -ne 'duonglh.work@gmail.com'){throw 'Unexpected notification recipient'}
 $taskResults=@()
 foreach($taskTarget in @(@{name='Promptify staging frontend';host='ai-transformation-510302-intrepid-staging.web.app';path='/';content='Promptify'},@{name='Promptify staging API readiness';host='promptify-intrepid-api-zmyu4rhkmq-as.a.run.app';path='/readyz';content='"status":"ready"'})){
  $taskCheck=Save-Or-Reuse 'uptimeCheckConfigs' @{displayName=$taskTarget.name;monitoredResource=@{type='uptime_url';labels=@{project_id=$taskProject;host=$taskTarget.host}};httpCheck=@{useSsl=$true;validateSsl=$true;port=443;path=$taskTarget.path;requestMethod='GET';acceptedResponseStatusCodes=@(@{statusValue=200})};period='60s';timeout='10s';selectedRegions=@('USA','EUROPE','ASIA_PACIFIC');contentMatchers=@(@{content=$taskTarget.content;matcher='CONTAINS_STRING'})}
  if($taskCheck.monitoredResource.labels.host -ne $taskTarget.host -or $taskCheck.httpCheck.path -ne $taskTarget.path){throw 'Unexpected check target'}
  $taskId=($taskCheck.name -split '/')[-1]
  $taskFilter='metric.type="monitoring.googleapis.com/uptime_check/check_passed" AND metric.label.check_id="'+$taskId+'" AND resource.type="uptime_url"'
  $taskPolicy=Save-Or-Reuse 'alertPolicies' @{displayName=($taskTarget.name+' unavailable');enabled=$true;combiner='OR';notificationChannels=@($taskChannel.name);userLabels=@{environment='staging';application='promptify'};documentation=@{mimeType='text/markdown';content='STAGING ONLY. Check the named staging host and Cloud Run/SQL readiness. Do not change IAM or production. Capture incident and recovery evidence.'};conditions=@(@{displayName='At least two checker series failing for 3 minutes';conditionThreshold=@{filter=$taskFilter;comparison='COMPARISON_GT';thresholdValue=1;duration='180s';trigger=@{count=1};aggregations=@(@{alignmentPeriod='120s';perSeriesAligner='ALIGN_NEXT_OLDER';crossSeriesReducer='REDUCE_COUNT_FALSE';groupByFields=@('resource.label.*')})}});alertStrategy=@{autoClose='1800s'}}
  if($taskPolicy.notificationChannels -notcontains $taskChannel.name){throw 'Policy recipient mismatch'}
  $taskCheck|ConvertTo-Json -Depth 40|Set-Content "$taskOut/$taskId.json"
  $taskPolicy|ConvertTo-Json -Depth 40|Set-Content "$taskOut/policy-$taskId.json"
  $taskResults+=@{check=$taskCheck.name;policy=$taskPolicy.name;host=$taskTarget.host;path=$taskTarget.path}
 }
 @{at=(Get-Date).ToUniversalTime().ToString('o');recipient='duonglh.work@gmail.com';channel=$taskChannel.name;verificationStatus=$taskChannel.verificationStatus;resources=$taskResults;deliveryVerified=$false;scope='Staging uptime policies only; user named recipient; no manual message, IAM or production changes'}|ConvertTo-Json -Depth 20|Set-Content "$taskOut/summary.json"
 Write-Output "Configured $($taskResults.Count) staging checks/policies; channel delivery still requires verification."
}finally{$taskToken=$null;$taskHeaders=$null}
