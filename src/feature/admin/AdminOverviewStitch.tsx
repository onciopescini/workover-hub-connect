import { PropsWithChildren } from "react";

/**
 * AdminOverviewStitch
 * 
 * Griglia compliance/moderazione da area_admin_&_compliance/code.html
 * Non aggiungere logica: componi le card admin esistenti
 */
export default function AdminOverviewStitch({ children }: PropsWithChildren) {
  return (
    <section className="container mx-auto px-4 py-10 space-y-8 bg-[var(--color-bg)]">
      {children}
    </section>
  );
}
