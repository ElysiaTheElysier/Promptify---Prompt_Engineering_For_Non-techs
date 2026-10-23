param([string]$Revision='promptify-intrepid-api-ready-1019')
$ErrorActionPreference='Stop'
$taskOut=Join-Path $PSScriptRoot '../outputs/staging-release-2026-10-19-readiness'
$taskHashes=@()
foreach($taskName in @('promptify-intrepid-api-jb-1019',$Revision)){
 $taskRaw=& gcloud.cmd run revisions describe $taskName --project=ai-transformation-510302 --region=asia-southeast1 --format=json
 if($LASTEXITCODE -ne 0){throw 'Revision unavailable'}
 $taskObj=($taskRaw -join "`n")|ConvertFrom-Json
 foreach($taskContainer in $taskObj.spec.containers){$taskContainer.image='[IMAGE]'}
 $taskCanonical=$taskObj.spec|ConvertTo-Json -Depth 100 -Compress
 $taskHasher=[System.Security.Cryptography.SHA256]::Create()
 $taskHash=[System.BitConverter]::ToString($taskHasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($taskCanonical))).Replace('-','').ToLowerInvariant()
 $taskHashes+=@{revision=$taskName;sha256=$taskHash}
}
$taskSame=$taskHashes[0].sha256 -eq $taskHashes[1].sha256
@{checkedAt=(Get-Date).ToUniversalTime().ToString('o');scope='raw complete revision spec, image only masked; env values never written';unchanged=$taskSame;hashes=$taskHashes}|ConvertTo-Json -Depth 8|Set-Content "$taskOut/raw-spec-hashes.json"
if(-not $taskSame){throw 'Unexpected runtime spec change'}
Write-Output 'Raw runtime configuration unchanged except image.'
