export interface DiffLine {kind:'same'|'added'|'removed';text:string}
export function lineDiff(before:string,after:string):{lines:DiffLine[];coarse:boolean}{
 const a=before.split('\n'),b=after.split('\n');
 // Bound quadratic work for long model output. Preserve full text in the fallback.
 if(a.length*b.length>250000)return{coarse:true,lines:before===after?a.map(text=>({kind:'same',text})):[...a.map(text=>({kind:'removed' as const,text})),...b.map(text=>({kind:'added' as const,text}))]};
 const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 const lines:DiffLine[]=[];let i=0,j=0;
 while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){lines.push({kind:'same',text:a[i++]});j++}else if(j<b.length&&(i===a.length||dp[i][j+1]>dp[i+1][j]))lines.push({kind:'added',text:b[j++]});else lines.push({kind:'removed',text:a[i++]});}
 return{lines,coarse:false};
}
