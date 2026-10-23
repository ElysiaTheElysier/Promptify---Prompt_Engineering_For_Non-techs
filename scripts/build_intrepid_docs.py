"""Build local-only onboarding/architecture/catalog explorer. Never connects to DB/cloud.

Tools live in ignored tmp/docs-engineering-tools. Source annotations reference the
reviewed ownership register; provide a fresh tbls JSON with --catalog after migrations.
No rows are copied. All displayed sample values are synthetic.
"""
from pathlib import Path
import argparse, hashlib, html, json, os, re, subprocess
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / 'tmp/docs-engineering-tools/node_modules'
OUT = ROOT / 'outputs/intrepid-docs'
STYLE = """body{font:16px/1.65 system-ui,sans-serif;color:#15243c;background:#f5f7fb;margin:0}header{background:#15243c;color:white;padding:18px 5vw}header a{color:#ccdefe;margin-right:20px}main{max-width:1180px;margin:30px auto;padding:24px;background:white;border-radius:14px}a{color:#1255a5}pre{background:#eef2f7;padding:18px;overflow:auto}table{border-collapse:collapse;width:100%;display:block;overflow:auto}th,td{padding:9px;border:1px solid #d5deea;text-align:left;vertical-align:top}img.diagram{max-width:100%;height:auto}.badge{background:#ffeab9;padding:10px;border-radius:6px}code{font-size:90%}h1,h2,h3{line-height:1.3}nav{display:flex;flex-wrap:wrap;gap:12px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.card{padding:16px;border:1px solid #d5deea;border-radius:10px}summary{cursor:pointer;font-weight:600}"""

def page(title, body):
    return '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' + html.escape(title) + '</title><style>' + STYLE + '</style><header><b>Promptify Intrepid — local documentation</b><nav><a href="/">Trang chủ</a><a href="/pages/docs/onboarding/README.html">Onboarding</a><a href="/pages/docs/architecture/README.html">Architecture</a><a href="/database/">Database</a><a href="/architecture/">LikeC4</a><a href="/schemaspy/">SchemaSpy</a></nav></header><main>' + body + '</main></html>'

def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')

def md_html(text):
    code = "import {marked} from " + json.dumps((TOOLS/'marked/lib/marked.esm.js').as_uri()) + ";let s='';for await(const c of process.stdin)s+=c;process.stdout.write(marked.parse(s));"
    return subprocess.run(['node','--input-type=module','-e',code],input=text,text=True,capture_output=True,check=True,encoding='utf-8').stdout

def diagram(source, name):
    mmd = OUT/'diagrams'/f'{name}.mmd'; svg = mmd.with_suffix('.svg')
    if mmd.exists() and svg.exists() and mmd.read_text(encoding='utf-8') == source:
        return '/diagrams/'+svg.name
    write(mmd, source)
    env = os.environ.copy()
    browsers = list((Path(os.environ.get('USERPROFILE','C:/Users/Admin'))/'.cache/puppeteer/chrome').glob('win64-*/chrome-win64/chrome.exe'))
    if browsers: env['PUPPETEER_EXECUTABLE_PATH'] = str(sorted(browsers)[-1])
    result = subprocess.run(['node',str(TOOLS/'@mermaid-js/mermaid-cli/src/cli.js'),'-i',str(mmd),'-o',str(svg),'-b','white','-q'],capture_output=True,text=True,encoding='utf-8',env=env)
    if result.returncode: raise RuntimeError(name + ': ' + result.stderr)
    return '/diagrams/'+svg.name

def erd(schema, names):
    byname={t['name']:t for t in schema['tables']}; out=['erDiagram']
    for name in sorted(names):
        table=byname[name]; keys={c for con in table.get('constraints',[]) if con.get('type') in ['PRIMARY KEY','FOREIGN KEY'] for c in con.get('columns',[])}
        selected=[c for c in table.get('columns',[]) if c['name'] in keys][:8]
        if selected:
            out.append(' '+name.replace('public.','')+' {')
            for c in selected: out.append('  '+re.sub(r'\W','_',c['type'])+' '+c['name'])
            out.append(' }')
        else: out.append(' '+name.replace('public.','')+' {\n  text entity\n }')
    for r in schema.get('relations',[]):
        if r['table'] in names and r['parent_table'] in names:
            parent='||' if r.get('parent_cardinality')=='exactly_one' else '|o'
            child='o{' if r.get('cardinality') in ['zero_or_more','one_or_more'] else 'o|'
            out.append(' '+r['parent_table'].replace('public.','')+' '+parent+'--'+child+' '+r['table'].replace('public.','')+' : "'+','.join(r['columns'])+'"')
    return '\n'.join(out)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--catalog',default='outputs/gcp-db-clean-audit/tbls-source-derived.json');ap.add_argument('--provenance',default='SOURCE-DERIVED 2026-10-13 baseline+002/004/005 BEFORE engineering fixes; NOT LIVE')
    args=ap.parse_args(); catalog=ROOT/args.catalog; schema=json.loads(catalog.read_text(encoding='utf-8'))
    domains=json.loads((ROOT/'outputs/gcp-db-clean-audit/domains.source.json').read_text(encoding='utf-8'))
    ownership={}
    for line in (ROOT/'docs/gcp-database-clean-audit/DATA_OWNERSHIP_AND_INTEGRITY.md').read_text(encoding='utf-8').splitlines():
        if line.startswith('| ') and re.search(r'/ `[^`]+`',line):
            cells=[x.strip() for x in line.strip('|').split('|')];name=re.search(r'/ `([^`]+)`',cells[0]).group(1);ownership[name]=cells[1:]
    provenance='<p class="badge">'+html.escape(args.provenance)+'. Không có live rows/PII. Catalog SHA256 '+hashlib.sha256(catalog.read_bytes()).hexdigest()[:16]+'</p>'
    missing=[]; rendered=[]; pending=[]
    for folder in ['onboarding','architecture','database','gcp']:
        if (ROOT/'docs'/folder).exists(): pending += list((ROOT/'docs'/folder).rglob('*.md'))
    pending += [ROOT/'docs'/x for x in ['ENGINEERING_PROGRESS.md','CORRECTNESS_AND_TEST_RESULTS.md','GCP_DEPLOYMENT_READINESS.md'] if (ROOT/'docs'/x).exists()]
    seen=set()
    while pending:
        path=pending.pop(0)
        if path in seen:continue
        seen.add(path);text=path.read_text(encoding='utf-8');rel=path.relative_to(ROOT).as_posix()
        n=[0]
        def render_diagram(m):
            n[0]+=1; key=re.sub(r'\W','_',rel)+'_'+str(n[0]); return '<img class="diagram" alt="'+key+'" src="'+diagram(m.group(1),key)+'">'
        text=re.sub(r'```mermaid\s*\n(.*?)```',render_diagram,text,flags=re.S)
        def link(m):
            label,target=m.group(1),m.group(2);target=target.strip('<>')
            if re.match(r'[a-z]+://|mailto:|#',target):return m.group(0)
            base,_,anchor=target.partition('#');p=(path.parent/unquote(base)).resolve()
            if not p.exists():missing.append({'from':rel,'target':target});return m.group(0)
            if not p.is_relative_to(ROOT):raise ValueError('Link outside workspace: '+target)
            dest=p.relative_to(ROOT).as_posix()
            if p.suffix=='.md' and not dest.startswith('docs/archive/'):
                pending.append(p);url='/pages/'+dest[:-3]+'.html'
            elif p.suffix in ['.ts','.tsx','.sql','.json','.py','.mjs','.c4','.likec4','.md','.yaml','.yml'] and not re.search(r'(^|/)(\.env|secrets?)(/|\.|$)',dest,re.I):
                url='/source/'+dest+'.html';write(OUT/url.lstrip('/'),page(dest,'<h1>'+html.escape(dest)+'</h1><pre>'+html.escape(p.read_text(encoding='utf-8'))+'</pre>'))
            else:return m.group(0)
            return '['+label+']('+url+('#'+anchor if anchor else '')+')'
        text=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',link,text)
        write(OUT/'pages'/Path(rel).with_suffix('.html'),page(path.stem,md_html(text)));rendered.append(rel)
    tables=schema['tables'];names={t['name'] for t in tables};full=diagram(erd(schema,names),'database_full');cards=[]
    for domain in sorted(set(domains.values())):
        slug=re.sub(r'\W+','-',domain.lower()).strip('-');local={n for n in names if domains.get(n.removeprefix('public.'))==domain}
        # Only one-hop parents are added, visibly marked as context, to keep views readable.
        parents={r['parent_table'] for r in schema.get('relations',[]) if r['table'] in local};view=local|parents
        image=diagram(erd(schema,view),'domain_'+slug)
        body=provenance+'<h1>'+html.escape(domain)+'</h1><p>Parent tables outside domain chỉ để giải thích FK. Không đổi ownership.</p><img class="diagram" src="'+image+'"><ul>'
        for name in sorted(local):body+='<li><a href="/database/tables/'+name.removeprefix('public.')+'.html">'+name+'</a></li>'
        write(OUT/'database/domains'/f'{slug}.html',page(domain,body+'</ul>'))
        cards.append('<a class="card" href="/database/domains/'+slug+'.html">'+html.escape(domain)+'<br>'+str(len(local))+' bảng</a>')
    functions=schema.get('functions',[])
    # JDBC/tbls catalogs list signatures, not bodies. Read current forward-only
    # source definitions for lexical dependency evidence, preserving provenance.
    definitions={}
    for sqlpath in sorted((ROOT/'apps/promptify-intrepid/gcp/sql').glob('*.sql')):
        sql=sqlpath.read_text(encoding='utf-8')
        pattern=r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([\w]+)\s*\([^;]*?\bAS\s+(\$[\w]*\$)(.*?)\2'
        for match in re.finditer(pattern,sql,re.I|re.S):definitions[match.group(1)]=(match.group(3),sqlpath.relative_to(ROOT).as_posix())
    for t in tables:
        short=t['name'].removeprefix('public.');annotation=ownership.get(short,['Purpose chưa annotated','','','','']);purpose,writer,reader,scope,lifecycle=(annotation+['']*5)[:5]
        if short in ['lessons','lesson_rubric_criteria','product_studio']:writer+='; USER APPROVED 14/10 class-local Studio; inspect current migration/resolver for applied behavior'
        body=provenance+'<h1>'+short+'</h1><p><b>Domain:</b> '+html.escape(domains.get(short,'Unclassified'))+'</p>'
        for label,value in [('Mục đích / trạng thái độc lập',purpose),('Authoritative writer / operations',writer),('Readers / consumers',reader),('Security / scope',scope),('Lifecycle / retention',lifecycle)]:body+='<h2>'+label+'</h2><p>'+html.escape(value)+'</p>'
        body+='<h2>Vì sao tách riêng?</h2><p>'+html.escape(purpose.split('State:')[-1])+' — giữ identity, lifecycle, scope và cardinality đã khai báo; không merge vì ít rows hoặc chỉ vì code usage.</p>'
        body+='<h2>Columns</h2><table><tr><th>Cột</th><th>Ý nghĩa / boundary</th><th>Type</th><th>Nullable</th><th>Default</th></tr>'
        for c in t.get('columns',[]):
            name=c['name'];meaning={'id':'Stable entity identity','class_id':'Class security/lifecycle scope','user_id':'Business actor UUID','learner_id':'Learner historical identity','lesson_id':'Canonical lesson reference','version_id':'Immutable SOP version reference','created_at':'Creation timestamp','updated_at':'Last update timestamp','model':'Embedding/provider model provenance','embedding':'Vector values; dimensions/model space invariant','config':'Validated class configuration; revision controlled','revision':'Optimistic concurrency/projection version','status':'Lifecycle state; inspect CHECK and authoritative writer'}.get(name,'Domain field; exact semantics from CHECK/default and referenced writer; do not invent business meaning')
            body+='<tr>'+''.join('<td>'+html.escape(str(v))+'</td>' for v in [name,meaning,c.get('type'),c.get('nullable'),c.get('default')])+'</tr>'
        body+='</table><h2>Constraints / PK / FK / CHECK</h2><pre>'+html.escape('\n'.join(c.get('def','') for c in t.get('constraints',[])))+'</pre><h2>Relations / cardinality</h2><ul>'
        for r in schema.get('relations',[]):
            if t['name'] in [r['table'],r['parent_table']]:body+='<li>'+html.escape(r['table']+' ('+','.join(r['columns'])+') → '+r['parent_table']+' ('+','.join(r['parent_columns'])+'); child '+r.get('cardinality','unknown')+', parent '+r.get('parent_cardinality','unknown'))+'</li>'
        body+='</ul><h2>Triggers</h2><pre>'+html.escape('\n'.join(x.get('def',str(x)) for x in t.get('triggers',[])))+'</pre><h2>SQL routines (lexical source references)</h2><p>Lexical dependency is evidence to inspect, not proof of live invocation; dynamic SQL may add dependencies.</p><ul>'
        for f in functions:
            fname=f.get('name','unknown');base=fname.removeprefix('public.').split('(')[0];definition,sqlsource=definitions.get(base,(f.get('def',f.get('definition','')),'audit register'))
            if re.search(r'\b'+re.escape(short)+r'\b',definition):body+='<li>'+html.escape(fname+' — '+sqlsource)+'</li>'
        body+='</ul><h2>Synthetic example</h2><pre>'+html.escape(json.dumps({c['name']:('00000000-0000-4000-8000-000000000001' if c.get('type')=='uuid' else 'SYNTHETIC_'+c['name']) for c in t.get('columns',[])[:4]},ensure_ascii=False,indent=2))+'</pre><p>Ví dụ minh họa key, không phải fixture hợp lệ để INSERT; không dùng PII thật.</p>'
        body+='<p><a href="/pages/docs/gcp-database-clean-audit/TABLE_FUNCTION_TRIGGER_DEPENDENCIES.html">Full RPC/trigger/policy register</a></p>'
        write(OUT/'database/tables'/f'{short}.html',page(short,body))
    write(OUT/'database/index.html',page('Database explorer',provenance+'<h1>Database explorer — '+str(len(tables))+' bảng</h1><div class="cards">'+''.join(cards)+'</div><h2>Full ERD</h2><p>Zoom bằng mở SVG riêng; domain views phù hợp để bắt đầu.</p><a href="'+full+'"><img class="diagram" src="'+full+'"></a><h2>Tất cả bảng</h2><ul>'+''.join('<li><a href="/database/tables/'+n.removeprefix('public.')+'.html">'+n+'</a></li>' for n in sorted(names))+'</ul>'))
    write(OUT/'index.html',page('Bắt đầu','<h1>Hiểu Promptify Intrepid từ nghiệp vụ tới database</h1>'+provenance+'<div class="cards"><a class="card" href="/pages/docs/onboarding/PROJECT_IN_10_MINUTES.html">10 phút: sản phẩm</a><a class="card" href="/pages/docs/onboarding/DEVELOPER_WALKTHROUGH.html">30 phút: lần theo code</a><a class="card" href="/architecture/">5 LikeC4 views</a><a class="card" href="/pages/docs/architecture/runtime-flows/README.html">10 runtime flows</a><a class="card" href="/database/">50 bảng / 9 domains</a><a class="card" href="/schemaspy/">SchemaSpy native catalog</a><a class="card" href="/pages/docs/gcp/SETUP_GUIDE.html">GCP setup</a></div>'))
    result={'catalog':str(catalog.relative_to(ROOT)),'catalog_sha256':hashlib.sha256(catalog.read_bytes()).hexdigest(),'provenance':args.provenance,'table_count':len(tables),'fk_count':len(schema.get('relations',[])),'domain_count':len(cards),'markdown_pages':len(rendered),'svg_count':len(list((OUT/'diagrams').glob('*.svg'))),'missing_links':missing}
    write(OUT/'build-results.json',json.dumps(result,indent=2,ensure_ascii=False));print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
