import { PropsWithChildren } from "react";

/**
 * SpaceHeroStitch
 * 
 * Hero dettaglio (titolo + rating + media gallery).
 */
export default function SpaceHeroStitch({ children }: PropsWithChildren) {
  return (
    <section className="bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Col 1: Meta info */}
          <div className="lg:col-span-7 space-y-4">
            <div className="text-sm text-[var(--color-muted)]">Dettaglio Spazio</div>
            {children}
          </div>

          {/* Col 2: Media (children = gallery/map esistenti) */}
          <div className="lg:col-span-5">
            {/* Media slot */}
          </div>
        </div>
      </div>
    </section>
  );
}
