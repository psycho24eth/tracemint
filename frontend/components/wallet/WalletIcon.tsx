import { Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

const SIZES = { sm: "size-4", md: "size-7", lg: "size-12" } as const;

/** A wallet's own icon, as it announced it, or a neutral wallet glyph when it sent none. */
export function WalletIcon({
  icon,
  size = "md",
  className,
}: {
  icon?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  // Only inline images: a remote URL here would let an extension track who opens the picker.
  if (icon?.startsWith("data:image/")) {
    return <img src={icon} alt="" className={cn(SIZES[size], "shrink-0 rounded-[5px] object-contain", className)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(SIZES[size], "grid shrink-0 place-items-center rounded-[5px] border border-line bg-secondary text-muted-foreground", className)}
    >
      <Wallet className="size-[62%]" strokeWidth={1.75} />
    </span>
  );
}
