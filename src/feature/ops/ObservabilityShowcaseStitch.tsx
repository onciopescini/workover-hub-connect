import { PropsWithChildren } from "react";

/**
 * ObservabilityShowcaseStitch
 * 
 * Showcase da osservabilità_&_sre/code.html
 * Solo vetrina informativa, nessuna logica di telemetria
 */
export default function ObservabilityShowcaseStitch({ children }: PropsWithChildren) {
  return (
    <section className="container mx-auto px-4 py-10 space-y-8 bg-stitch-surface">
      {/* TODO: blocchi SRE/observability */}
      {children}
    </section>
  );
}
