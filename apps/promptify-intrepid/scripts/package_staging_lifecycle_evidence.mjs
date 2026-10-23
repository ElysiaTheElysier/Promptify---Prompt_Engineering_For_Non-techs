import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

// Fixed local scope. Never reads environment files, runtime fixtures, workbooks,
// proxy logs, or any path outside these three staging checkpoints.
const app = path.resolve(import.meta.dirname, '..');
const repo = path.resolve(app, '..', '..');
const names = ['staging-release-2026-10-21-lifecycle-resume', 'staging-release-2026-10-21-lifecycle-acceptance', 'staging-release-2026-10-21-lifecycle-ui-download'];
const roots = names.map((name) => path.join(app, 'outputs', name));
const out = roots[1];
const manifestPath = path.join(out, 'evidence-manifest.json');
const readmePath = path.join(out, 'README-evidence-inventory.md');
const zipPath = path.join(out, 'staging-lifecycle-evidence-2026-10-21.zip');
const docs = [
  'docs/STAGING_ROSTER_AND_DRIVE_FIX_REVIEW_2026-10-21.md',
  'docs/HANDOFF_STAGING_LIFECYCLE_RESUME_2026-10-21.md',
  'docs/HANDOFF_STAGING_LIFECYCLE_ORIGINALS_2026-10-21.md',
  'docs/STAGING_LIFECYCLE_LEARNER_ACCEPTANCE_2026-10-21.md',
];
const maxText = 8 * 1024 * 1024, maxImage = 16 * 1024 * 1024, maxTotal = 120 * 1024 * 1024;
const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const signedUrl = /https?:\/\/[^\s"'<>]+?(?:\?|&)(?:X-Goog-(?:Signature|Credential|Security-Token)|GoogleAccessId|Signature|sig|access_token|token)=[^\s"'<>]*/gi;
const bearer = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;
const jwt = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const provider = /\b(?:AIza[0-9A-Za-z_-]{25,}|ya29\.[0-9A-Za-z_-]{16,}|gh[pousr]_[A-Za-z0-9]{24,})\b/g;
const assignment = /(\b(?:password|client[_-]?secret|api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|private[_-]?key|cookie|session[_-]?token|signature|signed.?url)\b\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;]+)/gi;
const secretKey = /(?:password|secret|token|credential|private.?key|authorization|api.?key|cookie|signature|signed.?url)/i;
const identityKey = /(?:email|principal|service.?account|actor.?identity|member.?email|user.?email)/i;
const bannedPath = /(^|[\\/])(?:node_modules|production-exclusion-build|\.git|\.env(?:\.|$)|credentials?|secrets?|private|tokens?)(?:[\\/]|$)/i;
const bannedExt = /\.(?:xlsx?|xlsm|p12|pfx|pem|key|sqlite|db|ndjson)$/i;
const proxyLog = /(?:^|[\\/])proxy(?:-[^\\/]*)?\.log$/i;
const screenshot = /^(?:admin|learner|peer)[a-z0-9_-]*\.png$/i;
const rootFiles = new Set([
  'active-checks.json','candidate-checks.json','comparison.json','compare.log','boundaries.log','tests.log','typecheck.log','lint.log','build.log','smoke.log',
  'build-submitted.json','build.json','candidate-deploy.log','promotion.log','capture-before.log','capture-after.log','capture-acceptance-before.log','capture-acceptance-after.log','capture-ui-download-before.log',
  'hosting-before.log','hosting-after.log','hosting-acceptance-before.log','hosting-acceptance-after.log','hosting-deploy.log','hosting-deploy-dns-failure.log','hosting-deploy-upload-dns-failure.log','hosting-rest-progress.json','hosting-rest-release.json','hosting-verify.log','final-http-checks.json',
  'image.json','independent-applied-migration-review.json','independent-release-review.json','migration011-success.json','owner-postmigration-catalog.json','pre-migration-backup-status.json','sop-download-test.log','partial-candidate-check.json',
  'roster-adoption-apply.json','roster-catalog-acceptance.json','roster-catalog-after-omissions.json','roster-catalog-after.json','roster-catalog-before.json','roster-catalog-final-learner-checks.json','roster-catalog-peer-granted.json','roster-catalog-peer-revoked.json','peeraccess-sheet-readback.json',
]);
const relRepo = (p) => path.relative(repo, p).split(path.sep).join('/');
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');
const exclude = [];
const ensure = (p) => { if (!fs.existsSync(p)) throw new Error(`Required path missing: ${relRepo(p)}`); };
const archivePath = (p) => { const v = relRepo(p); if (v === '..' || v.startsWith('../') || path.posix.isAbsolute(v)) throw new Error(`Archive path escapes repo: ${p}`); return v; };

function sanitize(text) {
  return text.replace(signedUrl, '[REDACTED_SIGNED_URL]').replace(bearer, 'Bearer [REDACTED]')
    .replace(jwt, '[REDACTED_JWT]').replace(provider, '[REDACTED_PROVIDER_TOKEN]')
    .replace(assignment, '$1[REDACTED]').replace(email, '[REDACTED_EMAIL]');
}
function redact(value, key = '') {
  if (Array.isArray(value)) return value.map((item) => redact(item, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, (secretKey.test(k) || identityKey.test(k)) && v !== null ? '[REDACTED]' : redact(v, k)]));
  if (typeof value !== 'string') return value;
  let result = sanitize(value);
  if (/(?:ip.?address|ipv4)/i.test(key)) result = result.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]');
  return result;
}
function scan(text) {
  const found = [];
  if (email.test(text)) found.push('email'); email.lastIndex = 0;
  if (signedUrl.test(text)) found.push('signed URL'); signedUrl.lastIndex = 0;
  if (bearer.test(text) || jwt.test(text) || provider.test(text) || assignment.test(text)) found.push('credential/token');
  bearer.lastIndex = 0; jwt.lastIndex = 0; provider.lastIndex = 0; assignment.lastIndex = 0;
  return found;
}
function walkJson(dir, archiveBase, walkRoot = dir) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name), stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) exclude.push({ path: archivePath(file), reason: 'symlink/junction skipped' });
    else if (stat.isDirectory()) result.push(...walkJson(file, archiveBase, walkRoot));
    else if (stat.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      if (stat.size > maxText) exclude.push({ path: archivePath(file), reason: 'governance JSON exceeds size limit' });
      else result.push({ source: file, archive: path.posix.join(archiveBase, path.relative(walkRoot, file).split(path.sep).join('/')) });
    }
  }
  return result;
}
function selectFiles() {
  roots.forEach(ensure);
  const files = [];
  for (const root of roots) {
    for (const phase of ['before','after']) {
      const dir = path.join(root, phase);
      if (fs.existsSync(dir)) files.push(...walkJson(dir, path.posix.join('apps/promptify-intrepid/outputs', path.basename(root), 'redacted-governance', phase)));
    }
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const source = path.join(root, entry.name), name = entry.name;
      if ([path.basename(manifestPath),path.basename(readmePath),path.basename(zipPath)].includes(name)) continue;
      if (proxyLog.test(name)) { exclude.push({ path: archivePath(source), reason: 'proxy log excluded' }); continue; }
      if (bannedPath.test(name) || bannedExt.test(name)) { exclude.push({ path: archivePath(source), reason: 'sensitive or raw-data extension excluded' }); continue; }
      const image = screenshot.test(name);
      const authenticatedResult = /^(?:admin|learner|peer)[a-z0-9_-]*\.json$/i.test(name);
      if (!rootFiles.has(name) && !image && !authenticatedResult) continue;
      const stat = fs.lstatSync(source), limit = image ? maxImage : maxText;
      if (stat.size > limit) { exclude.push({ path: archivePath(source), reason: `exceeds ${limit} byte limit` }); continue; }
      files.push({ source, archive: archivePath(source), image });
    }
  }
  const adoptionEvidenceDir = path.join(app, 'outputs', 'staging-release-2026-10-21-lifecycle-originals', 'roster-ownership-adoption', '2026-10-21T08-56-07-013Z');
  for (const name of ['before.json', 'after.json']) {
    const source = path.join(adoptionEvidenceDir, name);
    if (fs.existsSync(source)) files.push({ source, archive: `apps/promptify-intrepid/outputs/staging-release-2026-10-21-lifecycle-originals/roster-ownership-adoption/2026-10-21T08-56-07-013Z/${name}` });
  }
  for (const doc of docs) {
    const source = path.join(repo, doc);
    if (!fs.existsSync(source)) {
      throw new Error(`Required current report missing: ${doc}`);
    } else if (fs.statSync(source).size > maxText) exclude.push({ path: doc, reason: 'report exceeds text size limit' });
    else files.push({ source, archive: archivePath(source) });
  }
  const unique = new Map();
  for (const file of files) {
    const prior = unique.get(file.archive);
    if (prior && prior.source !== file.source) throw new Error(`Duplicate archive path: ${file.archive}`);
    unique.set(file.archive, file);
  }
  return [...unique.values()].sort((a,b) => a.archive.localeCompare(b.archive));
}
function makeRecord(file) {
  const raw = fs.readFileSync(file.source);
  if (file.image) return { ...file, data: raw, redacted: false, scanner: 'synthetic-ui filename allowlist' };
  const text = raw.toString('utf8').replace(/^\uFEFF/, '');
  const clean = path.extname(file.source).toLowerCase() === '.json' ? `${JSON.stringify(redact(JSON.parse(text)), null, 2)}\n` : sanitize(text);
  const findings = scan(clean);
  if (findings.length) throw new Error(`Credential scanner blocked (${findings.join(', ')}): ${relRepo(file.source)}`);
  const data = Buffer.from(clean, 'utf8');
  return { ...file, data, redacted: data.compare(raw) !== 0, scanner: 'credential-pattern scan' };
}
function crc32(buf) { let c=0xffffffff; for (const byte of buf) { c^=byte; for (let i=0;i<8;i++) c=(c>>>1)^((c&1)?0xedb88320:0); } return (c^0xffffffff)>>>0; }
function zipBytes(items) {
  const local=[], central=[]; let offset=0;
  for (const {name,data} of items) {
    const n=Buffer.from(name.replaceAll('\\','/')), packed=zlib.deflateRawSync(data,{level:9}), crc=crc32(data), l=Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50,0); l.writeUInt16LE(20,4); l.writeUInt16LE(0x800,6); l.writeUInt16LE(8,8); l.writeUInt32LE(crc,14); l.writeUInt32LE(packed.length,18); l.writeUInt32LE(data.length,22); l.writeUInt16LE(n.length,26); local.push(l,n,packed);
    const c=Buffer.alloc(46); c.writeUInt32LE(0x02014b50,0); c.writeUInt16LE(20,4); c.writeUInt16LE(20,6); c.writeUInt16LE(0x800,8); c.writeUInt16LE(8,10); c.writeUInt32LE(crc,16); c.writeUInt32LE(packed.length,20); c.writeUInt32LE(data.length,24); c.writeUInt16LE(n.length,28); c.writeUInt32LE(offset,42); central.push(c,n); offset+=l.length+n.length+packed.length;
  }
  const cd=Buffer.concat(central), e=Buffer.alloc(22); e.writeUInt32LE(0x06054b50,0); e.writeUInt16LE(items.length,8); e.writeUInt16LE(items.length,10); e.writeUInt32LE(cd.length,12); e.writeUInt32LE(offset,16); return Buffer.concat([...local,cd,e]);
}
function comparisonSummary(records) {
  return records.filter((r)=>/\/comparison\.json$/i.test(r.archive)).map((r)=>{
    try { const value=JSON.parse(r.data.toString('utf8')), rows=Array.isArray(value)?value:(value.checks||value.results||[]); const passed=rows.filter((x)=>x?.unchanged===true||x?.passed===true||x?.ok===true).length; return {path:r.archive,total:rows.length,passed,allPassed:rows.length>0&&passed===rows.length}; }
    catch { return {path:r.archive,total:0,passed:0,allPassed:false}; }
  });
}
function verifiedUiProofPaths() {
  return ['hosting-rest-release.json','final-http-checks.json','comparison.json','learner-ui-original-download.json','learner-ui-original-download.png']
    .map((name)=>`apps/promptify-intrepid/outputs/${names[2]}/${name}`);
}
function validateUiPackageState(state, included) {
  if (state.finalState === 'OPEN') throw new Error('UI acceptance is still open.');
  if (state.finalState !== 'VERIFIED') return [];
  const missing = verifiedUiProofPaths().filter((p)=>!included.has(p));
  const afterPrefix = `apps/promptify-intrepid/outputs/${names[2]}/redacted-governance/after/`;
  if (![...included].some((p)=>p.startsWith(afterPrefix))) missing.push(`${afterPrefix}*.json`);
  return missing;
}
if (process.argv.includes('--self-test')) {
  const included = new Set(verifiedUiProofPaths());
  included.add(`apps/promptify-intrepid/outputs/${names[2]}/redacted-governance/after/manifest.json`);
  if (validateUiPackageState({ finalState: 'VERIFIED' }, included).length) throw new Error('Synthetic verified gate should pass');
  if (validateUiPackageState({ finalState: 'BLOCKED' }, new Set()).length) throw new Error('Final blocked gate should not require successful UI artifacts');
  const missing = validateUiPackageState({ finalState: 'VERIFIED' }, new Set());
  if (missing.length !== 6) throw new Error(`Expected five UI artifacts plus after inventory to be required, got ${missing.length}`);
  let openRejected = false;
  try { validateUiPackageState({ finalState: 'OPEN' }, new Set()); } catch { openRejected = true; }
  if (!openRejected) throw new Error('Open UI status must block final packaging');
  process.stdout.write('Packager self-test PASS: verified evidence gate, blocked pending state, and open-state refusal.\n');
  process.exit(0);
}
function makeReadme(manifest) {
  const rows=manifest.files.map((f)=>`| \`${f.path}\` | ${f.bytes} | \`${f.sha256}\` | ${f.redacted?'yes':'no'} |`).join('\n');
  const comps=manifest.comparisons.map((c)=>`- ${c.path}: ${c.passed}/${c.total} comparison rows marked true${c.allPassed?'':' (review differences)'}`).join('\n');
  const excluded=manifest.excluded.map((x)=>`- \`${x.path}\`: ${x.reason}`).join('\n');
  const warnings=manifest.warnings.map((x)=>`- ${x}`).join('\n');
  return `# Staging lifecycle evidence inventory — 2026-10-21\n\nThis redacted archive covers the lifecycle resume, signed learner acceptance, and UI original-download checkpoints. Source evidence remains unchanged. It records staging evidence and does not certify production readiness.\n\nReports: [roster and Drive review](../../../../docs/STAGING_ROSTER_AND_DRIVE_FIX_REVIEW_2026-10-21.md), [resume handoff](../../../../docs/HANDOFF_STAGING_LIFECYCLE_RESUME_2026-10-21.md), [originals handoff](../../../../docs/HANDOFF_STAGING_LIFECYCLE_ORIGINALS_2026-10-21.md), [learner acceptance report](../../../../docs/STAGING_LIFECYCLE_LEARNER_ACCEPTANCE_2026-10-21.md).\n\n## UI original-download status\n\n**${manifest.uiOriginalDownload.status} (${manifest.uiOriginalDownload.finalState}; complete: ${manifest.uiOriginalDownload.complete})** — ${manifest.uiOriginalDownload.detail}\n\n## Comparison files\n\n${comps||'- None selected.'}\n\nPassing scoped checks coexist with expected release, database, Hosting, and roster changes; they do not assert that all resources or rows are unchanged.\n\n## Redaction and limits\n\n${warnings}\n\n## Included files\n\n| Path | Bytes | SHA-256 of packaged copy | Redacted |\n|---|---:|---|---|\n${rows||'| (none) | 0 | — | — |'}\n\n## Excluded evidence\n\n${excluded||'- No exclusions recorded.'}\n`;
}

function uiAcceptanceStatus() {
  const report = fs.readFileSync(path.join(repo, 'docs/STAGING_LIFECYCLE_LEARNER_ACCEPTANCE_2026-10-21.md'), 'utf8');
  if (/UI original-download status:\s*VERIFIED\b/i.test(report)) return { status: 'VERIFIED', finalState: 'VERIFIED', complete: true, detail: 'Final learner acceptance report records the authenticated browser download as verified.' };
  if (/UI original-download status:\s*BLOCKED\b/i.test(report)) return { status: 'PENDING', finalState: 'BLOCKED', complete: false, detail: 'Final report records the UI download as blocked before acceptance; this package contains no claim of a successful UI download.' };
  const deployText = ['hosting-deploy.log','hosting-deploy-dns-failure.log','hosting-deploy-upload-dns-failure.log','hosting-rest-progress.json']
    .map((name) => { const file = path.join(roots[2], name); return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }).join('\n');
  if (/No such host is known|ENOTFOUND|EAI_AGAIN/i.test(deployText)) return { status: 'PENDING', finalState: 'OPEN', complete: false, detail: 'Hosting candidate/deployment evidence records a DNS or upload failure; no final hosted UI release or authenticated browser download verification is recorded.' };
  return { status: 'PENDING', finalState: 'OPEN', complete: false, detail: 'The final learner acceptance report does not yet record a verified or finally blocked UI download result.' };
}

for (const root of roots) {
  for (const leaf of ['production-exclusion-build','node_modules']) if (fs.existsSync(path.join(root,leaf))) exclude.push({path:archivePath(path.join(root,leaf))+'/',reason:`${leaf} excluded by fixed scope`});
  for (const file of fs.readdirSync(root)) if (proxyLog.test(file)) { const p=archivePath(path.join(root,file)); if(!exclude.some((x)=>x.path===p)) exclude.push({path:p,reason:'proxy log excluded'}); }
}
exclude.push(
  {path:'runtime-fixture.json',reason:'raw runtime fixture excluded'},
  {path:'source workbooks and workbook inspection dumps',reason:'raw company data excluded'},
  {path:'owner-session.* and preflight-owner.*',reason:'owner/session artifacts excluded'},
  {path:'outputs/staging-release-2026-10-21-lifecycle-originals/',reason:'only the reviewed roster adoption before/after JSON pair is included; remainder outside scope'},
);
const packageMode=process.argv.includes('--package');
const records=[];
for (const file of selectFiles()) {
  try { records.push(makeRecord(file)); }
  catch(error) { const msg=String(error?.message??error); if(!msg.startsWith('Credential scanner blocked')) throw error; exclude.push({path:archivePath(file.source),reason:'credential scanner blocked packaged copy'}); }
}
const totalBytes=records.reduce((n,r)=>n+r.data.length,0);
if(totalBytes>maxTotal) throw new Error(`Selected evidence exceeds ${maxTotal} byte cap`);
const requiredEvidence = [
  'outputs/staging-release-2026-10-21-lifecycle-resume/tests.log',
  'outputs/staging-release-2026-10-21-lifecycle-resume/typecheck.log',
  'outputs/staging-release-2026-10-21-lifecycle-resume/lint.log',
  'outputs/staging-release-2026-10-21-lifecycle-resume/build.log',
  'outputs/staging-release-2026-10-21-lifecycle-resume/smoke.log',
  'outputs/staging-release-2026-10-21-lifecycle-resume/boundaries.log',
  'outputs/staging-release-2026-10-21-lifecycle-resume/comparison.json',
  'outputs/staging-release-2026-10-21-lifecycle-resume/hosting-deploy.log',
  'outputs/staging-release-2026-10-21-lifecycle-resume/promotion.log',
  'outputs/staging-release-2026-10-21-lifecycle-resume/admin-roster-omission-final.json',
  'outputs/staging-release-2026-10-21-lifecycle-resume/learner-peer-revoked.json',
  'outputs/staging-release-2026-10-21-lifecycle-resume/learner-a-originals.json',
  'outputs/staging-release-2026-10-21-lifecycle-resume/learner-b-source-isolation.json',
  'outputs/staging-release-2026-10-21-lifecycle-acceptance/comparison.json',
  'outputs/staging-release-2026-10-21-lifecycle-acceptance/compare.log',
  'outputs/staging-release-2026-10-21-lifecycle-ui-download/hosting-before.log',
  'outputs/staging-release-2026-10-21-lifecycle-ui-download/hosting-deploy-dns-failure.log',
  'outputs/staging-release-2026-10-21-lifecycle-ui-download/hosting-deploy-upload-dns-failure.log',
  'outputs/staging-release-2026-10-21-lifecycle-ui-download/hosting-deploy.log',
  'outputs/staging-release-2026-10-21-lifecycle-ui-download/partial-candidate-check.json',
  'outputs/staging-release-2026-10-21-lifecycle-ui-download/hosting-rest-progress.json',
  'outputs/staging-release-2026-10-21-lifecycle-ui-download/boundaries.log',
  'outputs/staging-release-2026-10-21-lifecycle-ui-download/build.log',
  'outputs/staging-release-2026-10-21-lifecycle-ui-download/lint.log',
  'outputs/staging-release-2026-10-21-lifecycle-ui-download/smoke.log',
  'outputs/staging-release-2026-10-21-lifecycle-ui-download/sop-download-test.log',
  ...docs.map((doc) => doc),
  'outputs/staging-release-2026-10-21-lifecycle-originals/roster-ownership-adoption/2026-10-21T08-56-07-013Z/before.json',
  'outputs/staging-release-2026-10-21-lifecycle-originals/roster-ownership-adoption/2026-10-21T08-56-07-013Z/after.json',
];
const included = new Set(records.map((record) => record.archive));
const missing = requiredEvidence.map((p) => p.startsWith('docs/') ? p : `apps/promptify-intrepid/${p}`).filter((p) => !included.has(p));
if (packageMode) {
  for (const rootName of names) {
    for (const phase of ['before','after']) {
      if (rootName === names[2] && phase === 'after' && !fs.existsSync(path.join(roots[2], 'after'))) continue;
      const prefix = `apps/promptify-intrepid/outputs/${rootName}/redacted-governance/${phase}/`;
      if (![...included].some((p) => p.startsWith(prefix))) missing.push(`${prefix}*.json`);
    }
  }
  if (missing.length) throw new Error(`Final archive is missing required proof (possibly absent or scanner-blocked): ${missing.join(', ')}`);
}
const manifest={
  generatedAt:new Date().toISOString(),checkpointDate:'2026-10-21',scope:names.map((name)=>`outputs/${name}`),
  uiOriginalDownload:uiAcceptanceStatus(),
  warnings:[
    'Selected JSON, logs, and Markdown are redacted and rescanned for emails, signed URLs, bearer/JWT/provider tokens, and secret assignments; source files are untouched.',
    'PNG files cannot be text-scanned; only admin/learner/peer synthetic UI filename patterns are admitted.',
    'Proxy logs, credentials/session files, raw runtime fixtures, source workbooks, node_modules, production-exclusion-build, and all lifecycle-originals artifacts except the exact reviewed adoption before/after pair are excluded.',
    'Scoped comparison checks coexist with expected release and data changes; full snapshots are not asserted unchanged.',
  ],
  comparisons:comparisonSummary(records),excluded:exclude,
  files:records.map((r)=>({path:r.archive,bytes:r.data.length,sha256:hash(r.data),redacted:r.redacted,scanner:r.scanner})),
};
const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n'), readmeBytes=Buffer.from(makeReadme(manifest));
fs.writeFileSync(manifestPath,manifestBytes); fs.writeFileSync(readmePath,readmeBytes);
process.stdout.write(`Evidence inventory ready: ${records.length} files, ${totalBytes} bytes.\n`);
if(packageMode) {
  missing.push(...validateUiPackageState(manifest.uiOriginalDownload, included));
  if(missing.length) throw new Error(`Final archive is missing required proof (possibly absent or scanner-blocked): ${missing.join(', ')}`);
  const items=records.map((r)=>({name:r.archive,data:r.data}));
  items.push({name:archivePath(manifestPath),data:manifestBytes},{name:archivePath(readmePath),data:readmeBytes});
  const archive=zipBytes(items); fs.writeFileSync(zipPath,archive);
  process.stdout.write(`ZIP written: ${zipPath}\nSHA-256: ${hash(archive)}\n`);
} else process.stdout.write('Inventory only. Pass --package after final acceptance documentation is present to write the ZIP.\n');
