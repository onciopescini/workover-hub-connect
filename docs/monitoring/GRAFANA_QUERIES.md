# Grafana/Metabase SQL Queries

## Query 1: Cron Job Execution Rate (Last 7 days)

```sql
SELECT 
  DATE(created_at) as date,
  metadata->>'job_name' as job_name,
  COUNT(*) as execution_count,
  SUM(CASE WHEN metric_type = 'cron_error' THEN 1 ELSE 0 END) as error_count
FROM performance_metrics
WHERE metric_type IN ('cron_auto_serve', 'cron_payout_scheduled', 'cron_freeze_warned', 'cron_invoice_reminder_t3', 'cron_error')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), metadata->>'job_name'
ORDER BY date DESC, job_name;
```

**Visualization**: Line chart (execution_count per job_name over time)

---

## Query 2: Payout Delay Distribution (SLA: T+24h)

```sql
SELECT 
  EXTRACT(EPOCH FROM (payout_completed_at - service_completed_at)) / 3600 AS hours_to_payout,
  COUNT(*) as booking_count
FROM bookings
WHERE status = 'served'
  AND payout_completed_at IS NOT NULL
  AND service_completed_at > NOW() - INTERVAL '30 days'
GROUP BY EXTRACT(EPOCH FROM (payout_completed_at - service_completed_at)) / 3600
ORDER BY hours_to_payout;
```

**Visualization**: Histogram (buckets: 0-24h, 24-48h, 48-72h, >72h)  
**Alert**: If > 5% bookings have hours_to_payout > 24h → Send Slack/Email

---

## Query 3: Freeze Rate (Stripe Disconnect)

```sql
SELECT 
  DATE(created_at) as date,
  metric_type,
  SUM(metric_value) as count
FROM performance_metrics
WHERE metric_type IN ('cron_freeze_warned', 'cron_freeze_frozen', 'cron_freeze_cancelled')
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), metric_type
ORDER BY date DESC, metric_type;
```

**Visualization**: Stacked bar chart (warned vs frozen vs cancelled per day)

---

## Query 4: Invoice Compliance Rate

```sql
SELECT 
  CASE 
    WHEN compliance_alert = TRUE THEN 'Non-Compliant'
    ELSE 'Compliant'
  END as compliance_status,
  COUNT(DISTINCT p.id) as host_count,
  COUNT(b.id) as booking_count
FROM profiles p
JOIN spaces s ON s.host_id = p.id
JOIN bookings b ON b.space_id = s.id
JOIN payments pay ON pay.booking_id = b.id
WHERE p.fiscal_regime IN ('forfettario', 'ordinario')
  AND b.status = 'served'
  AND pay.host_invoice_required = TRUE
  AND b.service_completed_at > NOW() - INTERVAL '30 days'
GROUP BY compliance_status;
```

**Visualization**: Pie chart (Compliant vs Non-Compliant %)  
**Target**: < 10% non-compliant hosts

---

## Query 5: DAC7 Threshold Monitor

```sql
SELECT 
  reporting_year,
  COUNT(*) FILTER (WHERE reporting_threshold_met = TRUE) as above_threshold_count,
  COUNT(*) FILTER (WHERE reporting_threshold_met = FALSE) as below_threshold_count,
  ROUND(AVG(total_income), 2) as avg_income,
  ROUND(AVG(total_transactions), 0) as avg_transactions
FROM dac7_reports
WHERE reporting_year = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY reporting_year;
```

**Visualization**: Metric panel (above_threshold_count with trend)

---

## Query 6: Booking Conversion Funnel

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE status = 'pending_payment') as initiated,
  COUNT(*) FILTER (WHERE status = 'confirmed') as completed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'confirmed') / NULLIF(COUNT(*) FILTER (WHERE status = 'pending_payment'), 0), 2) as conversion_rate
FROM bookings
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Visualization**: Line chart with dual axis (count + conversion rate %)  
**Target**: Conversion rate > 80%

---

## Query 7: Payment Success Rate

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE payment_status = 'completed') as successful,
  COUNT(*) FILTER (WHERE payment_status = 'failed') as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE payment_status = 'completed') / COUNT(*), 2) as success_rate
FROM payments
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Visualization**: Stacked area chart (successful vs failed)  
**Alert**: If success_rate < 95% → Investigate payment gateway issues

---

## Query 8: Revenue Breakdown (Host vs Platform)

```sql
SELECT 
  DATE(created_at) as date,
  SUM(host_amount) as host_revenue,
  SUM(platform_fee) as platform_revenue,
  SUM(amount) as total_revenue
FROM payments
WHERE payment_status = 'completed'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Visualization**: Stacked bar chart (host_revenue + platform_revenue = total_revenue)

---

## Notes

- All queries assume Europe/Rome timezone
- Performance metrics table required for cron monitoring
- Queries optimized for 30-day rolling window
- Add indexes on `created_at`, `status`, `payment_status` for better performance
