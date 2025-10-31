import { PropsWithChildren } from "react";

/**
 * LandingHeroStitch
 * 
 * Wrapper presentazionale per AnimatedHeroSection.
 * Applica design Stitch con grid 2-colonne (text + media).
 * 
 * TODO: Estrarre layout da workover_landing_page/code.html
 */
export default function LandingHeroStitch({ children }: PropsWithChildren) {
  return (
    <section className="relative overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)] min-h-screen flex items-center">
      <div className="container mx-auto px-4 py-[var(--space-section)]">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          {/* Col 1: Headline + SearchFilters (children) */}
          <div className="space-y-8">
            {children}
          </div>

          {/* Col 2: Hero Media */}
          <div className="relative">
            <div className="aspect-square rounded-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-glow)]">
              <img src="/assets/stitch/hero-illustration.svg" alt="Hero illustration" className="w-full h-full object-cover rounded-[var(--radius-xl)]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
