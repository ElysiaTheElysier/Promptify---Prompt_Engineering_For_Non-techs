import React,{useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
export function ProductDialog({title,onClose,children,className=''}:{title:string;onClose:()=>void;children:React.ReactNode;className?:string}){
 const ref=useRef<HTMLElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const before=document.activeElement as HTMLElement|null;const node=ref.current;if(!node)return;
  const targets=()=>[...node.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')];
  (targets()[0]||node).focus();const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close.current();}if(event.key==='Tab'){const available=targets();if(!available.length){event.preventDefault();node.focus();return;}const first=available[0],last=available[available.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};
  document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=previousOverflow;before?.focus();};},[]);
 return createPortal(<div className="prod-app prod-modal-overlay"><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={'prod-card '+className}>{children}</section></div>,document.body);
}
