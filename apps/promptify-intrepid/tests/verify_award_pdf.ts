import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PDFDocument,PDFName,PDFDict,PDFArray} from 'pdf-lib';
import {renderCertificate,awardData} from '../src/services/awardDocumentService';
import {validateCertificate} from '../src/services/certificateLayoutService';
const base={recipientName:'An',courseName:'Applied AI for the Workplace',certificateTitle:'Prompt Engineering for Work',issuedAt:'2026-10-12T08:00:00Z',certificateId:'SAMPLE-2026-001',issuerName:'Promptify'};
const names=['An','Nguyễn Văn Kiểm Thử','Nguyễn Thị Phương Anh Hoàng Minh','Nguyễn Thị Nguyễn Hoàng Phương Thảo Minh Anh','Nguyen Van Minh','Nguyễn Thị Ánh'.normalize('NFD'),'Nguyễn '+Array(8).fill('Phương').join(' ')];
fs.mkdirSync('outputs/certificates',{recursive:true});
for(const [i,name] of names.entries()){
 const data={...base,recipientName:name,certificateId:`SAMPLE-2026-00${i+1}`,score:i%2?8.75:undefined,courseName:i===3?'Prompt Engineering and Applied Artificial Intelligence for Business Operations, Data Analysis and Effective Workplace Processes':base.courseName};
 const result=await renderCertificate(data,'en'),bytes=Buffer.from(result.base64,'base64'),pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),1);assert.deepEqual(pdf.getPage(0).getSize(),{width:841.89,height:595.28});
 assert.equal(result.scene.texts.filter(t=>t.section==='recipient').map(t=>t.text).join(' '),name.normalize('NFC'));
 assert.equal(result.scene.texts.some(t=>t.text==='8.75 / 10'),data.score!==undefined);
 const runs=result.scene.texts;
 for(const r of runs){assert.ok(r.x+r.width<=790,`${r.section} overflow`);assert.ok(r.y+r.size*.3<595.28);}
 for(let a=0;a<runs.length;a++)for(let b=a+1;b<runs.length;b++){
  const x=runs[a],y=runs[b];assert.ok(!(x.x<y.x+y.width&&y.x<x.x+x.width&&x.y-x.size*1.1<y.y+y.size*.3&&y.y-y.size*1.1<x.y+x.size*.3),`Overlap: ${x.section} / ${y.section}`);
 }
 const fonts=pdf.getPage(0).node.Resources()!.lookup(PDFName.of('Font'),PDFDict);
 for(const [,ref] of fonts.entries()){const f=pdf.context.lookup(ref,PDFDict);assert.ok(f.get(PDFName.of('ToUnicode')));const d=f.lookup(PDFName.of('DescendantFonts'),PDFArray).lookup(0,PDFDict).lookup(PDFName.of('FontDescriptor'),PDFDict);assert.ok(d.get(PDFName.of('FontFile2')));}
 fs.writeFileSync(`outputs/certificates/sample-${i+1}.pdf`,bytes);fs.writeFileSync(`outputs/certificates/sample-${i+1}.svg`,result.svg);
}
for(const patch of [{recipientName:''},{recipientName:'A'.repeat(121)},{recipientName:'An\nNguyen'},{score:NaN},{score:11},{issuedAt:'invalid'},{issuedAt:'2026-02-31'},{verificationUrl:'http://example.com'}])assert.throws(()=>validateCertificate({...base,...patch}));
await assert.rejects(()=>renderCertificate({...base,recipientName:'W'.repeat(120)},'vi'),/cannot fit/);
await assert.rejects(()=>renderCertificate({...base,recipientName:'An 🧑'},'vi'),/Unsupported/);
const m=awardData({id:'actual-record',kind:'certificate',title:'Completion',issuer:'Academy',issued_at:base.issuedAt,evidence:{average_score:9}},'Learner','Actual course');
assert.equal(m.certificateId,'actual-record');assert.equal(m.courseName,'Actual course');assert.equal(m.score,9);
console.log('PASS: 7 fixtures, overflow/overlap, Unicode, embedded font, one-page A4, optional score, invalid data, mapping');


const linked=await renderCertificate({...base,verificationUrl:'https://example.com/records/sample'},'en');
assert.ok(linked.svg.includes('Verify online'));
assert.ok((await PDFDocument.load(Buffer.from(linked.base64,'base64'))).getPage(0).node.get(PDFName.of('Annots')));
