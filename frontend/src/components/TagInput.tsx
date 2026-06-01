import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { normalizeTag, MAX_TAGS, MAX_TAG_LENGTH } from '../constants/tags'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  suggestions?: readonly string[]
  placeholder?: string
  maxTags?: number
}

export default function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = '',
  maxTags = MAX_TAGS,
}: Props) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // 클릭 outside → suggestions 닫기
  useEffect(() => {
    if (!showSuggestions) return
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [showSuggestions])

  const addTag = (raw: string) => {
    const norm = normalizeTag(raw)
    if (!norm) return
    if (value.includes(norm)) return
    if (value.length >= maxTags) return
    onChange([...value, norm])
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag))
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  const filteredSuggestions = suggestions
    .filter(s => !value.includes(s) && (input ? s.includes(normalizeTag(input)) : true))
    .slice(0, 8)

  const limitReached = value.length >= maxTags

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border border-edit-line rounded-btn focus-within:border-edit-ink transition-colors bg-edit-paper">
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.75rem]
                       bg-edit-paper-2 text-edit-ink rounded-btn"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="text-edit-faint hover:text-edit-danger"
            >
              <X size={11} strokeWidth={1.5} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => setShowSuggestions(true)}
          maxLength={MAX_TAG_LENGTH}
          placeholder={limitReached ? '' : placeholder}
          disabled={limitReached}
          className="flex-1 min-w-[6rem] bg-transparent text-[0.875rem] focus:outline-none disabled:cursor-not-allowed placeholder:text-edit-faint"
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && !limitReached && (
        <ul className="absolute z-popover left-0 right-0 top-full mt-1 bg-edit-paper border border-edit-line rounded-btn shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-1 max-h-48 overflow-y-auto">
          {filteredSuggestions.map(s => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); addTag(s) }}
                className="w-full text-left px-3 py-1.5 text-[0.8125rem] text-edit-ink hover:bg-edit-paper-2"
              >
                #{s}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="t-caption text-edit-faint mt-1.5">
        {value.length} / {maxTags}
      </p>
    </div>
  )
}
