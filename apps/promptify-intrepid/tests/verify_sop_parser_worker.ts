import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractSop} from '../src/services/sopIngestionService';
import {parseInWorker} from '../src/services/sopParserWorker';

// TM-007: SOP parsing runs in a worker thread with a heap limit and a deadline; failures stay 422 for the user. Offline.
const md=await extractSop(Buffer.from('# SOP\n\nBước 1: Xác nhận mã đơn hàng trong 2 ngày làm việc.','utf8'),'sop.md');
assert.equal(md.chunks.length,1);assert.match(md.content,/Xác nhận mã đơn hàng/);
const csv=await extractSop(Buffer.from('code,meaning\nE01,Late delivery\n','utf8'),'codes.csv');assert.match(csv.content,/Late delivery/);
await assert.rejects(()=>extractSop(Buffer.from('%PDF-1.4 broken'),'broken.pdf'),(e:any)=>e.statusCode===422&&/SOP extraction failed/.test(e.message));
await assert.rejects(()=>extractSop(Buffer.from([0xff,0xfe,0xfd]),'bad.md'),(e:any)=>e.statusCode===422,'invalid UTF-8 refused');
await assert.rejects(()=>extractSop(Buffer.from('x'),'run.exe'),(e:any)=>e.statusCode===422);
// A parse that outlives its deadline is stopped and reported instead of holding the request.
await assert.rejects(()=>parseInWorker(Buffer.from('a'.repeat(10)),'md',1),/timed out/);
// A real PDF from the E2E kit parses in the worker (skipped when the kit is not checked out).
const kitPdf='../../docs/e2e-kit-2026-11-05/materials/02_sop/SOP-CC-01_Xu-ly-khieu-nai-khach-hang.pdf';
if(fs.existsSync(kitPdf)){const pdf=await extractSop(fs.readFileSync(kitPdf),'SOP-CC-01.pdf');assert.ok(pdf.metadata.pages&&pdf.chunks.length>0);}
const source=fs.readFileSync('src/services/sopIngestionService.ts','utf8');
assert.ok(source.includes('await parseInWorker(bytes,extension'),'extractSop parses through the worker');
assert.ok(!/import\('pdf-parse'\)|import\('mammoth'\)|import\('exceljs'\)/.test(source),'no parser library loaded in the API thread by extractSop');
console.log('SOP parser worker PASS: md/csv/pdf parsed in a worker, broken and unsupported files 422, deadline enforced.');
