import { PropsWithChildren } from "react";

/**
 * InnovativeCTAStitch
 * 
 * Skin wrapper per InnovativeCTASection
 */
export default function InnovativeCTAStitch({ children }: PropsWithChildren) {
  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="container mx-auto px-4 py-[var(--space-section)]">
        {children}
      </div>
    </section>
  );
}
