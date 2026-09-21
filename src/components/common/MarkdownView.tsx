import React from 'react';

interface Props {
  content: string;
  className?: string;
}

/**
 * Trình hiển thị Markdown tối giản cho môi trường nghiệp vụ
 * Hỗ trợ chuyển đổi bảng biểu (|...|), gạch đầu dòng (- / *), tiêu đề (###), in đậm (**text**)
 */
export const MarkdownView: React.FC<Props> = ({ content, className = '' }) => {
  if (!content) {
    return <div className="text-slate-400 italic text-xs">Chưa có nội dung.</div>;
  }

  // Phân tích văn bản thành các block (Bảng biểu, Danh sách, Tiêu đề, Đoạn văn)
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Kiểm tra Table (| ... |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      // Parse table
      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map(cell => cell.trim());
        
        // Bỏ qua dòng phân cách |---|---|
        const dataRows = tableLines.slice(2).map(row => 
          row.split('|').slice(1, -1).map(cell => cell.trim())
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

    // 2. Tiêu đề (### hoặc ## hoặc #)
    if (trimmed.startsWith('### ')) {
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

    // 3. Danh sách bullet (- hoặc *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().substring(2));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-1.5 space-y-1 pl-4 text-xs text-slate-700 list-disc">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 4. Danh sách số (1. 2.)
    if (/^\d+\.\s/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s/, '');
        listItems.push(itemText);
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-1.5 space-y-1 pl-4 text-xs text-slate-700 list-decimal">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 5. Đoạn văn thông thường
    if (trimmed === '') {
      // Dòng trống
      blocks.push(<div key={`blank-${i}`} className="h-2" />);
    } else {
      blocks.push(
        <p key={`p-${i}`} className="text-xs leading-relaxed text-slate-800 my-1">
          {renderInline(trimmed)}
        </p>
      );
    }
    i++;
  }

  return (
    <div className={`markdown-view font-sans ${className}`}>
      {blocks}
    </div>
  );
};

/**
 * Xử lý inline markdown: in đậm (**text**), code (`text`), và highlight
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Xử lý **bold**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Xử lý `code`
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1 py-0.5 bg-slate-100 rounded text-slate-800 font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

