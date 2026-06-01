import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

interface Props {
  content: string
  className?: string
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

export default function MarkdownRenderer({ content, className = '' }: Props) {
  // 색은 의미 토큰만(상위 [data-theme] 스코프가 자동 라이트/다크 매핑).
  return (
    <div className={className}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeRaw]}
      components={{
        p: ({ children }) => (
        <p className="text-body mb-4 last:mb-0 break-words text-ink-2">
          {children}
        </p>),
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em:     ({ children }) => <em className="italic">{children}</em>,
        del:    ({ children }) => <del className="line-through opacity-60">{children}</del>,
        h1:     ({ children }) => <h1 className="text-h1 font-bold mb-2 text-ink">{children}</h1>,
        h2:     ({ children }) => <h2 className="text-h2 font-semibold mb-1.5 text-ink">{children}</h2>,
        h3:     ({ children }) => <h3 className="text-body font-semibold mb-1 text-ink">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 pl-4 my-2 italic border-hair text-muted">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 text-accent">
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
