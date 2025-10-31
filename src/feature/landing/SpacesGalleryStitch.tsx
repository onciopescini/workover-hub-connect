import { PropsWithChildren } from "react";

/**
 * SpacesGalleryStitch
 * 
 * Skin wrapper per SpacesGallerySection
 */
export default function SpacesGalleryStitch({ children }: PropsWithChildren) {
  return (
    <section className="border-t border-stitch-border bg-stitch-bg">
      <div className="container mx-auto px-4 py-stitch-section">
        {children}
      </div>
    </section>
  );
}
