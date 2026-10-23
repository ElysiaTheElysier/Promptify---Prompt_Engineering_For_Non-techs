import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specsDir = path.join(root, 'curriculum-specs');

const files = (await readdir(specsDir)).filter((f) => f.endsWith('.md'));
let count = 0;

for (const file of files) {
  const filePath = path.join(specsDir, file);
  let content = await readFile(filePath, 'utf8');
  const original = content;

  // Replace LaTeX arrows
  content = content.replaceAll('$\\rightarrow$', '→');
  content = content.replaceAll('$\\longrightarrow$', '⟶');
  content = content.replaceAll('$\\leftarrow$', '←');
  content = content.replaceAll('$\\Rightarrow$', '⇒');
  content = content.replaceAll('$\\le 320$', '≤ 320');
  content = content.replaceAll('$$', '');
  content = content.replaceAll('\\text{Thought (Tư duy)} \\longrightarrow \\text{Action (Hành động Tra cứu)} \\longrightarrow \\text{Observation (Quan sát Kết quả)} \\longrightarrow \\text{Response (Phản hồi Cuối)}', 'THOUGHT (Tư duy) ⟶ ACTION (Hành động tra cứu) ⟶ OBSERVATION (Quan sát kết quả) ⟶ RESPONSE (Phản hồi cuối)');
  content = content.replaceAll('$A$', 'A');
  content = content.replaceAll('$B$', 'B');
  content = content.replaceAll('$A - B$', 'A - B');

  if (content !== original) {
    await writeFile(filePath, content, 'utf8');
    count++;
    console.log(`Cleaned: ${file}`);
  }
}

console.log(`Successfully updated ${count} files.`);
