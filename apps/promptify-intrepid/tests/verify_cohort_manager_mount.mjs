import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';
// Staff screens 9/11/14/15 return early through scoped(); the cohort manager must live inside that shell or it never renders.
const source=fs.readFileSync('src/components/rebuild/ProductionApp.tsx','utf8');
const ast=ts.createSourceFile('ProductionApp.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let scoped,earlyReturns=[];
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='scoped')scoped=node.initializer.getText(ast);
 if(ts.isIfStatement(node)&&ts.isReturnStatement(node.thenStatement)&&/^scoped\(/.test(node.thenStatement.expression?.getText(ast)||'')){const m=node.expression.getText(ast).match(/currentUi===(\d+)/);if(m)earlyReturns.push(Number(m[1]));}
 ts.forEachChild(node,visit);}visit(ast);
assert.ok(scoped,'scoped shell exists');
for(const ui of [9,11,14,15])assert.ok(earlyReturns.includes(ui),`ui ${ui} renders through scoped()`);
assert.ok(/editor&&snapshot\?\.selectedClass&&\[9,11,14,15\]\.includes\(currentUi\)&&<ProductionCohorts /.test(scoped),'scoped shell mounts ProductionCohorts for editors on 9/11/14/15');
assert.equal(source.match(/<ProductionCohorts /g).length,1,'cohort manager mounted exactly once');
console.log('Cohort manager mount PASS: Manage cohorts renders inside the staff shell on Workshop, Studio, Governance and Roster for class managers.');
