// Server component, deliberately standalone: no PageShell, no navigation, no client code.
// This is the "infringing shop" -- it must read as an ordinary product page with no mention of
// a licence, permission, or the creator anywhere, and the site owner's address must be the only
// 0x... string on the page, since the contract addresses its notice to that address.
export function ShopProductPage({
  image,
  alt,
  name,
  price,
  description,
  details,
}: {
  image: string;
  alt: string;
  name: string;
  price: string;
  description: string;
  details: string[];
}) {
  const siteOwnerAddress = process.env.NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS;

  return (
    <main className="min-h-screen bg-white text-neutral-900 [font-family:ui-sans-serif,system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <p className="text-xl font-black tracking-tight">NEON THREADS</p>
          <nav className="hidden gap-6 text-sm text-neutral-500 sm:flex" aria-label="Shop">
            <span>New in</span>
            <span>Hoodies</span>
            <span>Bags</span>
            <span>Prints</span>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:grid-cols-2 md:items-start">
        <div className="overflow-hidden rounded-2xl bg-neutral-100 p-3">
          {/* Plain <img>, never next/image: the file the agent hashes must be the file this page serves. */}
          <img src={image} alt={alt} className="w-full rounded-xl" width={960} height={640} />
        </div>

        <div>
          <p className="text-sm text-neutral-500">Neon Threads</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{name}</h1>
          <p className="mt-2 text-2xl font-semibold">{price}</p>
          <p className="mt-4 leading-relaxed text-neutral-600">{description}</p>

          <ul className="mt-6 space-y-1 text-sm text-neutral-600">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>

          <button type="button" className="mt-8 w-full rounded-full bg-neutral-900 px-6 py-3 font-semibold text-white">
            Add to cart
          </button>

          <p className="mt-6 break-all font-mono text-xs text-neutral-500">Pay us in GEN: {siteOwnerAddress}</p>
        </div>
      </div>

      <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-400">© 2026 Neon Threads</footer>
    </main>
  );
}
