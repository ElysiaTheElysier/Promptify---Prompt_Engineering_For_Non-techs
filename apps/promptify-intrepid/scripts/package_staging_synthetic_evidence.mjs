import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

// Fixed to the 2026-10-20/21 synthetic staging evidence. This script never
// reads environment files or packages runtime fixture identities/workbooks.
const appRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const releaseRel = 'outputs/staging-release-2026-10-20-synthetic-workspace';
const fixtureRel = 'outputs/staging-synthetic-workspace-2026-10-20';
const releaseRoot = path.join(appRoot, releaseRel);
const fixtureRoot = path.join(appRoot, fixtureRel);
const outManifest = path.join(releaseRoot, 'evidence-manifest.json');
const outReadme = path.join(releaseRoot, 'README-evidence-inventory.md');
const outZip = path.join(releaseRoot, 'staging-synthetic-evidence-2026-10-20.zip');
const docsReview = 'docs/STAGING_SYNTHETIC_INTEGRATION_REVIEW_2026-10-20.md';
const reportDocs = [
  'docs/STAGING_SYNTHETIC_WORKSPACE_2026-10-21.md',
  'docs/HANDOFF_UI_STAGING_2026-10-20.md',
];
const independentReviewRel = 'outputs/staging-synthetic-integration-review-2026-10-20';

const evidenceNames = [
  'active-checks.json', 'candidate-checks.json', 'comparison.json', 'compare.log',
  'tests.log', 'typecheck.log', 'lint.log', 'build.log', 'smoke.log',
  'production-exclusion.json', 'synthetic-workspace-final-http-checks.json',
  'roster-live-readonly-reconciliation.json', 'admin-roster-mutations.json',
  'admin-initial-before-folder-read.json', 'admin-initial-sop-workflow.json',
  'admin-initial-sop-workflow.png', 'source-bindings-flags.json', 'boundaries.log',
  'learner-company-a.json', 'learner-company-a.png', 'learner-company-b.json', 'learner-company-b.png',
  'candidate-deploy.log', 'promotion.log', 'capture-before.log', 'capture-after.log',
  'hosting-before.log', 'hosting-after.log', 'hosting-deploy.log', 'hosting-verify.log', 'source-references.json',
];
const bannedSegment = /(^|[\\/])(?:node_modules|production-exclusion-build|\.git|\.env(?:\.|$)|credentials?|secrets?|private|tokens?)(?:[\\/]|$)/i;
const bannedExtension = /\.(?:xlsx?|xlsm|p12|pfx|pem|key|sqlite|db)$/i;
const suspiciousContent = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:AIza[0-9A-Za-z_-]{30,}|ya29\.[0-9A-Za-z_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,})\b|["']?(?:password|client[_-]?secret|api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|private[_-]?key)["']?\s*[:=]\s*["']?(?!\[REDACTED\])[^\s"']{8,}/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const redactKeyPattern = /(?:password|secret|token|credential|private.?key|authorization|api.?key)/i;
const addressKeyPattern = /(?:email|principal|service.?account|member|identity|ip.?address|ipv4)/i;

function assertExists(p) {
  if (!fs.existsSync(p)) throw new Error(`Required evidence path missing: ${path.relative(appRoot, p)}`);
}
function hash(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function json(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function rel(p) { return path.relative(appRoot, p).split(path.sep).join('/'); }
function archivePath(p) {
  const value = path.relative(repoRoot, p).split(path.sep).join('/');
  if (value === '..' || value.startsWith('../') || path.posix.isAbsolute(value)) throw new Error(`Archive path escapes repository: ${p}`);
  return value;
}

function visitRegularFiles(dir, predicate, walkRoot = dir) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    const stat = fs.lstatSync(p);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) found.push(...visitRegularFiles(p, predicate, walkRoot));
    else if (stat.isFile() && predicate(p)) found.push(p);
  }
  return found;
}

function redactValue(value, key = '') {
  if (Array.isArray(value)) return value.map((item) => redactValue(item, key));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [
      childKey,
      redactKeyPattern.test(childKey) && typeof child === 'string' && child !== '[REDACTED]'
        ? '[REDACTED]'
        : redactValue(child, childKey),
    ]));
  }
  if (typeof value !== 'string') return value;
  let text = value.replace(emailPattern, '[REDACTED_EMAIL]');
  if (addressKeyPattern.test(key)) text = text.replace(ipPattern, '[REDACTED_IP]');
  return text;
}

function archiveRecord(sourcePath, archiveName = archivePath(sourcePath), redactJson = false) {
  const raw = fs.readFileSync(sourcePath);
  const rawText = raw.toString('utf8');
  if (suspiciousContent.test(rawText)) throw new Error(`Credential scanner blocked source content: ${rel(sourcePath)}`);
  let data = raw;
  let redacted = false;
  if (redactJson && path.extname(sourcePath).toLowerCase() === '.json') {
    data = Buffer.from(JSON.stringify(redactValue(JSON.parse(rawText), ''), null, 2) + '\n');
    redacted = data.compare(raw) !== 0;
  } else if (redactJson && /\.(?:md|log|txt)$/i.test(sourcePath)) {
    const sanitized = rawText.replace(emailPattern, '[REDACTED_EMAIL]');
    data = Buffer.from(sanitized);
    redacted = sanitized !== rawText;
  }
  if (suspiciousContent.test(data.toString('utf8'))) throw new Error(`Credential scanner blocked packaged content: ${archiveName}`);
  return { sourcePath, path: archiveName, data, redacted };
}

function safeFiles() {
  assertExists(releaseRoot);
  assertExists(fixtureRoot);
  const files = [];
  const excludedFiles = [
    { path: `${releaseRel}/production-exclusion-build/`, reason: 'production-mode exclusion build' },
    { path: `${fixtureRel}/node_modules/`, reason: 'node_modules symlink/junction' },
    { path: `${releaseRel}/runtime-fixture.json`, reason: 'contains runtime tester email fields; sanitized source references are included instead' },
  ];
  for (const name of evidenceNames) {
    const p = path.join(releaseRoot, name);
    if (fs.existsSync(p)) files.push(p);
  }
  const allFixtureFiles = visitRegularFiles(fixtureRoot, () => true);
  for (const p of allFixtureFiles) {
    if (bannedExtension.test(p)) excludedFiles.push({ path: archivePath(p), reason: 'raw company workbook' });
    else if (/\.inspect\.ndjson$/i.test(p)) excludedFiles.push({ path: archivePath(p), reason: 'raw workbook inspection dump' });
    else if (/\.(?:json|csv|txt|png|md|mjs)$/i.test(p) && !bannedSegment.test(rel(p))) files.push(p);
  }
  for (const phase of ['before', 'after']) {
    const snapshots = path.join(releaseRoot, phase);
    files.push(...visitRegularFiles(snapshots, (p) => /\.json$/i.test(p) && !bannedSegment.test(rel(p)) && !bannedExtension.test(p)));
  }
  const reviewerOut = path.join(appRoot, independentReviewRel);
  files.push(...visitRegularFiles(reviewerOut, (p) => /\.json$/i.test(p) && !bannedSegment.test(rel(p)) && !bannedExtension.test(p)));
  const reviewPath = path.join(repoRoot, docsReview);
  if (fs.existsSync(reviewPath)) files.push(reviewPath);
  for (const doc of reportDocs) {
    const p = path.join(repoRoot, doc);
    if (fs.existsSync(p)) files.push(p);
  }
  const selected = [...new Set(files)].filter((p) => {
    const relative = rel(p);
    return !bannedSegment.test(relative) && !bannedExtension.test(p) && !p.startsWith(releaseRoot + path.sep + 'production-exclusion-build' + path.sep);
  }).sort((a, b) => rel(a).localeCompare(rel(b)));
  return { selected, excludedFiles };
}

function checkLogEvidence() {
  const read = (name) => fs.readFileSync(path.join(releaseRoot, name), 'utf8');
  const tests = read('tests.log');
  const lint = read('lint.log');
  const build = read('build.log');
  const smoke = read('smoke.log');
  const comparison = json(path.join(releaseRoot, 'comparison.json'));
  const productionExclusion = json(path.join(releaseRoot, 'production-exclusion.json'));
  const independent = json(path.join(appRoot, independentReviewRel, 'final-independent-evidence-summary.json'));
  const learnerA = json(path.join(releaseRoot, 'learner-company-a.json'));
  const learnerB = json(path.join(releaseRoot, 'learner-company-b.json'));
  const beforeResources = json(path.join(releaseRoot, 'before', 'asset-resource-index.json'));
  const afterResources = json(path.join(releaseRoot, 'after', 'asset-resource-index.json'));
  const beforeReleases = json(path.join(releaseRoot, 'before', 'ai-transformation-510302-intrepid-staging-releases.json'));
  const afterReleases = json(path.join(releaseRoot, 'after', 'ai-transformation-510302-intrepid-staging-releases.json'));
  const beforeNamesOnDisk = new Set(fs.readdirSync(path.join(releaseRoot, 'before')));
  const afterNamesOnDisk = new Set(fs.readdirSync(path.join(releaseRoot, 'after')));
  const snapshotAddedFiles = [...afterNamesOnDisk].filter((name) => !beforeNamesOnDisk.has(name)).sort();
  const snapshotRemovedFiles = [...beforeNamesOnDisk].filter((name) => !afterNamesOnDisk.has(name)).sort();
  const snapshotChangedFiles = [...beforeNamesOnDisk].filter((name) => afterNamesOnDisk.has(name) && fs.statSync(path.join(releaseRoot, 'before', name)).isFile() && fs.statSync(path.join(releaseRoot, 'after', name)).isFile() && hash(fs.readFileSync(path.join(releaseRoot, 'before', name))) !== hash(fs.readFileSync(path.join(releaseRoot, 'after', name)))).sort();
  const resourceName = (item) => item.name ?? item.resourceName ?? '';
  const beforeNames = new Set(beforeResources.map(resourceName));
  const addedResources = afterResources.map(resourceName).filter((name) => name && !beforeNames.has(name));
  const newWorkspaceRevision = addedResources.includes('//run.googleapis.com/projects/ai-transformation-510302/locations/asia-southeast1/revisions/promptify-intrepid-api-ws-1020');
  const hostingDeploy = read('hosting-deploy.log');
  const promotion = read('promotion.log');
  const afterHostingVersionRecorded = JSON.stringify(afterReleases).includes('d910167f87b4a514');
  const allLearnerRowsPass = [learnerA, learnerB].every((result) => Array.isArray(result.rows) && result.rows.length === 2 && result.rows.every((row) => row.ok === true));
  const learnerIsolationPass = [learnerA, learnerB].every((result) => result.rows.some((row) => row.name === 'Learner cannot read foreign company class' && row.details?.status === 403) && result.rows.some((row) => row.name === 'Actual learner source search and citation' && row.details?.resultCount > 0 && row.details?.foreignCanary === false));
  const passCount = [...tests.matchAll(/^promptify-intrepid .+: PASS$/gm)].length;
  const summary = {
    offlineTests: { passed: passCount, summary: /49\/49 passed; live tests excluded by allowlist\./.test(tests) ? '49/49 passed; live tests excluded by allowlist.' : null },
    typecheck: /tsc --noEmit/.test(read('typecheck.log')) && !/error TS\d+/.test(read('typecheck.log')) ? 'PASS' : 'unconfirmed',
    lint: /Architecture PASS:/.test(lint) && /0 errors, 1 warnings/.test(lint) ? 'PASS; one existing circular dependency warning' : 'unconfirmed',
    stagingBuild: /built in [\d.]+s/.test(build) ? 'PASS' : 'unconfirmed',
    localSmoke: /dev\/API smoke PASS/.test(smoke) ? 'PASS' : 'unconfirmed',
    scopedGovernanceChecksPass: Array.isArray(comparison) && comparison.length === 22 && comparison.every((entry) => entry.unchanged === true),
    verifiedExpectedDeltas: {
      workspaceRevisionAdded: newWorkspaceRevision && /100% promptify-intrepid-api-ws-1020/.test(promotion),
      stagingHostingReleaseRecorded: afterHostingVersionRecorded && /Released staging Hosting sites\/ai-transformation-510302-intrepid-staging\/versions\/d910167f87b4a514/.test(hostingDeploy),
      newAssetResources: addedResources,
      changedSnapshotFiles: snapshotChangedFiles,
      addedSnapshotFiles: snapshotAddedFiles,
      removedSnapshotFiles: snapshotRemovedFiles,
      cloudBuildBucket: (() => {
        const buckets = json(path.join(releaseRoot, 'after', 'storage-buckets.json'));
        const bucket = buckets.find((item) => item.name === 'ai-transformation-510302_cloudbuild');
        return bucket ? { observed: true, publicAccessPrevention: bucket.public_access_prevention, uniformBucketLevelAccess: bucket.uniform_bucket_level_access } : { observed: false };
      })(),
      scopeCaveat: 'The 22 scoped governance checks pass. Full before/after snapshots include the new workspace revision and Hosting release, plus recorded metadata/resource deltas; they are not identical.',
    },
    productionQaPagesExcluded: productionExclusion.accessPagePresent === false && productionExclusion.workspacePagePresent === false,
    learnerResults: {
      bothCompanyResultsPresent: allLearnerRowsPass,
      foreignClassDeniedAndOwnCanariesOnly: learnerIsolationPass,
      independentReviewAcceptance: independent.boundedDrivePublicationAndLearnerAcceptance === 'PASS',
      productionReadiness: independent.productionReadiness,
      knownLiveOmissionFailures: independent.liveOmissionFailures,
    },
  };
  if (summary.offlineTests.passed !== 49 || !summary.offlineTests.summary || summary.typecheck !== 'PASS' || !summary.lint.startsWith('PASS') || summary.stagingBuild !== 'PASS' || summary.localSmoke !== 'PASS' || !summary.scopedGovernanceChecksPass || !summary.verifiedExpectedDeltas.workspaceRevisionAdded || !summary.verifiedExpectedDeltas.stagingHostingReleaseRecorded || !summary.productionQaPagesExcluded || !summary.learnerResults.bothCompanyResultsPresent || !summary.learnerResults.foreignClassDeniedAndOwnCanariesOnly || !summary.learnerResults.independentReviewAcceptance) {
    throw new Error(`Preflight evidence did not match expected 2026-10-20 state: ${JSON.stringify(summary)}`);
  }
  return summary;
}

function buildReferenceIndex() {
  const runtime = json(path.join(releaseRoot, 'runtime-fixture.json'));
  const source = json(path.join(fixtureRoot, 'manifest.json'));
  const companies = runtime.companies.map((company, index) => {
    const sourceOrg = source.organizations[index];
    return {
      company: company.company,
      department: company.department,
      sourceFixtureId: sourceOrg.id,
      syntheticClassCode: company.code,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${company.sheetId}/edit`,
      folderUrl: `https://drive.google.com/drive/folders/${company.folderId}`,
      files: company.files.map((fileId) => ({ id: fileId, url: `https://drive.google.com/file/d/${fileId}/view` })),
      canaries: company.canaries,
    };
  });
  return {
    asOf: '2026-10-20',
    note: 'Fictional synthetic QA references. Runtime tester email fields and runtime fixture JSON are intentionally omitted.',
    companies,
    sourceFixtureManifest: `${fixtureRel}/manifest.json`,
    review: docsReview,
  };
}

function inventoryMarkdown(summary, refs, entries) {
  const companyRows = refs.companies.map((c) => [
    `| ${c.company} | [Native Sheet](${c.sheetUrl}) | [Drive folder](${c.folderUrl}) | ${c.files.map((f, i) => `[SOP ${i + 1}](${f.url})`).join(', ')} |`,
  ].join('')).join('\n');
  const files = entries.map((e) => `- \`${e.path}\` (${e.bytes} bytes, SHA-256 \`${e.sha256}\`)`).join('\n');
  return `# Synthetic staging evidence inventory\n\n` +
    `Prepared for the 2026-10-20/21 synthetic Workspace checkpoint. The source review is [STAGING_SYNTHETIC_INTEGRATION_REVIEW_2026-10-20.md](../../../../${docsReview}); the signed-in run report is [STAGING_SYNTHETIC_WORKSPACE_2026-10-21.md](../../../../docs/STAGING_SYNTHETIC_WORKSPACE_2026-10-21.md), with a [staging handoff](../../../../docs/HANDOFF_UI_STAGING_2026-10-20.md).\n\n` +
    `All company names, classes, roster rows, departments, locations, SOP text and canaries in the source fixture are fictional. The two Sheet copies contain staging QA data; this inventory links to them for authorized reviewers.\n\n` +
    `| Fictional company | Native Sheet | Drive folder | Bound SOP files |\n|---|---|---|---|\n${companyRows}\n\n` +
    `## Local preflight evidence\n\n` +
    `- Offline tests: **${summary.offlineTests.passed}/49 passed**; the live tests were excluded by the repository allowlist.\n` +
    `- Typecheck: **${summary.typecheck}**.\n` +
    `- Lint: **${summary.lint}**.\n` +
    `- Staging build: **${summary.stagingBuild}**; local smoke: **${summary.localSmoke}**.\n` +
    `- Scoped governance comparison: **${summary.scopedGovernanceChecksPass ? '22/22 selected checks pass' : 'review required'}**.\n` +
    `- Verified release deltas: **${summary.verifiedExpectedDeltas.workspaceRevisionAdded ? 'Cloud Run workspace revision added and promoted to 100%' : 'review required'}; ${summary.verifiedExpectedDeltas.stagingHostingReleaseRecorded ? 'new staging Hosting version recorded' : 'Hosting release unconfirmed'}**. The full inventory changed in ${summary.verifiedExpectedDeltas.changedSnapshotFiles.length} existing snapshot files; it also records ${summary.verifiedExpectedDeltas.addedSnapshotFiles.length} added and ${summary.verifiedExpectedDeltas.removedSnapshotFiles.length} removed file(s). The scoped comparator does not mean every resource was unchanged.\n` +
    `- Cloud Build bucket observed: **${summary.verifiedExpectedDeltas.cloudBuildBucket.observed ? `public access prevention ${summary.verifiedExpectedDeltas.cloudBuildBucket.publicAccessPrevention}; uniform bucket access ${summary.verifiedExpectedDeltas.cloudBuildBucket.uniformBucketLevelAccess}` : 'not found'}**. This system bucket is called out in the review as a deployment side effect.\n` +
    `- Learner evidence: **${summary.learnerResults.bothCompanyResultsPresent && summary.learnerResults.foreignClassDeniedAndOwnCanariesOnly ? 'both companies accepted; foreign-class probes denied and each learner received own-company citations only' : 'review required'}**.\n` +
    `- Independent reviewer: **${summary.learnerResults.independentReviewAcceptance ? 'bounded publication and learner acceptance pass' : 'review required'}**; production readiness is **${summary.learnerResults.productionReadiness}**; live omission failures: **${summary.learnerResults.knownLiveOmissionFailures}**.\n` +
    `- Production-mode QA exclusion: **${summary.productionQaPagesExcluded ? 'both staging QA pages absent' : 'review required'}**.\n\n` +
    `The learner results are authenticated staging evidence. They do not establish production readiness. Read the reviewer output and report for remaining gates and limits.\n\n` +
    `## Included evidence\n\n${files}\n\n` +
    `Governance before/after JSON, independent reviewer JSON, release JSON/logs and report/review documents are recursively included as redacted copies; source snapshots are left untouched. The requested learner screenshots are preserved as supplied. Runtime fixture tester addresses, generated XLSX workbooks, inspection dumps, environment files, credentials, node_modules, symlink/junction targets and the production-exclusion build directory are excluded. Individual exclusions and reasons are recorded in the manifest.\n`;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zipBytes(items) {
  const local = [], central = [];
  let offset = 0;
  for (const { name, data } of items) {
    const n = Buffer.from(name.replaceAll('\\', '/'));
    const packed = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(0x800, 6);
    l.writeUInt16LE(8, 8); l.writeUInt32LE(crc, 14); l.writeUInt32LE(packed.length, 18); l.writeUInt32LE(data.length, 22); l.writeUInt16LE(n.length, 26);
    local.push(l, n, packed);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x800, 8);
    c.writeUInt16LE(8, 10); c.writeUInt32LE(crc, 16); c.writeUInt32LE(packed.length, 20); c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, n);
    offset += l.length + n.length + packed.length;
  }
  const centralBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(items.length, 8); end.writeUInt16LE(items.length, 10);
  end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBytes, end]);
}

assertExists(path.join(releaseRoot, 'runtime-fixture.json'));
const logSummary = checkLogEvidence();
const references = buildReferenceIndex();
const safeReferences = Buffer.from(JSON.stringify(references, null, 2) + '\n');
const referencesPath = path.join(releaseRoot, 'source-references.json');
fs.writeFileSync(referencesPath, safeReferences);
const { selected: files, excludedFiles } = safeFiles();
const records = [];
for (const p of files) {
  const isGovernanceSnapshot = p.startsWith(path.join(releaseRoot, 'before') + path.sep) || p.startsWith(path.join(releaseRoot, 'after') + path.sep);
  const isIndependentReview = p.startsWith(path.join(appRoot, independentReviewRel) + path.sep);
  const isReportDoc = reportDocs.some((doc) => p === path.join(repoRoot, doc)) || p === path.join(repoRoot, docsReview);
  const redact = isGovernanceSnapshot || isIndependentReview || isReportDoc || p.startsWith(releaseRoot + path.sep);
  const archiveName = isGovernanceSnapshot
    ? archivePath(p).replace(`${releaseRel}/${path.basename(path.dirname(p))}/`, `${releaseRel}/redacted-governance/${path.basename(path.dirname(p))}/`)
    : archivePath(p);
  try { records.push(archiveRecord(p, archiveName, redact)); }
  catch (error) {
    const message = String(error?.message ?? error);
    if (!message.startsWith('Credential scanner blocked')) throw error;
    excludedFiles.push({ path: archivePath(p), reason: 'credential scanner blocked content' });
  }
}
const entries = records.map(({ path: entryPath, data, redacted }) => ({ path: entryPath, bytes: data.length, sha256: hash(data), redacted }));
const manifest = {
  generatedAt: new Date().toISOString(),
  checkpointDate: '2026-10-20/21',
  scope: 'Synthetic staging evidence with two signed-in learner acceptance probes; production readiness remains blocked.',
  preflight: logSummary,
  excluded: ['production-exclusion-build/', 'node_modules/', 'symlinks and junctions', '*.xlsx and raw workbook inspection dumps', 'environment files and credentials', 'runtime-fixture.json tester addresses'],
  redaction: 'Governance snapshot JSON, independent-review JSON, app release JSON/logs, and report/review documents are scanned for credential patterns and email addresses are redacted in packaged copies. Original source snapshots are untouched.',
  excludedFiles,
  files: entries,
};
const readme = Buffer.from(inventoryMarkdown(logSummary, references, entries));
fs.writeFileSync(outManifest, JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(outReadme, readme);
process.stdout.write(`Preflight ready: ${entries.length} safe evidence files indexed.\n${outReadme}\n`);

if (process.argv.includes('--package')) {
  if (!process.argv.includes('--learner-results-ready')) {
    throw new Error('Final archive is gated. Re-run with --learner-results-ready only after the parent confirms learner results are ready.');
  }
  for (const required of [...reportDocs, docsReview]) assertExists(path.join(repoRoot, required));
  for (const required of ['learner-company-a.json', 'learner-company-a.png', 'learner-company-b.json', 'learner-company-b.png', 'boundaries.log']) assertExists(path.join(releaseRoot, required));
  assertExists(path.join(appRoot, independentReviewRel, 'final-independent-evidence-summary.json'));
  const zipItems = records.map(({ path: name, data }) => ({ name, data }));
  zipItems.push({ name: archivePath(outManifest), data: Buffer.from(JSON.stringify(manifest, null, 2) + '\n') });
  zipItems.push({ name: archivePath(outReadme), data: readme });
  fs.writeFileSync(outZip, zipBytes(zipItems));
  process.stdout.write(`Archive written: ${outZip}\n`);
} else {
  process.stdout.write('No archive created. Pass --package --learner-results-ready after explicit readiness notification.\n');
}
