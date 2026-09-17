import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>TraceMint runs on GenLayer Studio Next. Notices are automated findings, not legal advice.</p>
        <div className="flex gap-4">
          <Link
            href="/judges"
            className="rounded-sm transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            For judges
          </Link>
          <a
            href="https://github.com/psycho24eth/tracemint"
            className="rounded-sm transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
