import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface Props {
  content: string
  className?: string
  darkMode?: boolean
}

// remark의 emphasis delimiter 규칙 한계 보완:
// **text:** 처럼 닫는 ** 바로 앞에 구두점(:, ( 등)이 오면
// CommonMark flanking 규칙상 파싱 실패하는 경우가 있어 직접 치환.
function preprocessBoldItalic(text: string): string {
  let result = text
  // ** bold → <strong> (single * 보다 먼저 처리)
  result = result.replace(/(?<!\\)\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
  // * italic
  result = result.replace(/(?<!\\)\*([^*\n]+?)\*/g, '<em>$1</em>')
  return result
}

export default function MarkdownRenderer({ content, className = '', darkMode = false }: Props) {
  const baseText = darkMode ? 'text-white/80' : 'text-gray-700'
  const headingColor = darkMode ? 'text-white' : 'text-gray-900'

  return (
    <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeRaw]}
      components={{
        p: ({ children }) => (
        <p className={`text-body mb-4 last:mb-0 break-words ${baseText}`}>
          {children}
        </p>),
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em:     ({ children }) => <em className="italic">{children}</em>,
        del:    ({ children }) => <del className="line-through opacity-60">{children}</del>,
        h1:     ({ children }) => <h1 className={`text-h1 font-bold mb-2 ${headingColor}`}>{children}</h1>,
        h2:     ({ children }) => <h2 className={`text-h2 font-semibold mb-1.5 ${headingColor}`}>{children}</h2>,
        h3:     ({ children }) => <h3 className={`text-body font-semibold mb-1 ${headingColor}`}>{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className={`border-l-2 pl-4 my-2 italic ${darkMode ? 'border-white/20 text-white/50' : 'border-gray-300 text-gray-500'}`}>
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className={`underline underline-offset-2 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
            {children}
          </a>
        ),
        br: () => <br />,
        // 코드블록은 포트폴리오에 불필요하므로 plain text로 fallback
        code: ({ children }) => <span className="font-mono text-small">{children}</span>,
        pre:  ({ children }) => <div className="font-mono text-small overflow-x-hidden break-words">{children}</div>,
      }}
    >
      {preprocessBoldItalic(content)}
    </ReactMarkdown>
    </div>
  )
}
