import os, subprocess, pathlib, json, time, sys, shutil
sys.stdout.reconfigure(encoding='utf-8',errors='replace')
root=pathlib.Path(__file__).resolve().parents[1]
node=shutil.which('node')
if not node: raise SystemExit('Node.js is required')
env=os.environ.copy()
for k in list(env):
    if any(x in k for x in ['SUPABASE','OPENAI','GEMINI','GOOGLE_API','STAGING_']): env.pop(k)
env['PATH']=str(pathlib.Path(node).parent)+os.pathsep+env.get('PATH','')
skip={'test_live_gemini.ts','verify_live_api_endpoint.ts','verify_live_evaluate_endpoint.ts','verify_generation_grounding_and_evaluation.ts','verify_progress_migration_staging.ts'}
commands=[('build',[node,'node_modules/typescript/bin/tsc']),('vite-build',[node,'node_modules/vite/bin/vite.js','build'])]
commands += [(p.name,[node,'node_modules/tsx/dist/cli.mjs',str(p.relative_to(root))]) for p in sorted((root/'test').glob('*.ts')) if p.name not in skip]
results=[]
for name,cmd in commands:
    start=time.time()
    try:
        p=subprocess.run(cmd,cwd=root,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=90)
        output=p.stdout+p.stderr
        result={'name':name,'exit':p.returncode,'seconds':round(time.time()-start,2),'output':output}
    except subprocess.TimeoutExpired:
        result={'name':name,'exit':-1,'seconds':90,'output':'Timeout after 90 seconds'}
    results.append(result)
    print(name, result['exit'], flush=True)
    if result['exit']: print(result['output'][:1600],flush=True)
(root/'outputs').mkdir(exist_ok=True)
(root/'outputs/offline_test_results.json').write_text(json.dumps({'results':results,'skipped':sorted(skip)},ensure_ascii=False,indent=2),encoding='utf-8')
