import { LogoMark } from "@/components/Logo";

/**
 * Static, dependency-free stand-in for the 3D scene: used while the WebGL
 * bundle is still loading, and as the permanent view when WebGL is
 * unavailable or the visitor prefers reduced motion.
 */
export function HeroFallback({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex h-full w-full items-center justify-center ${className}`} aria-hidden="true">
      <div className="glow-cyan animate-glow-pulse absolute h-48 w-48 rounded-full blur-2xl md:h-64 md:w-64" />
      <LogoMark
        size="xl"
        className="animate-float relative drop-shadow-[0_0_45px_rgba(0,242,254,0.45)] md:h-32 md:w-32"
      />
    </div>
  );
}
