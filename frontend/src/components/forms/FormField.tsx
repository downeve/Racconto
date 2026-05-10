import { type ReactNode } from 'react'

interface Props {
  label: string
  hint?: string
  error?: string | null
  children: ReactNode
  required?: boolean
  className?: string
}

export function FormField({ label, hint, error, children, required, className = '' }: Props) {
  return (
    <div className={`py-4 border-b border-edit-line first:pt-0 last:border-b-0 ${className}`}>
      <label className="block t-eyebrow text-edit-muted mb-2">
        {label}
        {required && <span className="text-edit-danger ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="t-caption text-edit-faint mt-1.5">{hint}</p>
      )}
      {error && (
        <p className="t-caption text-edit-danger mt-1.5">{error}</p>
      )}
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export function UnderlineInput({ className = '', ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full font-serif text-body bg-transparent
                  border-0 border-b border-edit-line
                  focus:border-edit-ink focus:outline-none
                  py-2 transition-colors duration-150
                  placeholder:text-edit-faint
                  disabled:opacity-50
                  ${className}`}
    />
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export function UnderlineTextarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={`w-full font-serif text-body bg-transparent
                  border-0 border-b border-edit-line
                  focus:border-edit-ink focus:outline-none
                  py-2 resize-none transition-colors duration-150
                  placeholder:text-edit-faint
                  ${className}`}
    />
  )
}
