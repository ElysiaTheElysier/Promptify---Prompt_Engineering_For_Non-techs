"""Validate and package the independently rendered UI proposal artifacts."""
import json
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
out = root / 'outputs' / 'ui-combined'
manifest = json.loads((out / 'manifest.json').read_text(encoding='utf-8'))
assert len(manifest) == 16
runtime = json.loads((out / 'runtime-checks.json').read_text(encoding='utf-8'))
assert len(runtime) == 16 and all(not x['errors'] and not x['overflow'] and not x['mobile_overflow'] for x in runtime)
reports = [json.loads((out / name).read_text(encoding='utf-8')) for name in ['mockup-checks.json', 'update-05-09-11-checks.json']]
assert all(not r['errors'] and not r['network'] and all(t['passed'] for t in r['results']) for r in reports)
canvas = Image.new('RGB', (1920, 1480), '#f8fafc')
draw = ImageDraw.Draw(canvas)
for i, item in enumerate(manifest):
    assert item['order'] == i + 1 and item['ui_id'] == f'UI-{i:02}' and item['runtime_verified']
    assert (out / item['html_file']).is_file()
    image = Image.open(out / item['screenshot_file']).convert('RGB')
    assert image.size == (1440, 1024)
    image.thumbnail((480, 340))
    x, y = (i % 4) * 480, (i // 4) * 370
    canvas.paste(image, (x, y + 24))
    draw.text((x + 12, y + 5), item['ui_id'] + '  ' + item['name'], fill='#0f172a')
canvas.save(out / 'contact-sheet.png')
files = [out / name for name in ['index.html', 'manifest.json', 'runtime-checks.json', 'mockup-checks.json', 'update-05-09-11-checks.json', 'template-diagnostics.json', 'mockup-alignment.md', 'guardrail-compliance.md', 'production-baseline-proof.json', 'DESIGN-NOTES.md', 'contact-sheet.png']]
files.extend(out / m['html_file'] for m in manifest)
files.extend(out / m['screenshot_file'] for m in manifest)
archive = out.parent / 'Promptify_Combined_UI_16.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=4) as package:
    for file in files:
        package.write(file, file.relative_to(out).as_posix())
with zipfile.ZipFile(archive) as package:
    assert package.testzip() is None
    assert len([n for n in package.namelist() if n.startswith('html/') and n.endswith('.html')]) == 16
print(json.dumps({'html': 16, 'png': 16, 'checks_passed': sum(len(r['results']) for r in reports), 'zip_bytes': archive.stat().st_size, 'archive': str(archive)}, indent=2))
