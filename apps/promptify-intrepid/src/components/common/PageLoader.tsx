import {PromptifyMark} from './PromptifyMark';
import {productText, useProductLanguage} from '../../services/productI18nService';
import './page-loader.css';

/** The one page-level loading state: brand mark and label centred in the space it fills.
 *  `screen` fills the viewport (before the app shell exists); `area` fills the shell's content area. */
export function PageLoader({label,fill='area'}:{label?:string;fill?:'screen'|'area'}){
 const language=useProductLanguage();
 return <div role="status" aria-live="polite" className={'page-loader page-loader-'+fill}>
  <span className="page-loader-logo"><PromptifyMark className="page-loader-mark"/></span>
  <span className="page-loader-label">{label||productText('loading',language)}</span>
 </div>;
}
