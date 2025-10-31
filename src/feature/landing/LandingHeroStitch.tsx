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
    <section className="relative overflow-hidden bg-stitch-bg text-stitch-text min-h-screen flex items-center">
      <div className="container mx-auto px-4 py-stitch-section">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          {/* Col 1: Headline + SearchFilters (children) */}
          <div className="space-y-8">
            {children}
          </div>

          {/* Col 2: Hero Media (TODO: asset da /public/assets/stitch/) */}
          <div className="relative">
            <div className="aspect-square rounded-stitch-xl bg-stitch-surface shadow-stitch-glow">
              {/* TODO: <img src="/assets/stitch/hero-illustration.svg" /> */}
              <div className="w-full h-full flex items-center justify-center text-stitch-muted">
                [Hero Media Placeholder]
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
