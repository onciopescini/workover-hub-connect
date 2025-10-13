# Service Level Agreement (SLA)

**Service**: WorkoverHub Connect  
**Effective Date**: 2025-01-13  
**Version**: 1.0

---

## 1. Service Availability

### 1.1 Uptime Commitment
**99.9% Monthly Uptime** (8.76 hours maximum downtime per year)

### 1.2 Planned Maintenance
- Maximum 4 hours per month
- Scheduled during low-traffic periods (2-6 AM CET)
- 48-hour advance notification

---

## 2. Performance Guarantees

### 2.1 Response Times
- **API Endpoints**: p95 < 500ms, p99 < 1000ms
- **Page Load**: FCP < 1.5s, LCP < 2.5s
- **Search Results**: < 300ms (p95)

### 2.2 Throughput
- **Concurrent Users**: Support for 1000+ simultaneous users
- **Requests/Second**: 1000 req/sec sustained

---

## 3. Support Response Times

| Priority | Response Time | Resolution Time |
|----------|---------------|-----------------|
| P0 (Critical) | 1 hour | 4 hours |
| P1 (High) | 4 hours | 24 hours |
| P2 (Medium) | 24 hours | 72 hours |
| P3 (Low) | 48 hours | 1 week |

---

## 4. Data Protection

### 4.1 Backup & Recovery
- **RPO**: 1 hour (Recovery Point Objective)
- **RTO**: 2 hours (Recovery Time Objective)
- **Backup Frequency**: Daily automated, weekly manual
- **Retention**: 30 days

### 4.2 Data Retention
- **Bookings**: 7 years
- **Messages**: 5 years
- **Audit Logs**: 90 days
- **User Profiles**: Until account deletion

---

## 5. Security Commitments

- OWASP Top 10 compliance
- GDPR compliance
- PCI-DSS Level 1 (via Stripe)
- 72-hour breach notification
- Annual security audits

---

**Contact**: support@workoverhub.app
