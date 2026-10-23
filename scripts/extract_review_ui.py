"""Extract the last complete version of each UI from the approved review DOCX.

No production data, environment files, migrations, or historical prototypes change.
"""
from pathlib import Path
import hashlib
import json
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/Promptify - UI code - for Review.docx'
DEST = ROOT / 'design-drafts/review-authority'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def main():
    with zipfile.ZipFile(SOURCE) as archive:
        document = ET.fromstring(archive.read('word/document.xml'))
    text = '\n'.join(''.join(t.text or '' for t in p.findall('.//w:t', NS))
                     for p in document.findall('.//w:p', NS))
    blocks = list(re.finditer(r'<!DOCTYPE html>.*?</html>', text, re.S | re.I))
    selected = {}
    for ordinal, match in enumerate(blocks):
        html = match.group()
        title = re.search(r'<title>(.*?)</title>', html, re.S).group(1)
        explicit = re.search(r'UI-(\d{2})', title)
        if explicit:
            number = int(explicit.group(1))
        else:
            names = {'Destination': 0, 'Enterprise Authentication': 1,
                     'Profile & Department': 2, 'Access Denied': 3,
                     'Department Training Hub': 4}
            number = next((value for name, value in names.items() if name in title), None)
        if number is None:
            raise ValueError(f'Unmapped HTML block {ordinal}: {title}')
        selected[number] = (ordinal, match, title)
    if set(selected) != set(range(16)):
        raise ValueError(f'Incomplete UI inventory: {sorted(selected)}')
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = []
    for number, (ordinal, match, title) in sorted(selected.items()):
        html = match.group()
        # The last Word example contains Markdown escaping in JavaScript handlers.
        normalized = html.replace('\\$event', '$event')
        name = f'UI-{number:02}.html'
        (DEST / name).write_text(normalized, encoding='utf-8')
        manifest.append({'ui_id': f'UI-{number:02}', 'title': title,
                         'selected_block': ordinal, 'document_line': text[:match.start()].count('\n') + 1,
                         'source_sha256': hashlib.sha256(html.encode()).hexdigest(),
                         'normalized_sha256': hashlib.sha256(normalized.encode()).hexdigest(),
                         'normalizations': ['Markdown escape before $event'] if normalized != html else [],
                         'file': name})
    payload = {'document': str(SOURCE.relative_to(ROOT)),
               'document_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
               'selection': 'Last complete HTML block per UI in document order',
               'candidate_blocks': len(blocks), 'screens': manifest}
    (DEST / 'manifest.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'candidate_blocks': len(blocks), 'screens': len(manifest),
                      'selected_blocks': [m['selected_block'] for m in manifest]}))

if __name__ == '__main__':
    main()
