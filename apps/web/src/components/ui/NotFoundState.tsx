import { Link } from 'react-router';

export function NotFoundState({ description, title }: { description: string; title: string }) {
  return (
    <section
      aria-labelledby="not-found-title"
      className="mx-auto max-w-xl py-16 text-center sm:py-24"
    >
      <p className="font-mono text-5xl font-medium tracking-tight">404</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight" id="not-found-title">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2"
          to="/#spots"
        >
          장소 목록으로
        </Link>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium hover:bg-surface-2"
          to="/"
        >
          홈으로
        </Link>
      </div>
    </section>
  );
}
