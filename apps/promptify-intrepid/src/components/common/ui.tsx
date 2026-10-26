import React from 'react';
import './ui-kit.css';

/** Page title with an optional one-line description and trailing actions. */
export function PageHeader({title,description,actions,level=1}:{title:React.ReactNode;description?:React.ReactNode;actions?:React.ReactNode;level?:1|2}){
 const Heading=level===1?'h1':'h2';
 return <div className="pi-page-header"><div><Heading>{title}</Heading>{description&&<p>{description}</p>}</div>{actions&&<div className="pi-toolbar">{actions}</div>}</div>;
}
/** Section title row with trailing actions. */
export function SectionHeader({title,actions,id}:{title:React.ReactNode;actions?:React.ReactNode;id?:string}){
 return <div className="pi-section-header"><h2 id={id}>{title}</h2>{actions&&<div className="pi-toolbar">{actions}</div>}</div>;
}
/** Small coloured status label; tone follows the status key (active, pending, rejected, …). */
export function StatusBadge({tone,children}:{tone:string;children:React.ReactNode}){
 return <span className={'pi-status pi-status-'+tone}>{children}</span>;
}
/** Empty state that says what is missing and what to do next. */
export function EmptyState({title,children,action}:{title:React.ReactNode;children?:React.ReactNode;action?:React.ReactNode}){
 return <div className="pi-empty" role="status"><strong>{title}</strong>{children&&<span>{children}</span>}{action}</div>;
}
