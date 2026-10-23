import type {CertificateData} from '../types/certificate';
export const PAGE={width:841.89,height:595.28};
export type TextRun={text:string;x:number;y:number;size:number;color:string;width:number;section:string};
export function validateCertificate(input:CertificateData):CertificateData {
 const data={...input};
 for(const [key,limit] of Object.entries({recipientName:120,courseName:240,certificateTitle:140,issuerName:120,certificateId:80})){
  const v=data[key as keyof CertificateData];
  if(typeof v!=='string'||!v.trim()||Array.from(v).length>limit||/[\p{Cc}\p{Cf}]/u.test(v))throw Error(`Invalid ${key}: required, maximum ${limit} Unicode characters, no controls`);
  Object.assign(data,{[key]:v.normalize('NFC').trim().replace(/ +/g,' ')});
 }
 if(!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(data.issuedAt)||!Number.isFinite(Date.parse(data.issuedAt)))throw Error('Invalid issue date');
 const [year,month,day]=data.issuedAt.slice(0,10).split('-').map(Number);
 if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate())throw Error('Invalid calendar date');
 if(data.score!==undefined&&(!Number.isFinite(data.score)||data.score<0||data.score>10))throw Error('Score must be between 0 and 10');
 if(data.verificationUrl!==undefined){const u=new URL(data.verificationUrl);if(u.protocol!=='https:'||u.username||u.password)throw Error('Verification URL must use HTTPS');}
 return data;
}
export function certificateScene(input:CertificateData,measure:(s:string,n:number)=>number,language:'vi'|'en'){
 const data=validateCertificate(input),texts:TextRun[]=[],vi=language==='vi';
 const add=(text:string,x:number,y:number,size:number,color='#152c2a',section='label')=>texts.push({text,x,y,size,color,width:measure(text,size),section});
 const fit=(text:string,y:number,max:number,min:number,width:number,section:string,color='#152c2a')=>{
  for(let size=max;size>=min;size-=.5){
   let lines=[text];
   if(measure(text,size)>width){
    if(measure(text,min)<=width)continue;
    const words=text.split(' ');let best:string[]|undefined,balance=Infinity;
    for(let i=1;i<words.length;i++){const pair=[words.slice(0,i).join(' '),words.slice(i).join(' ')],w=pair.map(s=>measure(s,size));if(Math.max(...w)<=width&&Math.abs(w[0]-w[1])<balance){best=pair;balance=Math.abs(w[0]-w[1]);}}
    if(!best)continue;lines=best;
   }
   lines.forEach((s,i)=>add(s,section==='issuer'?220:56,y+i*size*1.42,size,color,section));return;
  }
  throw Error(`${section} cannot fit within two lines; review the full value. No text was truncated.`);
 };
 add('Promptify',56,64,25,'#08765c','brand');add('LEARNING / APPLIED AI',56,88,9,'#536762');
 add(vi?(data.kind==='badge'?'HUY HIỆU THÀNH TÍCH':'CHỨNG NHẬN HOÀN THÀNH'):(data.kind==='badge'?'ACHIEVEMENT BADGE':'CERTIFICATE OF COMPLETION'),56,143,12,'#08765c');
 fit(data.certificateTitle,180,23,16,690,'title');
 add(vi?'Trao cho học viên':'Presented to',56,254,12,'#536762');
 fit(data.recipientName,307,43,27,720,'recipient','#08765c');
 add(vi?(data.kind==='badge'?'Đạt thành tích học tập được ghi nhận trong':'Đã hoàn thành chương trình học'):(data.kind==='badge'?'For recorded learning achievement in':'For completing the learning program'),56,395,12,'#536762');
 fit(data.courseName,425,20,14,720,'course');
 add(vi?'NGÀY CẤP':'ISSUED ON',56,510,8,'#536762');
 add(new Date(data.issuedAt).toLocaleDateString(vi?'vi-VN':'en-GB',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric'}),56,531,12);
 add(vi?'ĐƠN VỊ CẤP':'ISSUED BY',220,510,8,'#536762');fit(data.issuerName,531,12,9,340,'issuer');
 if(data.score!==undefined){add(vi?'ĐIỂM GHI NHẬN':'RECORDED SCORE',630,510,8,'#536762');add(`${data.score.toFixed(2)} / 10`,630,531,12);}
 add((vi?'Mã chứng nhận: ':'Record ID: ')+data.certificateId,56,574,8,'#536762','id');
 if(data.verificationUrl)add(vi?'Xác minh trực tuyến':'Verify online',650,574,8,'#08765c','verification');
 for(const t of texts)if(t.x+t.width>790)throw Error(`Certificate ${t.section} exceeds printable width`);
 return {data,texts};
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function certificateSvg(scene:ReturnType<typeof certificateScene>,fontBase64:string){
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 841.89 595.28" role="img" aria-label="${escape(scene.data.certificateTitle)}"><style>@font-face{font-family:Certificate;src:url(data:font/ttf;base64,${fontBase64})}text{font-family:Certificate}</style><rect width="100%" height="100%" fill="#fffefb"/><rect width="9" height="595.28" fill="#08765c"/><path d="M56 480H785" stroke="#cddbd4"/><path d="M705 40h80v80h-40V80h-40z" fill="#e6eee9"/>${scene.texts.map(t=>`${t.section==='verification'?`<a href="${escape(scene.data.verificationUrl!)}">`:''}<text x="${t.x}" y="${t.y}" font-size="${t.size}" fill="${t.color}">${escape(t.text)}</text>${t.section==='verification'?'</a>':''}`).join('')}</svg>`;
}
