import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type LegalDocumentPageProps = {
  markdown: string
}

const focusStyles =
  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020817]'

export function LegalDocumentPage({ markdown }: LegalDocumentPageProps) {
  return (
    <div className="min-h-screen bg-[#020817] text-slate-200">
      <header className="border-b border-white/10 bg-[#020817]/95">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Link href="/" className={`inline-flex min-h-11 items-center text-lg font-semibold tracking-wide text-white ${focusStyles}`}>
            CrossCheck<span className="text-cyan-400">Health</span>
          </Link>
          <nav aria-label="Legal pages" className="flex items-center gap-3 text-sm font-medium sm:gap-6">
            <Link href="/privacy-policy" className={`inline-flex min-h-11 items-center px-1 text-slate-300 transition-colors duration-200 hover:text-cyan-300 ${focusStyles}`}>
              Privacy
            </Link>
            <Link href="/terms" className={`inline-flex min-h-11 items-center px-1 text-slate-300 transition-colors duration-200 hover:text-cyan-300 ${focusStyles}`}>
              Terms
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        <article className="rounded-3xl border border-white/10 bg-slate-950/60 px-5 py-8 shadow-2xl shadow-cyan-950/20 sm:px-10 sm:py-12 lg:px-14">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="mb-8 text-4xl font-semibold leading-tight text-white sm:text-5xl">{children}</h1>,
              h2: ({ children }) => <h2 className="mb-4 mt-10 scroll-mt-6 text-2xl font-semibold leading-snug text-white sm:text-3xl">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-3 mt-8 text-xl font-semibold leading-snug text-white">{children}</h3>,
              p: ({ children }) => <p className="my-4 text-base leading-7 text-slate-300">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
              ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 text-base leading-7 text-slate-300">{children}</ul>,
              ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6 text-base leading-7 text-slate-300">{children}</ol>,
              li: ({ children }) => <li className="pl-1">{children}</li>,
              a: ({ href = '', children }) => (
                <a
                  href={href}
                  className={`font-medium text-cyan-300 underline decoration-cyan-400/50 underline-offset-4 transition-colors duration-200 hover:text-cyan-200 hover:decoration-cyan-300 ${focusStyles}`}
                  {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => <blockquote className="my-6 border-l-4 border-cyan-400 bg-cyan-400/5 px-5 py-1 text-slate-300">{children}</blockquote>,
              hr: () => <hr className="my-8 border-white/10" />,
              table: ({ children }) => (
                <div className={`my-6 max-w-full overflow-x-auto rounded-2xl border border-white/10 ${focusStyles}`} tabIndex={0} role="region" aria-label="Scrollable legal information table">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm leading-6">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-cyan-950 text-slate-100">{children}</thead>,
              tbody: ({ children }) => <tbody className="divide-y divide-white/10">{children}</tbody>,
              tr: ({ children }) => <tr className="align-top even:bg-white/[0.025]">{children}</tr>,
              th: ({ children }) => <th className="border-r border-white/10 px-4 py-3 font-semibold last:border-r-0">{children}</th>,
              td: ({ children }) => <td className="border-r border-white/10 px-4 py-3 text-slate-300 last:border-r-0">{children}</td>,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </main>

      <footer className="border-t border-white/10 bg-[#020817]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-400 sm:flex-row sm:px-6">
          <p>&copy; 2026 CrossCheckHealth. All rights reserved.</p>
          <nav aria-label="Footer legal links" className="flex gap-5">
            <Link href="/privacy-policy" className={`inline-flex min-h-11 items-center transition-colors duration-200 hover:text-cyan-300 ${focusStyles}`}>Privacy Policy</Link>
            <Link href="/terms" className={`inline-flex min-h-11 items-center transition-colors duration-200 hover:text-cyan-300 ${focusStyles}`}>Terms of Use</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
