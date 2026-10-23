import fs from 'node:fs';
import path from 'node:path';
import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
export async function awardPdf(award:{id:string;kind:string;title:string;issuer:string;issued_at:string;evidence:any},name:string,language:'en'|'vi') {
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(fs.readFileSync(path.join(process.cwd(),'public/fonts/NotoSans.ttf')),{subset:false});
 const page=doc.addPage([841.89,595.28]),green=rgb(.016,.47,.34),navy=rgb(.06,.09,.16);
 page.drawRectangle({x:22,y:22,width:797.89,height:551.28,borderColor:green,borderWidth:3});
 const write=(text:string,y:number,size:number)=>{const clean=text.replace(/[\r\n\t]/g,' ');let fit=size;while(font.widthOfTextAtSize(clean,fit)>730&&fit>10)fit--;page.drawText(clean,{x:(841.89-font.widthOfTextAtSize(clean,fit))/2,y,size:fit,font,color:navy});};
 write('Promptify',515,26);
 write(language==='vi'?(award.kind==='certificate'?'CHỨNG CHỈ HOÀN THÀNH':'HUY HIỆU THÀNH TÍCH'):(award.kind==='certificate'?'CERTIFICATE OF COMPLETION':'ACHIEVEMENT BADGE'),458,25);
 write(award.title.slice(0,200),407,24);
 write(language==='vi'?'Cấp cho':'Awarded to',357,15);
 write(name.slice(0,120),310,32);
 write((language==='vi'?'Đơn vị cấp: ':'Issued by: ')+award.issuer.slice(0,200),258,17);
 const score=award.evidence.average_score??award.evidence.score;
 if(typeof score==='number')write((language==='vi'?'Điểm đã ghi nhận: ':'Recorded score: ')+score.toFixed(2)+' / 10',216,15);
 write((language==='vi'?'Ngày cấp: ':'Issue date: ')+new Date(award.issued_at).toLocaleDateString(language==='vi'?'vi-VN':'en-GB',{timeZone:'Asia/Ho_Chi_Minh'}),175,14);
 write((language==='vi'?'Mã bản ghi: ':'Record ID: ')+award.id,83,11);
 write(language==='vi'?'Đối chiếu bản ghi trong tài khoản Promptify được cấp quyền.':'Verify this record in an authorized Promptify account.',60,10);
 doc.setTitle(award.title);doc.setAuthor(award.issuer);doc.setSubject('Promptify recorded learning achievement');
 return Buffer.from(await doc.save()).toString('base64');
}
