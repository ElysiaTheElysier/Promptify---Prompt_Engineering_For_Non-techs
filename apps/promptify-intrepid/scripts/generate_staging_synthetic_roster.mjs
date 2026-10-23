import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, '../outputs/staging-synthetic-workspace-2026-10-20');
const marker = 'SYNTHETIC QA FIXTURE - NOT A REAL COMPANY';
const headers = [
  'Name', 'Code', 'CountryRegion', 'CountryStatus',
  'DepartmentID', 'DepartmentName', 'DepartmentCode', 'DepartmentStatus',
  'Email', 'UserID', 'FullName', 'Country', 'Department', 'UserStatus',
  'HireDate', 'ManagerEmail', 'AssetID', 'AssetCode', 'AssetTitle', 'Department',
  'AccessStatus', 'GoogleFileID', 'DirectURL', 'FileType', 'Version', 'Owner',
  'ReviewDate', 'AssetStatus', 'Notes', 'UpdatedAt', 'Source', 'SyntheticMarker',
];

const organizations = [
  {
    id: 'synthetic-company-01', company: 'Northstar Paperworks (fictional)',
    classId: 'synthetic-class-northstar-ops', department: 'Northstar Operations',
    region: 'Northstar City (fictional)', country: 'ZZ',
    users: [
      { email: 'learner01@northstar.example.test', name: 'Ari Sample' },
      { email: 'learner02@northstar.example.test', name: 'Bea Example' },
      { email: 'learner03@northstar.example.test', name: 'Cory Fiction' },
      { email: 'learner04@northstar.example.test', name: 'Drew Synthetic' },
    ],
    sops: [
      { id: 'SYN-NORTH-OPS-001', title: 'Synthetic Intake Checklist', file: 'synthetic-intake-checklist.txt', canary: 'NORTHSTAR-CANARY-ALPHA-204' },
      { id: 'SYN-NORTH-OPS-002', title: 'Synthetic Escalation Steps', file: 'synthetic-escalation-steps.txt', canary: 'NORTHSTAR-CANARY-BRAVO-517' },
    ],
  },
  {
    id: 'synthetic-company-02', company: 'Juniper Kiteworks (fictional)',
    classId: 'synthetic-class-juniper-support', department: 'Juniper Customer Success',
    region: 'Juniper Harbor (fictional)', country: 'YY',
    users: [
      { email: 'learner01@juniper.example.test', name: 'Emi Sample' },
      { email: 'learner02@juniper.example.test', name: 'Finn Example' },
      { email: 'learner03@juniper.example.test', name: 'Gray Fiction' },
      { email: 'learner04@juniper.example.test', name: 'Hal Synthetic' },
    ],
    sops: [
      { id: 'SYN-JUNIPER-CS-001', title: 'Synthetic Case Handoff', file: 'synthetic-case-handoff.txt', canary: 'JUNIPER-CANARY-CHARLIE-631' },
      { id: 'SYN-JUNIPER-CS-002', title: 'Synthetic Follow-up Routine', file: 'synthetic-follow-up-routine.txt', canary: 'JUNIPER-CANARY-DELTA-842' },
    ],
  },
];

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}
function csv(rows) { return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'; }
function row() { return Array(headers.length).fill(''); }
function snapshotRows(org, users) {
  const out = [headers];
  const country = row(); country[0] = org.region; country[1] = org.country; country[2] = 'Fictional'; country[3] = 'Synthetic'; out.push(country);
  const department = row(); department[4] = `${org.id}-department`; department[5] = org.department; department[6] = org.id.toUpperCase(); department[7] = 'Synthetic'; out.push(department);
  users.forEach((user, i) => {
    const r = row(); r[8] = user.email; r[9] = `${org.id}-user-${i + 1}`; r[10] = user.name;
    r[11] = org.country; r[12] = org.department; r[13] = 'Synthetic'; r[14] = '2099-01-01';
    r[31] = marker; out.push(r);
  });
  org.sops.forEach((sop) => {
    const r = row(); r[16] = sop.id; r[17] = sop.id; r[18] = sop.title; r[19] = org.department;
    // PendingUpload intentionally excludes unbound files until the parent creates/uploads the staging Drive copy.
    r[20] = 'PendingUpload'; r[23] = 'TXT'; r[24] = '1.0'; r[27] = 'Synthetic';
    r[28] = `${marker}; upload matching local SOP text file before enabling access.`; r[30] = 'synthetic-fixture'; r[31] = marker;
    out.push(r);
  });
  return out;
}
function write(rel, content) {
  const target = path.join(output, rel); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content, 'utf8');
}

fs.mkdirSync(output, { recursive: true });
const manifest = {
  title: 'Synthetic Workspace and Roster QA Fixtures', date: '2026-10-20', marker,
  privacy: 'All organizations, names, emails, classes, departments, IDs, places, SOPs, and canaries are fictional. example.test addresses are reserved examples; do not create/import authentication identities from them.',
  tableV2: { tab: 'Table', range: 'A1:AF2002', columnCount: 32, headers, semantics: 'Company-specific Tablev2 fixture; only two reference rows, roster rows, and SOP rows are populated. SOPs remain PendingUpload until the authorized staging operator uploads the matching text file and fills GoogleFileID/DirectURL.' },
  xlsx: { generatedBy: 'build_synthetic_workbooks.mjs', tabOrder: ['Table', 'Add', 'Update', 'Omission'], meaning: 'Table is the initial import snapshot. Add, Update, and Omission are later independent snapshots for QA and should not be imported as simultaneous roster sources.' },
  organizations: [],
  implementationNotes: [
    'Department-scoped Table parsing is validated against apps/promptify-intrepid/src/services/rosterTableService.ts.',
    'The import function is additive/upsert-only: product_import_roster inserts active enrollment when absent and updates product_roster_profiles country/department. Omitted users are not de-enrolled or revoked.',
    'Existing users keep their current users.full_name because the insert uses ON CONFLICT(email) DO NOTHING; profile name changes in a later roster snapshot are therefore not applied by this function.',
    'The worker sync replay is idempotent by request ID and returns its stored result for the same request payload.',
    'Do not apply removal snapshots as a test of access revocation. Confirm the user remains enrolled, then request an explicit lifecycle decision before any separate deprovisioning action.',
  ],
};

for (const org of organizations) {
  const base = `companies/${org.id}`;
  const initial = org.users.slice(0, 3);
  const added = org.users.slice(0, 4);
  const updated = org.users.slice(0, 4).map((u, i) => i === 1 ? { ...u, name: `${u.name} (updated roster value)` } : u);
  const removal = org.users.slice(0, 3); // learner04 omitted from this snapshot; no implied revocation.
  const snapshots = [
    ['initial', initial, 'Baseline: 3 users; 2 SOP rows pending upload.'],
    ['add-one', added, 'Add learner04: expected parser rows 4; sync import processed 4.'],
    ['update-one', updated, 'Change learner02 FullName text only. Existing product_import_roster does not update users.full_name on conflict; verify this limitation.'],
    ['omit-one-removal-canary', removal, 'learner04 is omitted from the latest roster snapshot. Current import does not revoke or deactivate existing enrollment; verify access remains until an explicit lifecycle action.'],
  ];
  for (const [name, users, purpose] of snapshots) {
    const dir = `${base}/snapshots/${name}`;
    const values = snapshotRows(org, users);
    if (values.some(cells => cells.length !== 32)) throw new Error(`${org.id}/${name}: Table row is not 32 columns`);
    const emailRows = values.slice(1).filter(cells => cells[8] || cells[11] || cells[12]);
    if (emailRows.length !== users.length || emailRows.some(cells => cells[12] !== org.department || cells[11] !== org.country)) throw new Error(`${org.id}/${name}: roster scope/count mismatch`);
    const assetRows = values.slice(1).filter(cells => cells[16] || cells[18] || cells[19]);
    if (assetRows.length !== 2 || assetRows.some(cells => cells[20] !== 'PendingUpload' || cells[21] || cells[22])) throw new Error(`${org.id}/${name}: SOP staging rows must remain pending and unbound`);
    write(`${dir}/Table.csv`, csv(values));
    write(`${dir}/Table.json`, JSON.stringify({ marker, companyId: org.id, company: org.company, classId: org.classId, selectedDepartment: org.department, tab: 'Table', range: 'A1:AF2002', purpose, values }, null, 2) + '\n');
    write(`${dir}/roster-upload.csv`, csv([['Email', 'Full Name', 'Country', 'Department'], ...users.map(u => [u.email, u.name, org.country, org.department])]));
    write(`${dir}/roster-upload.json`, JSON.stringify(users.map(u => ({ email: u.email, fullName: u.name, country: org.country, department: org.department })), null, 2) + '\n');
  }
  for (const sop of org.sops) {
    const body = `${marker}\n${org.company}\nDepartment: ${org.department}\nDocument: ${sop.title}\nFixture canary: ${sop.canary}\n\nPurpose\nThis fictional procedure exists only to check Drive ingestion, extraction, indexing, retrieval, and company/class isolation in a staging workspace. It is not an operational instruction.\n\nSteps\n1. Open the synthetic request record and confirm its reference uses the matching company prefix.\n2. Record the request category and current state in the staging-only checklist.\n3. If a required field is missing, pause and return the synthetic record for completion.\n4. Route an exception to the fictional department owner listed in the same synthetic class.\n5. Confirm the final status and retain the canary with the extracted text for QA.\n\nExpected extraction facts\n- Company: ${org.company}\n- Department: ${org.department}\n- Canary: ${sop.canary}\n- Required sequence: verify prefix, check required fields, route exceptions, confirm final status.\n`;
    write(`${base}/sops/${sop.file}`, body);
  }
  manifest.organizations.push({ id: org.id, company: org.company, classId: org.classId, selectedDepartment: org.department, country: org.country, users: { initial: 3, afterAdd: 4, afterUpdate: 4, afterOmission: 3 }, rosterEmails: org.users.map(u => u.email), sopFiles: org.sops.map(s => ({ file: `${base}/sops/${s.file}`, title: s.title, assetId: s.id, canary: s.canary, expectedExtractedFacts: [`company=${org.company}`, `department=${org.department}`, `canary=${s.canary}`, 'sequence=verify prefix > check required fields > route exceptions > confirm final status'] })) });
}

write('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
write('README.md', `# ${manifest.title}\n\n${marker}. ${manifest.privacy}\n\n## Files and intended use\n\nEach company has four Tablev2 snapshots (initial, add one, update one, and an omission/removal canary), plus matching roster-only CSV/JSON upload files. Each company's Excel workbook has tabs \`Table\`, \`Add\`, \`Update\`, and \`Omission\` in that order. \`Table\` is the initial import snapshot with the exact 32-column schema; the remaining tabs are independent snapshots for sequential QA and must not be imported as simultaneous roster sources. The CSV file for each snapshot is also available for Sheet import. Upload each SOP text file into that company's isolated Drive folder, then replace the pending asset binding with its real staging file ID/URL. Do not copy rows across companies.\n\n## Expected checks\n\n- Each initial snapshot contains 3 scoped roster rows; add-one contains 4; update-one contains 4; omission/removal-canary contains 3. Each Table has exactly 32 columns and 2 pending SOP asset rows.\n- Each organization has distinct \`example.test\` emails, class ID, department, asset IDs, and SOP canaries. No value is a real employee, account, class, or source. Never create/import fake authentication identities for these emails.\n- SOP extraction should preserve the company, department, title, canary, and ordered facts listed in \`manifest.json\`. Querying one class must never return the other company's canaries.\n- SOP rows use \`PendingUpload\` and have no Drive IDs or direct URLs. They are deliberately excluded by the parser until the staging operator binds actual uploaded files.\n\n## Mutation semantics observed in current code\n\nThe current \`product_import_roster\` implementation inserts active enrollments if absent and upserts roster profile country/department. It does not delete/deactivate enrollments for users omitted from a later snapshot. It also uses \`ON CONFLICT(email) DO NOTHING\` for the user row, so a changed Full Name in \`update-one\` is not written to an existing user. Therefore the omission snapshot is a removal-behavior canary only: expect the omitted learner to remain enrolled unless a separate, explicit lifecycle operation is performed. Do not report removal as successful revocation based on absence from the Sheet.\n\nThe sync function stores the result for a request ID and replays it for the same request/payload, so the same sync request should not duplicate the import. A new request ID represents a new sync.\n\n## Operator boundary\n\nThese are local fixture files only. They create no Drive folder, Google Sheet, authentication user, class, role, database row, binding, or cloud permission. Upload the Table and SOP copies only into the authorized staging folder, preserve company separation, and use ordinary app-authenticated flows.\n\nRegenerate the CSV/JSON/text source files with \`node apps/promptify-intrepid/scripts/generate_staging_synthetic_roster.mjs\` and workbooks with \`node apps/promptify-intrepid/outputs/staging-synthetic-workspace-2026-10-20/build_synthetic_workbooks.mjs\`.\n`);

// Guard fixture drift before reporting success.
if (headers.length !== 32 || new Set(headers).size !== 31) throw new Error(`Unexpected header count/duplicate shape: ${headers.length}/${new Set(headers).size}`);
for (const org of manifest.organizations) {
  if (org.rosterEmails.some(email => !email.endsWith('.example.test'))) throw new Error(`Non-example email in ${org.id}`);
}
const allEmails = manifest.organizations.flatMap(org => org.rosterEmails);
if (new Set(allEmails).size !== allEmails.length) throw new Error('Company roster emails overlap');
console.log(`Generated synthetic fixtures for ${manifest.organizations.length} companies at ${output}`);
