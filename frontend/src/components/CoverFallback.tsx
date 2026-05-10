interface CoverFallbackProps {
  title: string
  dark?: boolean
}

export default function CoverFallback({ title, dark = false }: CoverFallbackProps) {
  return (
    <div
      className={`w-full h-full flex items-end p-6 bg-gradient-to-br ${
        dark
          ? 'from-d-surface to-d-bg'
          : 'from-[oklch(0.94_0.012_75)] to-[oklch(0.86_0.014_75)]'
      }`}
    >
      <div>
        <p className={`t-eyebrow mb-1 ${dark ? 'text-d-faint' : 'text-faint'}`}>
          Untitled cover
        </p>
        <p
          className={`font-serif text-[1.375rem] leading-tight font-light [word-break:keep-all] ${
            dark ? 'text-d-soft' : 'text-ink-2/70'
          }`}
        >
          {title}
        </p>
      </div>
    </div>
  )
}
