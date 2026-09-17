import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>LicenseHunter runs on GenLayer Studio Next. Notices are automated findings, not legal advice.</p>
        <div className="flex gap-4">
          <Link href="/judges" className="hover:text-foreground">
            For judges
          </Link>
          <a href="https://github.com/psycho24eth/licensehunter" className="hover:text-foreground">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
