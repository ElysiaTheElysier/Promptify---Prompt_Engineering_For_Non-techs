import assert from 'node:assert/strict';
import {lineDiff} from '../src/services/textDiffService';
for(const [a,b] of [['a\nb','a\nc'],['','x'],['x',''],['a\na\nb','a\nb\nb'],['xin chào\nSOP','xin chào\nSOP\nnguồn']]){
 const result=lineDiff(a,b);
 assert.equal(result.lines.filter(l=>l.kind!=='added').map(l=>l.text).join('\n'),a);
 assert.equal(result.lines.filter(l=>l.kind!=='removed').map(l=>l.text).join('\n'),b);
}
assert.equal(lineDiff('a\n'.repeat(600),'b\n'.repeat(600)).coarse,true);
assert.ok(lineDiff('same','same').lines.every(l=>l.kind==='same'));
console.log('Diff reconstruction and long-output fallback passed.');
