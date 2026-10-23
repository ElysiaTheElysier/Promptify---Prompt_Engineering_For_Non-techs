import {useEffect,useRef} from 'react';
export function useSourceDialog(open:boolean,onClose:()=>void){
 const dialog=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  if(!open||!dialog.current)return;
  const node=dialog.current,before=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;
  const elements=()=>[...node.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')];
  document.body.style.overflow='hidden';elements()[0]?.focus();
  const handler=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close.current();}if(event.key==='Tab'){const available=elements(),first=available[0],last=available[available.length-1];if(!first){event.preventDefault();return;}if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};
  document.addEventListener('keydown',handler);
  return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',handler);before?.focus();};
 },[open]);
 return dialog;
}
