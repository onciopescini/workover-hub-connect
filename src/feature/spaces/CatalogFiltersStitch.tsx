import { PropsWithChildren } from "react";

/**
 * CatalogFiltersStitch
 * 
 * Sticky bar filtri (wrapper per AddressAutocomplete + AdvancedSpaceFilters).
 */
export default function CatalogFiltersStitch({ children }: PropsWithChildren) {
  return (
    <div className="sticky top-0 z-filters border-b border-stitch-border bg-stitch-surface/95 backdrop-blur">
      <div className="container mx-auto px-4 py-4 flex flex-wrap gap-3 items-center">
        {children}
      </div>
    </div>
  );
}
