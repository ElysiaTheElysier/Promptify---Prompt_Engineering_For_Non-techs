"""Snapshot handoff inputs without environment files or dependencies."""
from pathlib import Path
import shutil, hashlib, json, subprocess, re

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'design-drafts/rebuild-source-of-truth'
DEST.mkdir(parents=True, exist_ok=True)
inventory, missing = [], []
def copy(source, target, authority):
    source = Path(source)
    if not source.exists():
        missing.append(str(source)); return
    if source.is_dir():
        for f in sorted(source.rglob('*')):
            if f.is_file() and not any(p in {'node_modules','.git','__pycache__'} for p in f.parts) and not f.name.startswith('.env'):
                copy(f, Path(target) / f.relative_to(source), authority)
        return
    out = DEST / target
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, out)
    inventory.append(dict(source=str(source), file=str(Path(target)).replace('\\','/'), authority=authority,
                          bytes=out.stat().st_size, sha256=hashlib.sha256(out.read_bytes()).hexdigest()))

copy(ROOT/'outputs/ui-comment-revision', 'ui/latest', 'LATEST_UI_TARGET_PROTOTYPE')
copy(ROOT/'docs/UI Mockup-20261006T140854Z-1-001/UI Mockup', 'ui/mockup', 'WORDING_FUNCTION_REFERENCE')
copy(ROOT/'design-drafts/combined-ui', 'ui/source', 'PROTOTYPE_SOURCE_AND_BRAND_REFERENCE')
for f in (ROOT/'docs').glob('*'):
    if f.is_file(): copy(f, 'documents/'+f.name, 'PLANNING_OR_STATUS_READ_PRECEDENCE')
copy(ROOT/'docs/archive/business-drafts/STAKEHOLDER_NOTES_2026-10-05.txt', 'requirements/stakeholder-notes.txt', 'HISTORICAL_PRODUCT_INPUT')
attachments = Path('C:/Users/Admin/.codex/attachments')
for ident, name, authority in [
 ('313fe708-0ce1-45a3-90a7-58087029209f','facilitator-latest-flow.txt','LATEST_FACILITATOR_FLOW'),
 ('4340111b-e8ea-441b-9330-2b5545b2bed6','UI-05-teacher-source.txt','TEACHER_UI_UPDATE'),
 ('9641bc9b-ecbc-437e-bf79-dd4a0a3c2d61','UI-09-v1.1-teacher-source.txt','TEACHER_UI_UPDATE'),
 ('a4978f3c-113b-4a74-a580-ce32c9672bdb','UI-11-v1.2-teacher-source.txt','TEACHER_UI_UPDATE'),
 ('948d1ff5-2ba9-408b-8d62-63be2f9c24a9','guardrail-latest.txt','GUARDRAIL_WITH_USER_OVERRIDES')]:
    copy(attachments/ident/'Pasted text.txt', 'requirements/'+name, authority)
for name in ['design-taste-frontend','ui-ux-pro-max']:
    copy(ROOT/'.agents/skills'/name, 'guardrails/skills/'+name, 'REQUIRED_DESIGN_SKILL')
for name in ['src','api','supabase','test','curriculum-specs','curriculum-levels','public']:
    copy(ROOT/name, 'implementation-reference/'+name, 'PARTIAL_RUNTIME_REFERENCE_NOT_UI_TARGET')
for name in ['package.json','package-lock.json','vite.config.ts','tsconfig.json','tsconfig.node.json','tailwind.config.js','index.html','vercel.json','AGENTS.md']:
    if (ROOT/name).exists(): copy(ROOT/name, 'implementation-reference/'+name, 'BUILD_OR_REPOSITORY_CONTRACT')
for f in (ROOT/'scripts').glob('*'):
    if f.is_file(): copy(f,'implementation-reference/scripts/'+f.name,'GENERATOR_OR_CHECK')
copy(Path('C:/Users/Admin/Downloads/Promptify_UI_Mockup_vs_Combined_GAP.csv'), 'requirements/comments-original.csv', 'USER_COMMENTS')

ui_files = sorted((DEST/'ui/latest/html').glob('*.html'))
assert len(ui_files) == 16, f'Expected 16 UI, found {len(ui_files)}'
(DEST/'UI_INDEX.md').write_text('# 16 UI mới nhất\n\nHTML là prototype tương tác; không chứng minh backend đã hoạt động.\n\n' + '\n'.join(f'- [{f.stem}]({f.relative_to(DEST).as_posix()})' for f in ui_files), encoding='utf-8')
head = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
status = subprocess.check_output(['git','status','--short'],cwd=ROOT,text=True)
(DEST/'GIT_SNAPSHOT.txt').write_text(f'Branch: rebuild\nHEAD: {head}\nSnapshot includes uncommitted files; HEAD alone cannot reproduce it.\n\n{status}',encoding='utf-8')
(DEST/'SOURCE_INVENTORY.json').write_text(json.dumps({'files':inventory,'missing_originals':missing},ensure_ascii=False,indent=2),encoding='utf-8')
for row in inventory:
    assert hashlib.sha256((DEST/row['file']).read_bytes()).hexdigest() == row['sha256']
assert not list(DEST.rglob('.env*'))
print(json.dumps({'folder':str(DEST),'ui_count':len(ui_files),'file_count':len(inventory),'missing_originals':missing},ensure_ascii=False,indent=2))
