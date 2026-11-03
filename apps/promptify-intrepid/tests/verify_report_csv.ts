import assert from 'node:assert/strict';
import {toCsv,analyticsCsv} from '../src/services/reportCsvService';

// Head analytics export: quoting, CSV-injection guard, number rounding and the dashboard's own metrics. Offline only.
assert.equal(toCsv([['a,b','say "hi"','line\nbreak']]),'"a,b","say ""hi""","line\nbreak"');
assert.equal(toCsv([['=HYPERLINK("x")','+1','-cmd','@sum','plain']]),`"'=HYPERLINK(""x"")",'+1,'-cmd,'@sum,plain`);
assert.equal(toCsv([[-7.913,8.940212,null,undefined,NaN]]),'-7.91,8.94,,,','numbers are not treated as formulas and are rounded');
const csv=analyticsCsv({enrolled:6,completed:1,attempts:50,evaluated:47,average_score:8.940212,pre_score:9.1433,post_score:8.42,paired_tasks:3,published_sops:6,
 classes:[{class_code:'NORTHSTAR',department:'Ops',enrolled:6,completed:1,attempts:50,average_score:8.940212,published_sops:6}],
 techniques:[{title:'=cmd lab',evaluated:2,average_score:8.28}]},'en');
assert.ok(csv.startsWith('﻿'),'BOM for Excel');
assert.ok(csv.includes('Average AI Judge score (all graded attempts),8.94'));
assert.ok(csv.includes('NORTHSTAR,Ops,6,1,50,8.94,6'));
assert.ok(csv.includes("'=cmd lab,2,8.28"),'lab titles are injection-guarded');
assert.ok(analyticsCsv({},'vi').includes('Điểm AI Judge trung bình'),'Vietnamese headers');
console.log('verify_report_csv: PASS');
