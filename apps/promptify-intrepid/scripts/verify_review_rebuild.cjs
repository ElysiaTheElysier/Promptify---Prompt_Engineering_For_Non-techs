const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const base = process.env.REVIEW_UI_URL || 'http://127.0.0.1:5178';
const out = path.resolve('outputs/rebuild-audit');
const templates = JSON.parse(fs.readFileSync('src/components/rebuild/review-templates.json', 'utf8'));
const nodes = n => [n, ...(n.children || []).flatMap(nodes)];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const errors = [], results = [], warnings = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' });
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (/Reference (expression|action)/.test(m.text())) errors.push(m.text()); else if (m.type() === 'error') warnings.push(m.text()); });
    async function go(i) {
      await page.goto(base + '/rebuild?ui=' + String(i).padStart(2, '0'));
      await page.locator('[data-ui="UI-' + String(i).padStart(2, '0') + '"]').waitFor();
      await page.waitForTimeout(100);
    }
    async function action(i, expression) {
      await page.locator('[data-ui="UI-' + String(i).padStart(2, '0') + '"]').waitFor();
      await page.waitForTimeout(50);
      const candidates = nodes(templates[i].body).filter(n => n.attrs?.['@click']?.includes(expression));
      for (const node of candidates) {
        const locator = page.locator('[data-source-node="' + node.id + '"]').first();
        if (await locator.isVisible()) { await locator.click(); return; }
      }
      throw new Error('No visible action for UI-' + i + ': ' + expression);
    }
    for (let i = 0; i < 16; i++) {
      await go(i);
      const content = await page.locator('[data-ui]').innerText();
      assert.ok(content.length > 80, 'Screen must contain reference content: ' + i);
      await page.screenshot({ path: path.join(out, 'UI-' + String(i).padStart(2, '0') + '.png') });
      results.push({ ui: i, check: 'desktop render', passed: true });
    }
    await go(11);
    await page.getByRole('link', { name: /Inspect Sample Runs/ }).click();
    await page.waitForURL(/ui=10/);
    assert.ok(page.url().includes('learnerId=L-101'));
    await page.getByRole('link', { name: /Edit Master|Curriculum|Studio/ }).first().click();
    await page.waitForURL(/ui=11/);
    results.push({ ui: 11, check: 'Studio to Inspector and back preserves learner context', passed: true });
    for (const tab of ['scope', 'prompt', 'materials', 'rubric', 'awards']) {
      await action(11, "activeTab = '" + tab + "'");
      await page.screenshot({ path: path.join(out, 'UI-11-' + tab + '.png') });
      results.push({ ui: 11, check: 'final Studio tab: ' + tab, passed: true });
    }
    await action(11, "activeTab = 'rubric'");
    const slider = page.locator('input[type="range"]').first();
    await slider.fill('40');
    await slider.dispatchEvent('input');
    const weights = await page.locator('input[type="range"]').evaluateAll(inputs => inputs.map(i => Number(i.value)));
    assert.equal(weights.reduce((sum, weight) => sum + weight, 0), 100, 'Rubric auto-balances to 100%');
    results.push({ ui: 11, check: 'weight 40 auto-balances remaining criteria', passed: true, weights });
    await action(11, "activeTab = 'prompt'");
    const variablesBefore = await page.locator('input').count();
    await action(11, 'addVariable()');
    assert.ok(await page.locator('input').count() > variablesBefore);
    await action(11, 'deleteVariable(');
    assert.equal(await page.locator('input').count(), variablesBefore);
    await action(11, 'toggleChip(chip)');
    await action(11, "activeTab = 'rubric'");
    assert.equal(await page.locator('input[type="range"]:enabled').count(), 4, 'Disabled scaffold disables corresponding rubric criterion');
    assert.equal(Number(await page.locator('input[type="range"]:disabled').inputValue()), 0);
    results.push({ ui: 11, check: 'variable CRUD and scaffold-rubric synchronization', passed: true });
    await go(5);
    const editor = page.locator('textarea').first();
    await editor.fill('prefixsuffix');
    await editor.evaluate(el => { el.focus(); el.setSelectionRange(6, 6); });
    await action(5, "activePopover === 'role'");
    await action(5, "insertAtCursor('[Role]");
    assert.match(await editor.inputValue(), /^prefix\[Role\]:.*\nsuffix$/);
    await action(5, 'runPrompt()');
    await page.waitForTimeout(1100);
    assert.ok(await page.getByText(/AI Response Output/).count());
    await page.getByRole('link', { name: /Compare Diff/ }).click();
    await page.waitForURL(/ui=06/);
    results.push({ ui: 5, check: 'cursor insertion, simulated run and compare navigation', passed: true });
    await go(9);
    for (const phase of ['pulse', 'studio', 'live', 'all']) {
      await action(9, "activePhase = '" + phase + "'");
      results.push({ ui: 9, check: 'phase: ' + phase, passed: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (let i = 0; i < 16; i++) {
      await go(i);
      const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) > innerWidth + 1);
      results.push({ ui: i, check: 'mobile page overflow', passed: !overflow });
      await page.screenshot({ path: path.join(out, 'UI-' + String(i).padStart(2, '0') + '-mobile.png') });
    }
    fs.writeFileSync(path.join(out, 'browser-checks.json'), JSON.stringify({ results, errors, warnings }, null, 2));
    console.log(JSON.stringify({ checks: results.length, failed: results.filter(r => !r.passed), errors, warnings: warnings.slice(0, 12) }, null, 2));
    assert.equal(errors.length, 0, 'No reference expression/action or page errors');
    assert.equal(warnings.length, 0, 'No React console errors');
    assert.ok(results.every(r => r.passed), 'All checks pass');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
