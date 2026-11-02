import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {BarChart3,CalendarRange,ChevronDown,FileText,LayoutDashboard,LayoutGrid,LogOut,Radio,ShieldCheck,SquarePen,UserRound,Users} from 'lucide-react';
import {PromptifyMark} from './PromptifyMark';
import {useProductLanguage} from '../../services/productI18nService';
import './app-shell.css';

export type ShellNavItem={id:number;label:string;group:string};
type Props={
 items:ShellNavItem[];current?:number;onNavigate:(id:number)=>void;onHome:()=>void;staging:boolean;
 title:string;user:{name:string;detail:string};classPicker?:React.ReactNode;onLanguage:(language:'en'|'vi')=>void;onProfile:()=>void;onManageCohorts?:()=>void;onSignOut:()=>void;children:React.ReactNode;
};
const icons:Record<number,React.ComponentType<{size?:number;'aria-hidden'?:boolean}>>={4:LayoutDashboard,9:Radio,11:SquarePen,12:BarChart3,13:FileText,14:ShieldCheck,15:Users};
const HeaderSlots=createContext<{heading:HTMLElement|null;actions:HTMLElement|null}>({heading:null,actions:null});

/** A screen puts its own title and main actions into the app header, the way each Word screen carries its own header. */
export function ShellHeader({heading,actions}:{heading?:React.ReactNode;actions?:React.ReactNode}){
 const slots=useContext(HeaderSlots);
 return <>{heading&&slots.heading&&createPortal(heading,slots.heading)}{actions&&slots.actions&&createPortal(actions,slots.actions)}</>;
}

/** Closes a details menu on outside click, Escape or picking an item. */
function Menu({className,label,summary,children}:{className:string;label:string;summary:React.ReactNode;children:(close:()=>void)=>React.ReactNode}){
 const ref=useRef<HTMLDetailsElement>(null),close=()=>{if(ref.current)ref.current.open=false;};
 useEffect(()=>{const outside=(event:Event)=>{if(ref.current?.open&&!ref.current.contains(event.target as Node))close();};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&ref.current?.open){close();ref.current.querySelector('summary')?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[]);
 return <details ref={ref} className={'app-menu '+className}><summary aria-label={label}>{summary}<ChevronDown size={15} aria-hidden/></summary><div className="app-menu-panel">{children(close)}</div></details>;
}

/** Signed-in frame for every role: one light header with the screen's own title and actions, then cohort, navigation, language and account. */
export function AppShell({items,current,onNavigate,onHome,staging,title,user,classPicker,onLanguage,onProfile,onManageCohorts,onSignOut,children}:Props){
 const language=useProductLanguage(),p=(en:string,vi:string)=>language==='en'?en:vi;
 const [heading,setHeading]=useState<HTMLElement|null>(null),[actions,setActions]=useState<HTMLElement|null>(null);
 useEffect(()=>{document.title=title+' · Promptify';},[title]);
 const initials=user.name.split(/\s+/).filter(Boolean).map(part=>part[0]).slice(-2).join('').toUpperCase()||'P';
 return <HeaderSlots.Provider value={{heading,actions}}><div className="workspace-shell">
  <a className="app-skip" href="#app-main">{p('Skip to main content','Bỏ qua tới nội dung chính')}</a>
  <header className="app-header">
   <a className="app-brand" href="/" translate="no" aria-label="Promptify" onClick={event=>{event.preventDefault();onHome();}}><PromptifyMark className="!h-8 !w-8"/></a>
   <div className="app-heading"><span className="app-heading-default"><strong translate="no">Promptify</strong><small>{title}</small></span><div ref={setHeading} className="app-heading-slot"/></div>
   {staging&&<span className="app-stage" translate="no">Staging</span>}
   <div ref={setActions} className="app-page-actions"/>
   <div className="app-header-actions">
    {classPicker&&<label className="app-class-label"><span>{p('Cohort:','Lớp:')}</span>{classPicker}</label>}
    {(items.length>1||onManageCohorts)&&<Menu className="app-nav" label={p('Workspace navigation','Điều hướng không gian làm việc')} summary={<><LayoutGrid size={17} aria-hidden/><span>{items.find(item=>item.id===current)?.label||p('Menu','Danh mục')}</span></>}>{close=><nav aria-label={p('Workspace navigation','Điều hướng không gian làm việc')}>
     {items.map((item,index)=>{const Icon=icons[item.id]||LayoutDashboard;return <React.Fragment key={item.id}>
      {(index===0||items[index-1].group!==item.group)&&<span className="app-menu-group">{item.group}</span>}
      <button type="button" className="app-menu-item" aria-current={current===item.id?'page':undefined} onClick={()=>{close();onNavigate(item.id);}}><Icon size={17} aria-hidden/><span>{item.label}</span></button>
     </React.Fragment>;})}
     {onManageCohorts&&<><span className="app-menu-group">{p('Cohort','Lớp học')}</span><button type="button" className="app-menu-item" onClick={()=>{close();onManageCohorts();}}><CalendarRange size={17} aria-hidden/><span>{p('Manage cohorts','Quản lý lớp')}</span></button></>}
    </nav>}</Menu>}
    <div className="app-language" role="group" aria-label={p('Language','Ngôn ngữ')}>{(['vi','en'] as const).map(code=><button type="button" key={code} aria-pressed={language===code} onClick={()=>onLanguage(code)}>{code.toUpperCase()}</button>)}</div>
    <Menu className="app-account" label={p('Account','Tài khoản')} summary={<><span className="app-avatar" aria-hidden>{initials}</span><span className="app-account-name"><strong>{user.name}</strong><small>{user.detail}</small></span></>}>{close=><>
     <button type="button" className="app-menu-item" onClick={()=>{close();onProfile();}}><UserRound size={17} aria-hidden/><span>{p('My profile','Hồ sơ của tôi')}</span></button>
     <button type="button" className="app-menu-item" onClick={()=>{close();onSignOut();}}><LogOut size={17} aria-hidden/><span>{p('Sign out','Đăng xuất')}</span></button>
    </>}</Menu>
   </div>
  </header>
  <div id="app-main" tabIndex={-1} className="app-content">{children}</div>
 </div></HeaderSlots.Provider>;
}
