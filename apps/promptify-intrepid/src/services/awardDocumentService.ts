import fs from 'node:fs';
import path from 'node:path';
import {PDFDocument,PDFName,PDFString,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {CertificateData} from '../types/certificate';
import {certificateScene,certificateSvg,PAGE} from './certificateLayoutService';
export async function renderCertificate(data:CertificateData,language:'en'|'vi') {
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const bytes=fs.readFileSync(path.join(process.cwd(),'public/fonts/NotoSans.ttf'));
 const font=await doc.embedFont(bytes,{subset:false});
 const scene=certificateScene(data,(s,n)=>font.widthOfTextAtSize(s,n),language);
 const supported=new Set(font.getCharacterSet());
 for(const run of scene.texts)for(const char of run.text)if(!supported.has(char.codePointAt(0)!))throw Error('Unsupported certificate character: '+char);
 const page=doc.addPage([PAGE.width,PAGE.height]);
 const color=(h:string)=>rgb(parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255);
 page.drawRectangle({x:0,y:0,width:PAGE.width,height:PAGE.height,color:color('#fffefb')});
 page.drawRectangle({x:0,y:0,width:9,height:PAGE.height,color:color('#08765c')});
 page.drawLine({start:{x:56,y:PAGE.height-480},end:{x:785,y:PAGE.height-480},color:color('#cddbd4'),thickness:1});
 page.drawSvgPath('M705 40h80v80h-40V80h-40z',{x:0,y:PAGE.height,color:color('#e6eee9')});
 for(const t of scene.texts)page.drawText(t.text,{x:t.x,y:PAGE.height-t.y,size:t.size,font,color:color(t.color)});
 if(data.verificationUrl){const link=doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[650,12,780,32],Border:[0,0,0],A:{Type:'Action',S:'URI',URI:PDFString.of(data.verificationUrl)}});page.node.set(PDFName.of('Annots'),doc.context.obj([doc.context.register(link)]));}
 doc.setTitle(scene.data.certificateTitle);doc.setAuthor(scene.data.issuerName);doc.setSubject(data.kind==='badge'?'Recorded learning achievement':'Course completion; not professional accreditation');
 return {base64:Buffer.from(await doc.save()).toString('base64'),svg:certificateSvg(scene,bytes.toString('base64')),scene};
}
export function awardData(award:{id:string;kind:string;title:string;issuer:string;issued_at:string;evidence:Record<string,unknown>},name:string,courseName:string):CertificateData {
 if(!['certificate','badge'].includes(award.kind))throw Error('Unsupported award kind');
 return {recipientName:name,courseName,certificateTitle:award.title,issuedAt:award.issued_at,certificateId:award.id,issuerName:award.issuer,kind:award.kind as 'certificate'|'badge',score:(award.evidence.average_score??award.evidence.score) as number|undefined};
}
export async function awardPdf(award:Parameters<typeof awardData>[0],name:string,language:'en'|'vi',courseName:string){return (await renderCertificate(awardData(award,name,courseName),language)).base64;}
