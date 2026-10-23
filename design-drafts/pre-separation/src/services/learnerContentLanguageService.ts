import type {ProductLanguage} from './productI18nService';
// Display authored inline translations only. Never machine-translate SOP facts or learner work.
export function authoredLessonText(value:string|undefined,language:ProductLanguage):string{
 if(!value)return '';
 const marker=' / ',position=value.lastIndexOf(marker);
 if(position<0)return value;
 const translated=value.slice(position+marker.length);
 if(!/[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(translated))return value;
 const original=value.slice(0,position);
 return language==='vi'?translated:original;
}
