param([string]$OutputDirectory='outputs/staging-readiness-2026-10-19')
$ErrorActionPreference='Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$taskRoot=$OutputDirectory
New-Item -ItemType Directory -Force $taskRoot|Out-Null
$taskProject='ai-transformation-510302'
$taskToken=(& gcloud.cmd auth print-access-token --account=demo.biz@intrepid.asia) -join ''
if($LASTEXITCODE -ne 0 -or !$taskToken){throw 'Cloud session unavailable'}
$taskHeaders=@{Authorization="Bearer $taskToken";'x-goog-user-project'=$taskProject}
$taskSummary=@()
try{
 foreach($taskKind in @('alertPolicies','uptimeCheckConfigs','notificationChannels')){
  try{
   $taskRows=@();$taskPage='';$taskPages=0
   do {
    $taskUri="https://monitoring.googleapis.com/v3/projects/$taskProject/$taskKind"+'?pageSize=100'
    if($taskPage){$taskUri+='&pageToken='+[uri]::EscapeDataString($taskPage)}
    $taskResult=Invoke-RestMethod -Uri $taskUri -Headers $taskHeaders
    $taskRows+=@($taskResult.$taskKind|Where-Object {$_});$taskPage=$taskResult.nextPageToken;$taskPages++
   }while($taskPage)
   if($taskKind -eq 'notificationChannels'){$taskRows=@($taskRows|Select-Object name,displayName,type,enabled)}
   @{at=(Get-Date).ToUniversalTime().ToString('o');project=$taskProject;items=$taskRows;pages=$taskPages;nextPageTokenPresent=[bool]$taskPage}|ConvertTo-Json -Depth 50|Set-Content "$taskRoot/monitoring-$taskKind.json"
   $taskSummary+=@{kind=$taskKind;status='read';count=$taskRows.Count;additionalPages=[bool]$taskResult.nextPageToken}
  }catch{
   $taskCode=0;if($_.Exception.Response){$taskCode=[int]$_.Exception.Response.StatusCode}
   $taskSummary+=@{kind=$taskKind;status='unavailable';httpStatus=$taskCode}
  }
 }
 $taskRequested=@('monitoring.uptimeCheckConfigs.create','monitoring.alertPolicies.create','monitoring.notificationChannels.create','cloudsql.instances.create','cloudsql.instances.restoreBackup','cloudsql.backupRuns.get')
 try{
  $taskPermissions=Invoke-RestMethod -Method Post -Uri "https://cloudresourcemanager.googleapis.com/v1/projects/${taskProject}:testIamPermissions" -Headers $taskHeaders -ContentType 'application/json' -Body (@{permissions=$taskRequested}|ConvertTo-Json)
  @{at=(Get-Date).ToUniversalTime().ToString('o');scope='Read-only effective permission test; no IAM mutation';requested=$taskRequested;granted=@($taskPermissions.permissions)}|ConvertTo-Json -Depth 6|Set-Content "$taskRoot/operator-permissions.json"
 }catch{
  @{scope='Permission test unavailable; do not infer permission absent';status='unavailable'}|ConvertTo-Json|Set-Content "$taskRoot/operator-permissions.json"
 }
 $taskSqlRaw=& gcloud.cmd sql instances describe promptify-staging --project=$taskProject --format=json
 if($LASTEXITCODE -ne 0){throw 'Staging SQL inventory unavailable'}
 $taskSql=($taskSqlRaw -join "`n")|ConvertFrom-Json
 if($taskSql.name -ne 'promptify-staging'){throw 'Unexpected SQL target'}
 $taskBackupsRaw=& gcloud.cmd sql backups list --instance=promptify-staging --project=$taskProject --format=json
 if($LASTEXITCODE -ne 0){throw 'Staging backup inventory unavailable'}
 $taskBackups=($taskBackupsRaw -join "`n")|ConvertFrom-Json
 @{at=(Get-Date).ToUniversalTime().ToString('o');instance=$taskSql.name;region=$taskSql.region;availabilityType=$taskSql.settings.availabilityType;backupConfiguration=$taskSql.settings.backupConfiguration;backups=@($taskBackups|Select-Object id,status,type,startTime,endTime);restoreRehearsal='Not performed; do not equate backup presence with restore verification'}|ConvertTo-Json -Depth 30|Set-Content "$taskRoot/backup-readiness.json"
 $taskSummary|ConvertTo-Json -Depth 10|Set-Content "$taskRoot/operations-summary.json"
 $taskSummary|ForEach-Object {Write-Output "$($_.kind): $($_.status), count=$($_.count), http=$($_.httpStatus)"}
}finally{$taskToken=$null;$taskHeaders=$null}
