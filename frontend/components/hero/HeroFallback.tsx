/**
 * Static, dependency-free stand-in for the point cloud: the artwork as a CSS dot matrix. Shown
 * while the WebGL bundle loads and whenever WebGL is unavailable.
 */
export function HeroFallback({ className = "" }: { className?: string }) {
  return (
    <div
      className={`dot-matrix absolute inset-0 ${className}`}
      style={{ backgroundImage: "url(/demo/cybernetic-horizon.png)" }}
      aria-hidden="true"
    />
  );
}
