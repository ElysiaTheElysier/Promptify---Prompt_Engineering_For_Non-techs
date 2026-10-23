param([ValidateSet('before','after')][string]$Phase='before', [ValidatePattern('^2026-[0-9]{2}-[0-9]{2}$')][string]$ReleaseDate='2026-10-19', [ValidatePattern('^[a-z0-9-]*$')][string]$ReleaseSuffix='')
$ErrorActionPreference='Stop'
$taskRelease=if($ReleaseSuffix){"$ReleaseDate-$ReleaseSuffix"}else{$ReleaseDate}
$taskProject='ai-transformation-510302'
$taskOut=Join-Path $PSScriptRoot "../outputs/staging-release-$taskRelease/$Phase"
New-Item -ItemType Directory -Force -Path $taskOut | Out-Null
$taskToken=(& gcloud.cmd auth print-access-token --account=demo.biz@intrepid.asia) -join ''
$taskHeaders=@{Authorization="Bearer $taskToken";'x-goog-user-project'=$taskProject}
foreach($site in @('ai-transformation-510302','ai-transformation-510302-intrepid-staging')){
 $root="https://firebasehosting.googleapis.com/v1beta1/sites/$site"
 $releases=Invoke-RestMethod -Uri "$root/releases?pageSize=5" -Headers $taskHeaders
 $releases | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 (Join-Path $taskOut "$site-releases.json")
 Write-Output "$site releases: $(@($releases.releases | Where-Object {$_}).Count)"
 foreach($release in $releases.releases){
   if($release.version.name){
     $config=Invoke-RestMethod -Uri "https://firebasehosting.googleapis.com/v1beta1/$($release.version.name)" -Headers $taskHeaders
     $id=$release.version.name.Split('/')[-1]
     $config | ConvertTo-Json -Depth 100 | Set-Content -Encoding utf8 (Join-Path $taskOut "$site-version-$id.json")
   }
 }
}
$taskToken=$null;$taskHeaders=$null
