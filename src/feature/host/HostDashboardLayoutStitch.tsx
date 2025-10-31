import { PropsWithChildren } from "react";

/**
 * HostDashboardLayoutStitch
 * 
 * Header/KPI/sections da host_dashboard/code.html
 * Questo file è solo layout/skin: i widget host esistenti restano invariati
 */
export default function HostDashboardLayoutStitch({ children }: PropsWithChildren) {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6 bg-[var(--color-bg)]">
      {children}
    </div>
  );
}
