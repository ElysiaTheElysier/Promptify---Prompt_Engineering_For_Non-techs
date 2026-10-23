export function sourceRenderer({text=(s)=>`{copy(${JSON.stringify(s)})}`,click=()=>{throw Error('Unmapped action')},model=(field)=>` value={${field}} onChange={event=>set${field[0].toUpperCase()+field.slice(1)}(event.target.value)}`,node=()=>null,extra=()=>''}={}){
 const q=JSON.stringify;
 function render(n){const override=node(n,render);if(override!==null)return override;if(n.text!==undefined)return text(n.text);const a=n.attrs||{},tag=n.tag==='body'?'div':n.tag;if(['script','style'].includes(tag))return '';
 if(tag==='template'){const inner=(n.children||[]).map(render).join('');if(a['x-for']){const[v,list]=a['x-for'].split(' in ');return `{${list}.map((${v}:any,index:number)=><React.Fragment key={${v}.id||${v}.name||index}>${inner}</React.Fragment>)}`;}return a['x-if']?`{(${a['x-if']})&&<>${inner}</>}`:`<>${inner}</>`;}
 if((a.class||'').includes('material-symbols-outlined'))return `<SourceIcon name={${a['x-text']||q((n.children||[]).map(c=>c.text||'').join('').trim())}} className=${q(a.class.replace('material-symbols-outlined','source-icon'))}/>`;
 let props='';for(const[k,v]of Object.entries(a)){if(/^(x-|@|:)/.test(k)||k==='style')continue;if(k==='class'){props+=` className={${q(v)}${a[':class']?' + " " + sourceClasses('+a[':class']+')':''}}`;continue;}if(k==='href'){const routes={'/learner/dashboard':'/?ui=04','/trainer/control':'/?ui=09','/trainer/studio':'/?ui=11','/trainer/analytics':'/?ui=12'};const target=routes[v]||v;props+=` href=${q(target)}${v==='#'?' onClick={event=>event.preventDefault()}':''}`;continue;}if(['rows','min','max','step'].includes(k)){props+=` ${k}={${Number(v)}}`;continue;}if(['disabled','required','readonly','multiple'].includes(k)){props+=` ${k==='readonly'?'readOnly':k}={true}`;continue;}props+=` ${{for:'htmlFor',tabindex:'tabIndex',viewbox:'viewBox'}[k]||k}=${q(v)}`;}
 if(tag==='button'&&/^(modalOpen|addModalOpen|errorModalOpen) = false$/.test(a['@click']||''))props+=' aria-label={copy("Close")}';
 if(a['x-model'])props+=model(a['x-model'],n);
 if(a[':disabled'])props+=` disabled={${a[':disabled']}}`;
 if(a[':value'])props+=` value={${a[':value']}}`;
 if(a[':style'])props+=` style={{width:String(${a[':style']}).replace('width: ','')}}`;
 if(a['@click'])props+=` onClick={()=>{${click(a['@click'],n)}}}`;
 props+=extra(n);
 const children=a['x-text']?`{copy(String(${a['x-text']}))}`:(n.children||[]).map(render).join('');
 let out=['input','img','br','hr'].includes(tag)?`<${tag}${props}/>`:`<${tag}${props}>${children}</${tag}>`;if(a['x-show'])out=`{(${a['x-show']})&&(${out})}`;return out;
 }return render;
}
export const sourceImports=`import React,{useEffect,useState,useRef} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {useProductLanguage,setProductLanguage} from '../../services/productI18nService';
import {sourceUiText} from '../../services/sourceUiTextService';
import {productRequest} from '../../services/productionClientService';
import {SourceIcon} from './SourceIcon';
import './source-ui.css';
const sourceClasses=(v:any)=>typeof v==='string'?v:Object.entries(v).filter(([,value])=>value).map(([key])=>key).join(' ');
`;
