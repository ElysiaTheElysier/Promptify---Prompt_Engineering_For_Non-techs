import React,{useState} from 'react';
import type {ProductSnapshot} from '../../types/production';
import {LearnerHome} from '../dashboard/LearnerHome';
import {LearnerDashboard} from '../dashboard/LearnerDashboard';
import {ProductNavbar} from '../navigation/ProductNavbar';
import {combinedCohort,combinedLab,combinedEnrollment,combinedLearner} from '../../services/combinedUiAdapter';
import {supabase} from '../../services/supabaseClient';
import {useProductLanguage,setProductLanguage} from '../../services/productI18nService';
export default function CombinedProductionHub({snapshot,onOpen,onSelectClass,navigate}:{snapshot:ProductSnapshot;onOpen:(id:string)=>void;onSelectClass:(id:string)=>Promise<void>;navigate:(ui:number)=>void}){
 const lang=useProductLanguage(),[showClass,setShowClass]=useState(false),cohorts=snapshot.classes.map(combinedCohort),selected=cohorts.find(c=>c.id===snapshot.selectedClass?.id),learner=combinedLearner(snapshot),labs=snapshot.lessons.map(combinedLab),enrollments=Object.fromEntries(snapshot.classes.map(row=>[row.id,combinedEnrollment(snapshot,row)]));
 const openClass=async(id:string)=>{await onSelectClass(id);setShowClass(true);};
 return <div className="min-h-screen bg-slate-50 text-slate-900"><ProductNavbar currentView="dashboard" availableCohorts={cohorts} selectedCohort={selected} learner={learner} onNavigate={view=>navigate(view==='library'?11:view==='history'?6:4)} onSelectClass={async c=>{await openClass(c.id);return true;}} onChangeClass={()=>setShowClass(false)} onLogout={()=>void supabase.auth.signOut()}/><div className="max-w-7xl mx-auto px-6 py-3 flex justify-end"><button className="border border-slate-200 bg-white rounded-lg px-3 py-2 text-sm" onClick={()=>setProductLanguage(lang==='en'?'vi':'en')}>{lang.toUpperCase()} / {lang==='en'?'VI':'EN'}</button></div>{selected?showClass?(labs.length?<LearnerDashboard cohort={selected} enrollment={enrollments[selected.id]} labs={labs} onStartLesson={onOpen} onNavigate={view=>navigate(view==='library'?11:view==='history'?6:4)} onOpenTutorial={()=>navigate(8)}/>:<p className="mx-auto max-w-7xl p-8">{lang==='en'?'No published Codelabs yet.':'Chưa có Codelab được xuất bản.'}</p>):<LearnerHome learner={learner} cohorts={cohorts} selectedCohort={selected} enrollments={enrollments} totalLabCount={labs.length} onChooseClass={async c=>openClass(c.id)}/>:<p className="p-8">{lang==='en'?'No classes assigned.':'Chưa được ghi danh vào lớp.'}</p>}</div>;
}
