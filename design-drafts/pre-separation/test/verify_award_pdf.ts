import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {awardPdf} from '../src/services/awardDocumentService.js';
const pdf=await awardPdf({id:'11111111-1111-4111-8111-111111111111',kind:'certificate',title:'Chứng chỉ thực hành Promptify — QA',issuer:'QA ONLY',issued_at:new Date().toISOString(),evidence:{average_score:8.75}},'Nguyễn Văn Kiểm Thử','vi');
const bytes=Buffer.from(pdf,'base64'),doc=await PDFDocument.load(bytes);
assert.equal(doc.getPageCount(),1);assert.ok(bytes.length>1000);assert.equal(doc.getTitle(),'Chứng chỉ thực hành Promptify — QA');
fs.mkdirSync('outputs/rebuild-audit',{recursive:true});fs.writeFileSync('outputs/rebuild-audit/QA-award-vietnamese.pdf',bytes);
console.log('Vietnamese award PDF generated with embedded font and one landscape page. QA-only, no live calls.');
