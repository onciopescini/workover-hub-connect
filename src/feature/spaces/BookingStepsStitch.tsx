import { ReactNode } from "react";

/**
 * BookingStepsStitch
 * 
 * Layout 2-col per booking (form sx + calculator dx).
 */
export default function BookingStepsStitch({
  header,
  aside,
  children,
}: { header?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-stitch-border bg-stitch-surface">
      <div className="container mx-auto px-4 py-12 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          {header}
          {children}
        </div>
        <aside className="lg:col-span-5 space-y-4">
          {aside}
        </aside>
      </div>
    </section>
  );
}
