import { PropsWithChildren } from "react";

/**
 * SpacesGalleryStitch
 * 
 * Skin wrapper per SpacesGallerySection
 */
export default function SpacesGalleryStitch({ children }: PropsWithChildren) {
  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="container mx-auto px-4 py-[var(--space-section)]">
        {children}
      </div>
    </section>
  );
}
