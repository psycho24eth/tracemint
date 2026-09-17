type LogoSize = "sm" | "md" | "lg";

const MARK_SIZES: Record<LogoSize, string> = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-9 w-9" };
const TEXT_SIZES: Record<LogoSize, string> = { sm: "text-base", md: "text-lg", lg: "text-2xl" };

export function LogoMark({ size = "md", className = "" }: { size?: LogoSize; className?: string }) {
  return (
    <svg className={`${MARK_SIZES[size]} ${className}`} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 2 4 7v8c0 7.2 5.1 13.4 12 15 6.9-1.6 12-7.8 12-15V7L16 2Z"
        fill="var(--secondary)"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
      <circle cx="16" cy="15" r="5.5" stroke="var(--accent)" strokeWidth="1.5" />
      <path d="M16 6.5v4M16 19.5v4M7.5 15h4M20.5 15h4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({
  size = "md",
  showWordmark = true,
  className = "",
}: {
  size?: LogoSize;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className={`${TEXT_SIZES[size]} font-bold tracking-tight`}>
          License<span className="text-accent">Hunter</span>
        </span>
      )}
    </span>
  );
}
