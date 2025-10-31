import { PropsWithChildren } from "react";

/**
 * VisualWorkflowStitch
 * 
 * Skin wrapper per VisualWorkflowSection
 */
export default function VisualWorkflowStitch({ children }: PropsWithChildren) {
  return (
    <section className="border-t border-stitch-border bg-stitch-surface">
      <div className="container mx-auto px-4 py-stitch-section">
        {children}
      </div>
    </section>
  );
}
