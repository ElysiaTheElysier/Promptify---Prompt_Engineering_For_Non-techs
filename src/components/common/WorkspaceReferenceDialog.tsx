import React,{useEffect,useRef} from 'react';
export function WorkspaceReferenceDialog({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;ref.current?.showModal();return()=>{ref.current?.close();previous?.focus()}},[]);
 return <dialog ref={ref} onCancel={onClose} aria-label={title} className="m-auto rounded-2xl border border-slate-200 w-[min(760px,95vw)] max-h-[90vh] p-0 backdrop:bg-slate-950/40"><header className="flex items-center justify-between gap-3 p-5 border-b"><h2 className="font-bold text-lg">{title}</h2><button type="button" onClick={onClose} className="min-h-11 px-4 border rounded-lg">Đóng</button></header><div className="p-5 overflow-auto">{children}</div></dialog>;
}
