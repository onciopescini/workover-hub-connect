# Performance Benchmarks

**Baseline Date**: 2025-01-13  
**Environment**: Production

---

## Response Time Distribution

| Endpoint | p50 | p75 | p90 | p95 | p99 |
|----------|-----|-----|-----|-----|-----|
| Homepage | 45ms | 80ms | 150ms | 280ms | 450ms |
| Space Search | 65ms | 120ms | 200ms | 350ms | 600ms |
| Booking Create | 120ms | 180ms | 280ms | 450ms | 800ms |
| Payment Process | 450ms | 800ms | 1200ms | 1800ms | 2500ms |

## Core Web Vitals

- **LCP**: 1.4s (Good: < 2.5s)
- **FID**: 42ms (Good: < 100ms)
- **CLS**: 0.05 (Good: < 0.1)

## Lighthouse Scores

- Performance: 94/100
- Accessibility: 95/100
- Best Practices: 96/100
- SEO: 98/100

## Load Capacity

- **Max Concurrent Users**: 2500
- **Throughput**: 1000 req/sec
- **Error Rate**: < 0.1%
