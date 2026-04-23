import ReactMarkdown from 'react-markdown'
//import remarkBreaks from 'remark-breaks'

interface Props {
  content: string
  className?: string
  darkMode?: boolean
}

export default function MarkdownRenderer({ content, className = '', darkMode = false }: Props) {
  const baseText = darkMode ? 'text-white/80' : 'text-gray-700'
  const headingColor = darkMode ? 'text-white' : 'text-gray-900'

  return (
    <div className={className}>
    <ReactMarkdown
      //remarkPlugins={[remarkBreaks]}
      components={{
        p: ({ children }) => (
        <p className={`text-base leading-relaxed mb-4 last:mb-0 whitespace-pre-wrap ${baseText}`}>
          {children}
        </p>),
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em:     ({ children }) => <em className="italic">{children}</em>,
        h1:     ({ children }) => <h1 className={`text-xl font-bold font-cssfont mb-2 ${headingColor}`}>{children}</h1>,
        h2:     ({ children }) => <h2 className={`text-lg font-semibold font-cssfont mb-1.5 ${headingColor}`}>{children}</h2>,
        h3:     ({ children }) => <h3 className={`text-base font-semibold mb-1 ${headingColor}`}>{children}</h3>,
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
        // 코드블록은 포트폴리오에 불필요하므로 plain text로 fallback
        code: ({ children }) => <span className="font-mono text-sm">{children}</span>,
        pre:  ({ children }) => <div className="font-mono text-sm">{children}</div>,
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  )
}
