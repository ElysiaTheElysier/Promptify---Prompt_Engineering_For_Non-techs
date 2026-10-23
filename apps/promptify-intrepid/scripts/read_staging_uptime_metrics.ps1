$ErrorActionPreference='Stop'
$taskOut='outputs/staging-release-2026-10-20-access-roster'
$taskToken=(& gcloud.cmd auth print-access-token --account=demo.biz@intrepid.asia) -join ''
if($LASTEXITCODE -ne 0){throw 'Cloud session unavailable'}
try{
 $taskFilter='metric.type="monitoring.googleapis.com/uptime_check/check_passed"'
 $taskEnd=(Get-Date).ToUniversalTime();$taskStart=$taskEnd.AddMinutes(-10)
 $taskUrl='https://monitoring.googleapis.com/v3/projects/ai-transformation-510302/timeSeries?filter='+[uri]::EscapeDataString($taskFilter)+'&interval.startTime='+$taskStart.ToString('o')+'&interval.endTime='+$taskEnd.ToString('o')+'&view=FULL&pageSize=100'
 $taskSeries=@();$taskPage='';$taskPages=0
 do{
  $taskData=Invoke-RestMethod -Uri ($taskUrl+$(if($taskPage){'&pageToken='+[uri]::EscapeDataString($taskPage)}else{''})) -Headers @{Authorization="Bearer $taskToken";'x-goog-user-project'='ai-transformation-510302'}
  $taskSeries+=@($taskData.timeSeries);$taskPage=$taskData.nextPageToken;$taskPages++;if($taskPages -gt 30){throw 'Metric page bound exceeded'}
 }while($taskPage)
 $taskRows=@($taskSeries|ForEach-Object{@{checkId=$_.metric.labels.check_id;location=$_.metric.labels.checker_location;points=@($_.points).Count;passed=@($_.points|Where-Object{$_.value.boolValue -eq $true}).Count;failed=@($_.points|Where-Object{$_.value.boolValue -eq $false}).Count}})
 @{at=$taskEnd.ToString('o');windowMinutes=10;rows=$taskRows;emailDeliveryVerified=$false}|ConvertTo-Json -Depth 8|Set-Content "$taskOut/monitoring/observed-uptime.json"
 $taskRows|Format-Table
}finally{$taskToken=$null}
