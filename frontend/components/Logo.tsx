/** A scan frame closing in on a found copy: four corner brackets around a dot, on signal orange. */
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" role="img" aria-label="TraceMint">
      <rect width="32" height="32" rx="3" fill="#FF5A1F" />
      <path
        d="M8 12V8h4M20 8h4v4M24 20v4h-4M12 24H8v-4"
        stroke="#0B0B0B"
        strokeWidth="2.4"
        strokeLinecap="square"
      />
      <circle cx="16" cy="16" r="3.2" fill="#0B0B0B" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="display-wide text-[0.95rem] leading-none">
        TRACEMINT<span className="text-signal">/</span>
      </span>
    </span>
  );
}
