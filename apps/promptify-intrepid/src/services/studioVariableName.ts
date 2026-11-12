// Prompt variable names: Studio checks them while typing, the server enforces the same rule on save.
export const VARIABLE_NAME=/^[A-Za-z_][A-Za-z0-9_.-]{0,79}$/;
// "tên khách hàng" → "ten_khach_hang"
export function toVariableName(value:string){
 const name=value.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/[^A-Za-z0-9_.-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80);
 return /^[0-9.-]/.test(name)?('_'+name).slice(0,80):name;
}
// Error for one variable row, or '' when the name is valid and unique.
export function variableNameProblem(name:string,all:string[],vi:boolean){
 if(!name.trim())return vi?'Chưa đặt tên biến.':'Name the variable.';
 if(!VARIABLE_NAME.test(name))return vi?'Tên biến chỉ dùng chữ không dấu, số, _ . - và không có dấu cách (ví dụ ten_khach_hang).':'Use Latin letters, digits, _ . - and no spaces (for example customer_name).';
 if(all.filter(n=>n===name).length>1)return vi?'Tên biến bị trùng.':'Duplicate variable name.';
 return '';
}
