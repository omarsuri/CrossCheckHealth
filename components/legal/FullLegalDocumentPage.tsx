import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type FullLegalDocumentPageProps = {
  markdown: string;
};

const focusStyles = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua-deep focus-visible:ring-offset-2";

export function FullLegalDocumentPage({ markdown }: FullLegalDocumentPageProps) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="border-b border-ink/10 bg-cream/95">
        <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Link href="/" className={`inline-flex min-h-11 items-center ${focusStyles}`}>
            <span className="serif text-2xl font-bold tracking-tight">CrossCheck</span>
            <span className="serif text-2xl font-bold italic tracking-tight text-aqua-deep">Health</span>
          </Link>
          <nav aria-label="Legal pages" className="flex items-center gap-4 text-sm font-medium sm:gap-6">
            <Link href="/privacy-policy" className={`inline-flex min-h-11 items-center text-ink/70 transition-colors hover:text-aqua-deep ${focusStyles}`}>
              Privacy
            </Link>
            <Link href="/terms" className={`inline-flex min-h-11 items-center text-ink/70 transition-colors hover:text-aqua-deep ${focusStyles}`}>
              Terms
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        <article className="rounded-3xl border border-ink/10 bg-white px-5 py-8 shadow-glass sm:px-10 sm:py-12 lg:px-14">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="serif mb-8 text-4xl font-semibold leading-tight text-ink sm:text-5xl">{children}</h1>,
              h2: ({ children }) => <h2 className="serif mb-4 mt-10 scroll-mt-6 text-2xl font-semibold leading-snug text-ink sm:text-3xl">{children}</h2>,
              h3: ({ children }) => <h3 className="mb-3 mt-8 text-xl font-semibold leading-snug text-ink">{children}</h3>,
              p: ({ children }) => <p className="my-4 text-base leading-7 text-ink/80">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
              ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 text-base leading-7 text-ink/80">{children}</ul>,
              ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6 text-base leading-7 text-ink/80">{children}</ol>,
              li: ({ children }) => <li className="pl-1">{children}</li>,
              a: ({ href = "", children }) => (
                <a
                  href={href}
                  className={`font-medium text-aqua-deep underline decoration-aqua-deep/40 underline-offset-4 hover:decoration-aqua-deep ${focusStyles}`}
                  {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => <blockquote className="my-6 border-l-4 border-aqua-deep bg-aqua-soft/40 px-5 py-1 text-ink/80">{children}</blockquote>,
              hr: () => <hr className="my-8 border-ink/10" />,
              table: ({ children }) => (
                <div className="my-6 max-w-full overflow-x-auto rounded-2xl border border-ink/10" tabIndex={0} role="region" aria-label="Scrollable legal information table">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm leading-6">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-ink text-cream">{children}</thead>,
              tbody: ({ children }) => <tbody className="divide-y divide-ink/10">{children}</tbody>,
              tr: ({ children }) => <tr className="align-top even:bg-cream-warm/60">{children}</tr>,
              th: ({ children }) => <th className="border-r border-white/10 px-4 py-3 font-semibold last:border-r-0">{children}</th>,
              td: ({ children }) => <td className="border-r border-ink/10 px-4 py-3 text-ink/80 last:border-r-0">{children}</td>,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </main>

      <footer className="mesh-deep text-cream/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row sm:px-6">
          <p>&copy; 2026 CrossCheckHealth. Health awareness only. Not a medical diagnosis.</p>
          <nav aria-label="Footer legal links" className="flex gap-5">
            <Link href="/privacy-policy" className={`inline-flex min-h-11 items-center hover:text-white ${focusStyles}`}>Privacy Policy</Link>
            <Link href="/terms" className={`inline-flex min-h-11 items-center hover:text-white ${focusStyles}`}>Terms of Use</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
