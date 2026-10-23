param([ValidatePattern('^2026-[0-9]{2}-[0-9]{2}$')][string]$ReleaseDate='2026-10-19', [ValidatePattern('^[a-z0-9-]*$')][string]$ReleaseSuffix='', [switch]$FrontendOnly, [switch]$AiConfiguration, [switch]$WorkspaceIdentity, [switch]$WorkspaceSourceBindings, [switch]$StagingRosterWorker, [ValidatePattern('^promptify-intrepid-api-[a-z0-9-]+$')][string]$ExpectedRevision='')
$ErrorActionPreference='Stop'
$taskRelease=if($ReleaseSuffix){"$ReleaseDate-$ReleaseSuffix"}else{$ReleaseDate}
$taskRoot=Join-Path $PSScriptRoot "../outputs/staging-release-$taskRelease"
function Read-Evidence($Phase,$Name){Get-Content (Join-Path $taskRoot "$Phase/$Name.json") -Raw | ConvertFrom-Json}
function Canonical($Value){ConvertTo-Json -InputObject $Value -Depth 100 -Compress}
$checks=@()
foreach($name in @('project-iam','run-api-iam','sop-bucket-iam','build-bucket-iam','runtime-secret-iam','runtime-secret-versions','service-accounts','secret-metadata','storage-buckets','firestore-rules-release','firestore-rules-source','firebase-google-provider','enabled-apis','logging-buckets','logging-sinks')){
 $same=(Canonical (Read-Evidence 'before' $name)) -ceq (Canonical (Read-Evidence 'after' $name))
 $checks+=@{name=$name;unchanged=$same}
}
$before=Read-Evidence 'before' 'run-api';$after=Read-Evidence 'after' 'run-api'
if($FrontendOnly){$checks+=@{name='cloud-run-entire-service';unchanged=((Canonical $before) -ceq (Canonical $after))}}
$beforeSpec=$before.spec.template.spec;$afterSpec=$after.spec.template.spec
if($StagingRosterWorker){
 $workerNames=@('ROSTER_STAGING_ENABLED','WORKER_AUDIENCE','WORKER_INVOKER_EMAIL')
 foreach($container in $beforeSpec.containers){
  if(@($container.env|Where-Object{$workerNames -contains $_.name}).Count){throw 'Before inventory unexpectedly contains staging roster worker environment values.'}
 }
 $approvedScheduler='promptify-scheduler@ai-transformation-510302.iam.gserviceaccount.com'
 $serviceUrl=[string]$after.status.url
 $ready=@($after.status.conditions|Where-Object{$_.type -eq 'Ready' -and $_.status -eq 'True'}).Count -eq 1
 $activeUrl=$serviceUrl -match '^https://promptify-intrepid-api-[a-z0-9-]+(?:\.[a-z0-9-]+)*\.run\.app$'
 $activeRevision=[string]$after.status.latestReadyRevisionName
 $traffic=@($after.status.traffic|Where-Object{$_.revisionName -eq $activeRevision -and $_.percent -gt 0}).Count -gt 0
 if(!$ready -or !$activeUrl -or !$activeRevision -or !$traffic){throw 'After inventory does not identify a ready active staging API URL and revision.'}
 $flag=@($afterSpec.containers|ForEach-Object{$_.env}|Where-Object{$_.name -eq 'ROSTER_STAGING_ENABLED'})
 $audience=@($afterSpec.containers|ForEach-Object{$_.env}|Where-Object{$_.name -eq 'WORKER_AUDIENCE'})
 $invoker=@($afterSpec.containers|ForEach-Object{$_.env}|Where-Object{$_.name -eq 'WORKER_INVOKER_EMAIL'})
 $workerEnvValid=$flag.Count -eq 1 -and $flag[0].value -ceq 'true' -and !$flag[0].valueFrom
 $workerEnvValid=$workerEnvValid -and $audience.Count -eq 1 -and $audience[0].value -ceq $serviceUrl -and !$audience[0].valueFrom
 $workerEnvValid=$workerEnvValid -and $invoker.Count -eq 1 -and $invoker[0].value -ceq $approvedScheduler -and !$invoker[0].valueFrom
 $checks+=@{name='staging-roster-worker-api-oidc-environment';unchanged=$workerEnvValid}
 foreach($spec in @($beforeSpec,$afterSpec)){
  foreach($container in $spec.containers){$container.env=@($container.env|Where-Object{$workerNames -notcontains $_.name})}
 }
}
if($WorkspaceSourceBindings){
 $source=@($afterSpec.containers[0].env|Where-Object{$_.name -eq 'WORKSPACE_SOURCE_BINDINGS_JSON'})
 $expected=Get-Content (Join-Path $taskRoot 'source-bindings.json') -Raw|ConvertFrom-Json
 $checks+=@{name='expected-class-workspace-source-bindings';unchanged=($source.Count -eq 1 -and (Canonical ($source[0].value|ConvertFrom-Json)) -ceq (Canonical $expected))}
 foreach($spec in @($beforeSpec,$afterSpec)){$spec.containers[0].env=@($spec.containers[0].env|Where-Object{$_.name -ne 'WORKSPACE_SOURCE_BINDINGS_JSON'})}
}
if($WorkspaceIdentity){
 $workspace=@($afterSpec.containers[0].env|Where-Object{$_.name -eq 'GOOGLE_WORKSPACE_SERVICE_ACCOUNT'})
 $checks+=@{name='approved-keyless-workspace-identity';unchanged=($workspace.Count -eq 1 -and $workspace[0].value -eq 'promptify-api@ai-transformation-510302.iam.gserviceaccount.com' -and !@($afterSpec.containers[0].env|Where-Object{$_.name -eq 'GOOGLE_SERVICE_ACCOUNT_JSON'}).Count)}
 foreach($c in $beforeSpec.containers){$c.env=@($c.env|Where-Object{$_.name -ne 'GOOGLE_WORKSPACE_SERVICE_ACCOUNT'})}
 foreach($c in $afterSpec.containers){$c.env=@($c.env|Where-Object{$_.name -ne 'GOOGLE_WORKSPACE_SERVICE_ACCOUNT'})}
}
if($AiConfiguration){
 $approved=@{AI_PROVIDER='vertex';GEMINI_MODEL='gemini-3.8-flash';VERTEX_LOCATION='global';JUDGE_STRATEGY='parallel-v1'}
 $approvedOk=($afterSpec.containers.Count -eq 1)
 foreach($name in $approved.Keys){$found=@($afterSpec.containers[0].env|Where-Object{$_.name -eq $name});if($found.Count -ne 1 -or $found[0].value -ne $approved[$name]){$approvedOk=$false}}
 if(@($afterSpec.containers[0].env|Where-Object{$_.name -eq 'GEMINI_FALLBACK_MODEL'}).Count){$approvedOk=$false}
 $checks+=@{name='approved-ai-configuration';unchanged=$approvedOk}
 foreach($c in $beforeSpec.containers){$c.env=@($c.env|Where-Object{-not $approved.ContainsKey($_.name) -and $_.name -ne 'GEMINI_FALLBACK_MODEL'})}
 foreach($c in $afterSpec.containers){$c.env=@($c.env|Where-Object{-not $approved.ContainsKey($_.name) -and $_.name -ne 'GEMINI_FALLBACK_MODEL'})}
 $traffic=@($after.status.traffic|Where-Object{$_.percent -gt 0})
 $checks+=@{name='staging-traffic-target';unchanged=($traffic.Count -eq 1 -and $traffic[0].percent -eq 100 -and $traffic[0].revisionName -eq 'promptify-intrepid-api-g38p-1019')}
}
if($ExpectedRevision){
 $traffic=@($after.status.traffic|Where-Object{$_.percent -gt 0})
 $checks+=@{name='expected-staging-revision';unchanged=($traffic.Count -eq 1 -and $traffic[0].percent -eq 100 -and $traffic[0].revisionName -eq $ExpectedRevision)}
}
foreach($c in $beforeSpec.containers){$c.image='[IMAGE CHANGE EXPECTED]'}
foreach($c in $afterSpec.containers){$c.image='[IMAGE CHANGE EXPECTED]'}
$checks+=@{name=$(if($AiConfiguration){'runtime-spec-except-image-and-approved-ai-env'}else{'runtime-spec-except-image'});unchanged=((Canonical $beforeSpec) -ceq (Canonical $afterSpec))}
$checks+=@{name='sql-attachment';unchanged=($before.spec.template.metadata.annotations.'run.googleapis.com/cloudsql-instances' -eq $after.spec.template.metadata.annotations.'run.googleapis.com/cloudsql-instances')}
$beforeSql=Read-Evidence 'before' 'sql-staging';$afterSql=Read-Evidence 'after' 'sql-staging'
$checks+=@{name='sql-settings';unchanged=((Canonical $beforeSql.settings) -ceq (Canonical $afterSql.settings))}
$beforeAuth=Read-Evidence 'before' 'firebase-auth';$afterAuth=Read-Evidence 'after' 'firebase-auth'
$checks+=@{name='firebase-authorized-domains';unchanged=((Canonical $beforeAuth.authorizedDomains) -ceq (Canonical $afterAuth.authorizedDomains))}
$checks+=@{name='default-hosting-releases';unchanged=((Canonical (Read-Evidence 'before' 'ai-transformation-510302-releases')) -ceq (Canonical (Read-Evidence 'after' 'ai-transformation-510302-releases')))}
$checks | ConvertTo-Json -Depth 30 | Set-Content (Join-Path $taskRoot 'comparison.json') -Encoding utf8
$checks | ForEach-Object {Write-Output "$($_.name): unchanged=$($_.unchanged)"}
if(@($checks | Where-Object {-not $_.unchanged}).Count){exit 1}
