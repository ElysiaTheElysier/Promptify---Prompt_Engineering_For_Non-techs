import React from 'react';

interface Props {
  content: string;
  className?: string;
  size?: 'xs' | 'sm';
}

/**
 * Trình hiển thị Markdown đa năng cho môi trường nghiệp vụ đào tạo Promptify.
 * Hỗ trợ:
 * - Khối mã code fences (```lang ... ```)
 * - Bảng biểu chuẩn (|...|)
 * - Tiêu đề (#, ##, ###, ####)
 * - Danh sách số (1. 2.) & Danh sách gạch đầu dòng lồng nhau (- / *)
 * - In đậm (**text**), In nghiêng (*text*), Code nội dòng (`text`)
 * - Trích dẫn / Ghi chú (> ...)
 */
/**
 * Tự động chuyển đổi các ký hiệu LaTeX toán học sang Unicode thân thiện với người dùng văn phòng
 */
function sanitizeLatexAndSymbols(text: string): string {
  if (!text) return '';
  return text
    // LaTeX arrows with math delimiters
    .replace(/\$\\rightarrow\$/g, '→')
    .replace(/\$\\longrightarrow\$/g, '⟶')
    .replace(/\$\\leftarrow\$/g, '←')
    .replace(/\$\\longleftarrow\$/g, '⟵')
    .replace(/\$\\Rightarrow\$/g, '⇒')
    .replace(/\$\\Longrightarrow\$/g, '⟹')
    .replace(/\$\\Leftrightarrow\$/g, '⇔')
    // Raw LaTeX arrows without math delimiters
    .replace(/\\rightarrow\b/g, '→')
    .replace(/\\longrightarrow\b/g, '⟶')
    .replace(/\\leftarrow\b/g, '←')
    .replace(/\\Rightarrow\b/g, '⇒')
    // Inequalities & math symbols
    .replace(/\$\\le 320\$/g, '≤ 320')
    .replace(/\$\\le\$/g, '≤')
    .replace(/\$\\ge\$/g, '≥')
    .replace(/\\le\b/g, '≤')
    .replace(/\\ge\b/g, '≥')
    .replace(/\$\\approx\$/g, '≈')
    .replace(/\$\\neq\$/g, '≠')
    .replace(/\$\\times\$/g, '×')
    // LaTeX text commands: \text{...} -> ...
    .replace(/\\text\{([^}]+)\}/g, '$1')
    // Double dollars $$...$$
    .replace(/\$\$/g, '')
    // Paired math variables like $A$, $B$, $A - B$, $N$
    .replace(/\$([A-Za-z0-9\s\-+*/=<>]+)\$/g, '$1');
}

export const MarkdownView: React.FC<Props> = ({ content, className = '', size = 'xs' }) => {
  if (!content) {
    return <div className="text-slate-400 italic text-xs">Chưa có nội dung.</div>;
  }

  const sanitizedContent = sanitizeLatexAndSymbols(content);
  const lines = sanitizedContent.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  const bodyTextClass = size === 'sm' ? 'text-sm leading-6' : 'text-xs leading-relaxed';

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Khối code block (``` ... ```)
    if (trimmed.startsWith('```')) {
      const codeLang = trimmed.replace(/^```/, '').trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      // Bỏ qua dòng đóng ```
      if (i < lines.length) i++;

      blocks.push(
        <div key={`codeblock-${i}`} className="my-2 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xs">
          {codeLang && (
            <div className="bg-slate-800/80 px-3 py-1 text-[10px] font-mono font-semibold uppercase text-slate-400 border-b border-slate-700/60 flex items-center justify-between">
              <span>{codeLang}</span>
            </div>
          )}
          <pre className="p-3 text-xs font-mono text-slate-100 whitespace-pre-wrap overflow-x-auto leading-relaxed">
            {codeLines.join('\n')}
          </pre>
        </div>
      );
      continue;
    }

    // 2. Kiểm tra Table (| ... |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim());

        const dataRows = tableLines.slice(2).map((row) =>
          row
            .split('|')
            .slice(1, -1)
            .map((cell) => cell.trim())
        );

        blocks.push(
          <div key={`table-${i}`} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  {headerRow.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 text-[11px] whitespace-nowrap">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-700 text-xs">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 3. Tiêu đề (### hoặc ## hoặc #)
    if (trimmed.startsWith('#### ')) {
      blocks.push(
        <h6 key={`h4-${i}`} className="font-bold text-xs text-slate-800 mt-2.5 mb-1 flex items-center gap-1.5">
          <span className="w-1 h-2.5 bg-emerald-500 rounded-full inline-block" />
          {renderInline(trimmed.substring(5))}
        </h6>
      );
      i++;
      continue;
    } else if (trimmed.startsWith('### ')) {
      blocks.push(
        <h5 key={`h3-${i}`} className="font-bold text-xs sm:text-sm text-slate-900 mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-3 bg-emerald-600 rounded-full inline-block" />
          {renderInline(trimmed.substring(4))}
        </h5>
      );
      i++;
      continue;
    } else if (trimmed.startsWith('## ')) {
      blocks.push(
        <h4 key={`h2-${i}`} className="font-extrabold text-sm text-slate-900 mt-3.5 mb-1.5 pb-1 border-b border-slate-200">
          {renderInline(trimmed.substring(3))}
        </h4>
      );
      i++;
      continue;
    } else if (trimmed.startsWith('# ')) {
      blocks.push(
        <h3 key={`h1-${i}`} className="font-black text-base text-slate-900 mt-4 mb-2">
          {renderInline(trimmed.substring(2))}
        </h3>
      );
      i++;
      continue;
    }

    // 4. Blockquote (> ...)
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className={`my-2 p-3 bg-amber-50/80 border-l-3 border-amber-500 text-amber-950 rounded-r-xl italic ${bodyTextClass}`}
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInline(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 5. Thước kẻ phân cách (---)
    if (/^---+$|^===+$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${i}`} className="my-3 border-slate-200" />);
      i++;
      continue;
    }

    // 6. Danh sách có cấu trúc (gộp cả danh sách số và các sub-bullet lồng nhau)
    const isListItem = (l: string) => {
      const t = l.trim();
      return /^\d+\.\s+/.test(t) || t.startsWith('- ') || t.startsWith('* ');
    };

    if (isListItem(rawLine)) {
      const listElements: React.ReactNode[] = [];
      while (i < lines.length && (isListItem(lines[i]) || (lines[i].trim() !== '' && /^\s{2,}/.test(lines[i])))) {
        const itemLine = lines[i];
        const itemTrimmed = itemLine.trim();

        // Đo độ thụt lề
        const leadingSpaces = itemLine.length - itemLine.trimStart().length;
        const indentLevel = Math.min(Math.floor(leadingSpaces / 2), 4);

        if (/^\d+\.\s+/.test(itemTrimmed)) {
          // Mục đánh số (1. 2.)
          const numMatch = itemTrimmed.match(/^(\d+)\.\s+(.*)$/);
          const num = numMatch ? numMatch[1] : '•';
          const text = numMatch ? numMatch[2] : itemTrimmed;

          listElements.push(
            <div
              key={`li-num-${i}`}
              className={`flex items-start gap-2 text-slate-800 my-1 ${bodyTextClass}`}
              style={{ paddingLeft: `${indentLevel * 14}px` }}
            >
              <span className="font-bold text-emerald-700 shrink-0 w-4 text-right">{num}.</span>
              <div className="flex-1">{renderInline(text)}</div>
            </div>
          );
        } else if (itemTrimmed.startsWith('- ') || itemTrimmed.startsWith('* ')) {
          // Mục gạch đầu dòng (- hoặc *)
          const bulletText = itemTrimmed.substring(2);
          listElements.push(
            <div
              key={`li-bullet-${i}`}
              className={`flex items-start gap-2 text-slate-700 my-0.5 ${bodyTextClass}`}
              style={{ paddingLeft: `${Math.max(indentLevel * 14, 8)}px` }}
            >
              <span className="text-emerald-600 font-bold shrink-0 mt-0.5">•</span>
              <div className="flex-1">{renderInline(bulletText)}</div>
            </div>
          );
        } else {
          // Dòng văn bản phụ thụt lề thuộc về mục trước
          listElements.push(
            <div
              key={`li-sub-${i}`}
              className={`text-slate-600 my-0.5 ${bodyTextClass}`}
              style={{ paddingLeft: `${Math.max(indentLevel * 14 + 16, 24)}px` }}
            >
              {renderInline(itemTrimmed)}
            </div>
          );
        }
        i++;
      }

      blocks.push(
        <div key={`list-block-${i}`} className="my-1.5 space-y-0.5">
          {listElements}
        </div>
      );
      continue;
    }

    // 7. Dòng trống
    if (trimmed === '') {
      blocks.push(<div key={`blank-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // 8. Đoạn văn thông thường
    blocks.push(
      <p key={`p-${i}`} className={`text-slate-800 my-1 ${bodyTextClass}`}>
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return (
    <div className={`markdown-view font-sans leading-relaxed ${className}`}>
      {blocks}
    </div>
  );
};

/**
 * Xử lý inline markdown toàn diện:
 * - **bold**
 * - *italic* hoặc _italic_
 * - `code`
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Tách text theo token: **bold**, `code`, *italic*
  // Regex bắt theo thứ tự ưu tiên: **...**, `...`, *...*
  const tokens = text.split(/(\*\*[\s\S]+?\*\*|`[^`]+?`|\*[^\s*][^*]*?\*)/g);

  return tokens.map((token, index) => {
    if (!token) return null;

    // 1. In đậm (**text**)
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      const inner = token.slice(2, -2);
      return (
        <strong key={index} className="font-bold text-slate-900">
          {renderInnerItalic(inner)}
        </strong>
      );
    }

    // 2. Code nội dòng (`text`)
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 bg-slate-100/90 text-slate-800 font-mono text-[11px] rounded border border-slate-200/80"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    // 3. In nghiêng (*text*)
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2 && !token.startsWith('**')) {
      return (
        <em key={index} className="italic text-slate-800 font-medium">
          {token.slice(1, -1)}
        </em>
      );
    }

    return token;
  });
}

function renderInnerItalic(text: string): React.ReactNode {
  const parts = text.split(/(\*[^\s*][^*]*?\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={idx} className="italic font-bold">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}
