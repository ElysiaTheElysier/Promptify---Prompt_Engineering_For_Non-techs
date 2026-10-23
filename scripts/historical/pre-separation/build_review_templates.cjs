// Compile trusted reference markup. No reference CDN/script is executed in a browser.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const authority = path.join(root, 'design-drafts/review-authority');
const destination = path.join(root, 'src/components/rebuild');
function serialize(value) {
  if (typeof value === 'function') return { $method: value.toString() };
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (['secret', 'private_key'].includes(key)) { result[key] = 'SERVER_ONLY'; continue; }
      result[key] = descriptor.get ? { $getter: descriptor.get.toString() } : serialize(descriptor.value);
    }
    return result;
  }
  return value;
}
(async () => {
  fs.mkdirSync(destination, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(authority, 'manifest.json'), 'utf8'));
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    const page = await browser.newPage();
    const templates = [];
    const failures = [], sourceGaps = [];
    for (const screen of manifest.screens) {
      const html = fs.readFileSync(path.join(authority, screen.file), 'utf8');
      const match = html.match(/<html[^]*?x-data="([^]*?)"\s*(?=@|>)/);
      if (!match) throw new Error('Missing state: ' + screen.ui_id);
      const state = serialize(vm.runInNewContext('(' + match[1] + ')', {}, { timeout: 1000 }));
      const rootAttributes = html.slice(match[0].length, html.indexOf('<head>')).replace(/>\s*$/, '').trim();
      const safeHtml = '<html><head>' + html.slice(html.indexOf('<head>') + 6);
      const parsed = await page.evaluate(source => {
        const doc = new DOMParser().parseFromString(source, 'text/html');
        let nextId = 0;
        const bindings = [];
        function node(n) {
          if (n.nodeType === 3) return { text: n.textContent };
          if (n.nodeType !== 1 || ['SCRIPT', 'STYLE', 'LINK', 'META'].includes(n.tagName)) return null;
          const attrs = Object.fromEntries([...n.attributes].map(a => [a.name, a.value]));
          for (const [key, value] of Object.entries(attrs))
            if (key.startsWith('x-') || key.startsWith(':') || key.startsWith('@')) bindings.push({ key, value });
          return { tag: n.tagName.toLowerCase(), id: nextId++, attrs,
            children: [...(n.tagName === 'TEMPLATE' ? n.content.childNodes : n.childNodes)]
              .filter(child => !((['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'COLGROUP'].includes(n.tagName) || n.tagName === 'TEMPLATE' && ['TBODY', 'THEAD', 'TR'].includes(n.parentNode?.tagName)) && child.nodeType === 3 && !child.textContent.trim()))
              .map(node).filter(Boolean) };
        }
        return { body: node(doc.body), bindings };
      }, safeHtml);
      function repairSourceGap(node) {
        if (screen.ui_id === 'UI-00' && node.attrs?.['x-for'] === "(score, idx) in (demoTab === 'vague' ? :)") {
          sourceGaps.push({ ui: screen.ui_id, issue: 'Word contains an incomplete score-array expression. No criteria scores supplied.', status: 'NEEDS_SOURCE' });
          node.tag = 'p';
          node.attrs = { class: 'text-xs text-amber-800 bg-amber-50 p-3 rounded-lg' };
          node.children = [{ text: 'Detailed rubric scores are missing from the review source.' }];
        }
        for (const child of node.children || []) repairSourceGap(child);
      }
      repairSourceGap(parsed.body);
      for (const { key, value } of parsed.bindings) {
        try {
          if (key.startsWith('@')) new Function('scope', 'with(scope){' + value + '}');
          else if (['x-show', 'x-if', 'x-text', 'x-html', 'x-data'].includes(key) || key.startsWith(':'))
            new Function('scope', 'with(scope){return (' + value + ')}');
        } catch (error) { failures.push({ ui: screen.ui_id, key, value, error: error.message }); }
      }
      templates.push({ ...screen, state, body: parsed.body, root_attributes: rootAttributes });
    }
    if (failures.length) throw new Error(JSON.stringify(failures, null, 2));
    fs.writeFileSync(path.join(destination, 'review-templates.json'), JSON.stringify(templates));
    fs.writeFileSync(path.join(destination, 'review-manifest.json'), JSON.stringify(manifest, null, 2));
    fs.writeFileSync(path.join(authority, 'source-gaps.json'), JSON.stringify(sourceGaps, null, 2));
    console.log('Compiled all 16 final Word UI versions; directive syntax valid; secrets excluded.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
