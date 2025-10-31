/**
 * CatalogHeaderStitch
 * 
 * Header breadcrumb + counters da workover_spaces_catalog/code.html.
 */
export default function CatalogHeaderStitch() {
  return (
    <header className="border-b border-stitch-border bg-stitch-surface">
      <div className="container mx-auto px-4 py-6">
        <nav className="text-sm text-stitch-muted mb-2">
          <span>Home</span> <span className="mx-2">/</span> <span className="text-stitch-text">Spazi</span>
        </nav>
        <h1 className="text-stitch-h1 font-bold">Trova il tuo spazio</h1>
        <p className="text-stitch-muted mt-2">
          {/* TODO: dynamic count */}
          150+ spazi disponibili in tutta Italia
        </p>
      </div>
    </header>
  );
}
