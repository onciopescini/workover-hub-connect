import { PropsWithChildren } from "react";

/**
 * InnovativeCTAStitch
 * 
 * Skin wrapper per InnovativeCTASection
 */
export default function InnovativeCTAStitch({ children }: PropsWithChildren) {
  return (
    <section className="border-t border-stitch-border bg-stitch-bg">
      <div className="container mx-auto px-4 py-stitch-section">
        {children}
      </div>
    </section>
  );
}
