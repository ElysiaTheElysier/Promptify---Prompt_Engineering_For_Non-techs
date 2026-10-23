param([ValidateSet('before','after')][string]$Phase='before', [ValidatePattern('^2026-[0-9]{2}-[0-9]{2}$')][string]$ReleaseDate='2026-10-19', [ValidatePattern('^[a-z0-9-]*$')][string]$ReleaseSuffix='')
$ErrorActionPreference='Stop'
$taskRelease=if($ReleaseSuffix){"$ReleaseDate-$ReleaseSuffix"}else{$ReleaseDate}
$taskProject='ai-transformation-510302'
$taskRegion='asia-southeast1'
$taskOut=Join-Path $PSScriptRoot "../outputs/staging-release-$taskRelease/$Phase"
New-Item -ItemType Directory -Force -Path $taskOut | Out-Null
$taskResults=@()
function Save-Inventory([string]$Name,[string[]]$Arguments,[switch]$RunService) {
  $ErrorActionPreference='Continue'
  $raw=& gcloud.cmd @Arguments --project=$taskProject --format=json 2>$null
  $ErrorActionPreference='Stop'
$taskRelease=if($ReleaseSuffix){"$ReleaseDate-$ReleaseSuffix"}else{$ReleaseDate}
  if($LASTEXITCODE -ne 0){
    $script:taskResults+=@{name=$Name;status='unavailable';exitCode=$LASTEXITCODE}; return
  }
  $rawText=$raw -join "`n"
  if($rawText.Trim() -eq '[]'){$obj=@()}else{$obj=$rawText | ConvertFrom-Json}
  if($RunService){
    foreach($container in $obj.spec.template.spec.containers){
      foreach($entry in $container.env){
        if($entry.PSObject.Properties['value']){
          $safeNames='^(NODE_ENV|RUNTIME_MODE|GOOGLE_CLOUD_PROJECT|GCLOUD_PROJECT|FIREBASE_PROJECT_ID|DB_HOST|DB_PORT|DB_NAME|DB_USER|PGHOST|PGPORT|PGDATABASE|PGUSER|PGPOOL_MAX|GCP_WAREHOUSE_ENABLED|GCP_SOP_BUCKET|CLOUD_SQL_CONNECTION_NAME|CORS_ORIGINS|GCS_BUCKET|SOP_BUCKET|VERTEX_LOCATION|VERTEX_MODEL|GEMINI_MODEL|GEMINI_FALLBACK_MODEL|JUDGE_STRATEGY|GOOGLE_WORKSPACE_SERVICE_ACCOUNT|WORKSPACE_SOURCE_BINDINGS_JSON|AI_PROVIDER|PORT|DATABASE_BACKEND|VITE_REBUILD_PRODUCTION|DATA_BACKEND|AUTH_PROVIDER|ROSTER_STAGING_ENABLED|WORKER_AUDIENCE|WORKER_INVOKER_EMAIL)$'
          if($entry.name -notmatch $safeNames){$entry.value='[REDACTED: value not allowlisted]'}
        }
      }
    }
  }
  if($rawText.Trim() -eq '[]'){
    '[]' | Set-Content -Encoding utf8 (Join-Path $taskOut "$Name.json")
  }else{
    $obj | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 (Join-Path $taskOut "$Name.json")
  }
  $script:taskResults+=@{name=$Name;status='captured'}
}
Save-Inventory 'project' @('projects','describe',$taskProject)
Save-Inventory 'enabled-apis' @('services','list','--enabled')
Save-Inventory 'project-iam' @('projects','get-iam-policy',$taskProject)
Save-Inventory 'run-api' @('run','services','describe','promptify-intrepid-api',"--region=$taskRegion") -RunService
Save-Inventory 'run-api-iam' @('run','services','get-iam-policy','promptify-intrepid-api',"--region=$taskRegion")
Save-Inventory 'run-services' @('run','services','list',"--region=$taskRegion") -RunService
Save-Inventory 'sql-staging' @('sql','instances','describe','promptify-staging')
Save-Inventory 'sql-backups' @('sql','backups','list','--instance=promptify-staging','--limit=5')
Save-Inventory 'artifact-repositories' @('artifacts','repositories','list',"--location=$taskRegion")
Save-Inventory 'service-accounts' @('iam','service-accounts','list')
Save-Inventory 'secret-metadata' @('secrets','list')
Save-Inventory 'storage-buckets' @('storage','buckets','list')
Save-Inventory 'firestore-databases' @('firestore','databases','list')
Save-Inventory 'firestore-indexes' @('firestore','indexes','composite','list','--database=(default)')
Save-Inventory 'scheduler' @('scheduler','jobs','list',"--location=$taskRegion")
Save-Inventory 'logging-buckets' @('logging','buckets','list','--location=global')
Save-Inventory 'logging-sinks' @('logging','sinks','list')
Save-Inventory 'asset-resource-index' @('asset','search-all-resources',"--scope=projects/$taskProject")
Save-Inventory 'asset-iam-index' @('asset','search-all-iam-policies',"--scope=projects/$taskProject")
Save-Inventory 'sop-bucket-iam' @('storage','buckets','get-iam-policy',"gs://$taskProject-intrepid-sop-staging")
Save-Inventory 'build-bucket-iam' @('storage','buckets','get-iam-policy',"gs://$taskProject-intrepid-build-staging")
Save-Inventory 'runtime-secret-versions' @('secrets','versions','list','intrepid-db-password')
Save-Inventory 'runtime-secret-iam' @('secrets','get-iam-policy','intrepid-db-password')
$taskToken=(& gcloud.cmd auth print-access-token --account=demo.biz@intrepid.asia 2>$null) -join ''
if($LASTEXITCODE -eq 0){
 $taskHeaders=@{Authorization="Bearer $taskToken";'x-goog-user-project'=$taskProject}
 $endpoints=@{
  'hosting-sites'="https://firebasehosting.googleapis.com/v1beta1/projects/$taskProject/sites"
  'firebase-webapps'="https://firebase.googleapis.com/v1beta1/projects/$taskProject/webApps"
  'firebase-auth'="https://identitytoolkit.googleapis.com/admin/v2/projects/$taskProject/config"
  'firestore-rules-release'="https://firebaserules.googleapis.com/v1/projects/$taskProject/releases/cloud.firestore"
  'firebase-google-provider'="https://identitytoolkit.googleapis.com/admin/v2/projects/$taskProject/defaultSupportedIdpConfigs/google.com"
  'bigquery-datasets'="https://bigquery.googleapis.com/bigquery/v2/projects/$taskProject/datasets"
 }
 foreach($name in $endpoints.Keys){try{
  $data=Invoke-RestMethod -Uri $endpoints[$name] -Headers $taskHeaders
  if($name -eq 'firebase-auth'){
    $data=[ordered]@{name=$data.name;authorizedDomains=$data.authorizedDomains;signIn=[ordered]@{email=$data.signIn.email;phoneNumber=$data.signIn.phoneNumber;anonymous=$data.signIn.anonymous;hashConfig='[REDACTED]'};multiTenant=$data.multiTenant}
  }
  if($name -eq 'firebase-google-provider'){
    $data=[ordered]@{name=$data.name;enabled=$data.enabled;clientId=$data.clientId;clientSecret='[REDACTED]'}
  }
  if($name -eq 'firestore-rules-release' -and $data.rulesetName){
    $rules=Invoke-RestMethod -Uri "https://firebaserules.googleapis.com/v1/$($data.rulesetName)" -Headers $taskHeaders
    $rules | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 (Join-Path $taskOut 'firestore-rules-source.json')
  }
  $data | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 (Join-Path $taskOut "$name.json")
  $taskResults+=@{name=$name;status='captured'}
 }catch{$taskResults+=@{name=$name;status='unavailable';reason='API request failed; no response body retained'}}}
}
$taskToken=$null; $taskHeaders=$null
@{phase=$Phase;capturedAt=(Get-Date).ToUniversalTime().ToString('o');project=$taskProject;region=$taskRegion;results=$taskResults} | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 (Join-Path $taskOut 'manifest.json')
$taskResults | ForEach-Object {Write-Output "$($_.name): $($_.status)"}



