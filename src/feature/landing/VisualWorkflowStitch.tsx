import { PropsWithChildren } from "react";

/**
 * VisualWorkflowStitch
 * 
 * Skin wrapper per VisualWorkflowSection
 */
export default function VisualWorkflowStitch({ children }: PropsWithChildren) {
  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="container mx-auto px-4 py-[var(--space-section)]">
        {children}
      </div>
    </section>
  );
}
