/**
 * CatalogHeaderStitch
 * 
 * Header breadcrumb + counters da workover_spaces_catalog/code.html.
 */
export default function CatalogHeaderStitch() {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="container mx-auto px-4 py-6">
        <nav className="text-sm text-[var(--color-muted)] mb-2">
          <span>Home</span> <span className="mx-2">/</span> <span className="text-[var(--color-text)]">Spazi</span>
        </nav>
        <h1 className="text-[length:var(--font-size-h1)] font-bold">Trova il tuo spazio</h1>
        <p className="text-[var(--color-muted)] mt-2">
          150+ spazi disponibili in tutta Italia
        </p>
      </div>
    </header>
  );
}
