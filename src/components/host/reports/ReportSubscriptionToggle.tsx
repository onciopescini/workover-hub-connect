
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const ReportSubscriptionToggle: React.FC = () => {
  const { authState } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const hostId = authState.user?.id;

  useEffect(() => {
    const load = async () => {
      if (!hostId) return;
      const { data } = await supabase
        .from("host_report_subscriptions")
        .select("enabled")
        .eq("host_id", hostId)
        .maybeSingle();
      if (data) setEnabled(!!data.enabled);
    };
    load();
  }, [hostId]);

  const toggle = async () => {
    if (!hostId) return;
    setBusy(true);
    await supabase
      .from("host_report_subscriptions")
      .upsert(
        {
          host_id: hostId,
          enabled: !enabled,
          frequency: "monthly",
          day_of_month: 1,
        },
        { onConflict: "host_id" }
      );
    setEnabled((e) => !e);
    setBusy(false);
  };

  return (
    <Card>
      <CardContent className="pt-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Report mensile (riassunto economico)</div>
          <div className="text-xs text-muted-foreground">
            Ricevi un export mensile via email (CSV leggero). Disattivo di default.
          </div>
        </div>
        <Button variant={enabled ? "default" : "outline"} onClick={toggle} disabled={busy}>
          {enabled ? "Disattiva" : "Attiva"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReportSubscriptionToggle;
