import React,{useEffect} from 'react';
import {BarChart3,FileText,LayoutDashboard,LogOut,Radio,ShieldCheck,SquarePen,UserRound,Users} from 'lucide-react';
import {PromptifyMark} from './PromptifyMark';
import {useProductLanguage} from '../../services/productI18nService';
import './app-shell.css';

export type ShellNavItem={id:number;label:string;group:string};
type Props={
 items:ShellNavItem[];current?:number;onNavigate:(id:number)=>void;onHome:()=>void;staging:boolean;
 title:string;classPicker?:React.ReactNode;onLanguage:(language:'en'|'vi')=>void;onProfile:()=>void;onSignOut:()=>void;children:React.ReactNode;
};
const icons:Record<number,React.ComponentType<{size?:number;'aria-hidden'?:boolean}>>={4:LayoutDashboard,9:Radio,11:SquarePen,12:BarChart3,13:FileText,14:ShieldCheck,15:Users};

/** Signed-in frame for every role: brand, cohort and account in the top row, role navigation as tabs below it. */
export function AppShell({items,current,onNavigate,onHome,staging,title,classPicker,onLanguage,onProfile,onSignOut,children}:Props){
 const language=useProductLanguage(),p=(en:string,vi:string)=>language==='en'?en:vi;
 useEffect(()=>{document.title=title+' · Promptify';},[title]);
 // On narrow screens the tab row scrolls; keep the open section in view.
 useEffect(()=>{document.querySelector('.app-tab[aria-current=page]')?.scrollIntoView?.({block:'nearest',inline:'nearest'});},[current]);
 return <div className="workspace-shell">
  <a className="app-skip" href="#app-main">{p('Skip to main content','Bỏ qua tới nội dung chính')}</a>
  <header className="app-header">
   <div className="app-header-row">
    <a className="app-brand" href="/" translate="no" onClick={event=>{event.preventDefault();onHome();}}><PromptifyMark className="!h-8 !w-8"/><strong>Promptify</strong></a>
    {staging&&<span className="app-stage" translate="no">Staging</span>}
    {classPicker}
    <div className="app-header-actions">
     <div className="app-language" role="group" aria-label={p('Language','Ngôn ngữ')}>{(['vi','en'] as const).map(code=><button type="button" key={code} aria-pressed={language===code} onClick={()=>onLanguage(code)}>{code.toUpperCase()}</button>)}</div>
     <button type="button" className="app-header-button" onClick={onProfile}><UserRound size={18} aria-hidden/><span>{p('My profile','Hồ sơ của tôi')}</span></button>
     <button type="button" className="app-header-button" onClick={onSignOut}><LogOut size={18} aria-hidden/><span>{p('Sign out','Đăng xuất')}</span></button>
    </div>
   </div>
   <nav className="app-tabs" aria-label={p('Workspace navigation','Điều hướng không gian làm việc')}>
    {items.map((item,index)=>{const Icon=icons[item.id]||LayoutDashboard;return <React.Fragment key={item.id}>
     {index>0&&items[index-1].group!==item.group&&<span className="app-tab-divider" aria-hidden/>}
     <button type="button" className="app-tab" aria-current={current===item.id?'page':undefined} onClick={()=>onNavigate(item.id)}><Icon size={17} aria-hidden/><span>{item.label}</span></button>
    </React.Fragment>;})}
   </nav>
  </header>
  <div id="app-main" tabIndex={-1} className="app-content">{children}</div>
 </div>;
}
