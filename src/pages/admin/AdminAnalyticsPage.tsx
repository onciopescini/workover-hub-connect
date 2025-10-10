import { AnalyticsDashboard } from "@/components/admin/analytics/AnalyticsDashboard";

export default function AdminAnalyticsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics & Reports</h1>
        <p className="text-muted-foreground">
          Dashboard completo con metriche e report esportabili
        </p>
      </div>
      
      <AnalyticsDashboard />
    </div>
  );
}
