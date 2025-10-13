# ADR 003: Testing Strategy - Jest + Playwright

## Status
**Accepted** - 2024-02-01

## Context
We needed a comprehensive testing strategy covering unit tests, integration tests, and end-to-end tests to ensure application quality and prevent regressions.

## Decision
We adopted a **testing pyramid** approach with:
- **Jest** for unit and integration tests
- **Playwright** for end-to-end tests
- **Testing Library** for component tests
- **Axe** for accessibility testing

## Rationale

### Testing Pyramid
```
       E2E Tests (Playwright)
           Critical flows
              /\
             /  \
            /    \
           /      \
          / Integr.\
         / (Jest)   \
        /  Component \
       /   interaction\
      /________________\
     /   Unit Tests     \
    /  (Jest + Testing   \
   /    Library)          \
  /  Functions, Hooks,     \
 /_________________________\
   Utilities, Components
```

### Jest Pros
- Fast execution
- Great mocking capabilities
- Snapshot testing
- Code coverage reporting
- Familiar to most developers

### Playwright Pros
- Cross-browser testing (Chrome, Firefox, Safari)
- Automatic waiting and retry
- Parallel test execution
- Video and screenshot capture
- Network interception
- Mobile emulation

## Test Coverage Targets

| Layer | Coverage Target | Why |
|-------|----------------|-----|
| Unit Tests | 80%+ | Core business logic |
| Integration Tests | 60%+ | Component interactions |
| E2E Tests | Critical paths | User journeys |
| Accessibility | 100% pages | WCAG compliance |

## Alternatives Considered

### Cypress
- **Rejected**: Slower than Playwright
- **Rejected**: Limited browser support
- **Could reconsider**: If we need more plugins

### Vitest
- **Considered**: Faster than Jest
- **Rejected**: Less mature ecosystem
- **Could migrate**: In future for speed gains

## Implementation Guidelines

### Unit Tests
```typescript
// ✅ Test pure functions and utilities
describe('calculateBookingPrice', () => {
  it('calculates hourly booking correctly', () => {
    expect(calculateBookingPrice({
      hours: 3,
      pricePerHour: 15
    })).toBe(45);
  });
});
```

### Integration Tests
```typescript
// ✅ Test component behavior with hooks
describe('BookingForm', () => {
  it('creates booking on submit', async () => {
    render(<BookingForm spaceId="123" />);
    await userEvent.type(screen.getByLabelText('Date'), '2024-12-25');
    await userEvent.click(screen.getByRole('button', { name: /book/i }));
    await waitFor(() => {
      expect(screen.getByText('Booking created')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests
```typescript
// ✅ Test critical user flows
test('user can book a space', async ({ page }) => {
  await page.goto('/spaces/123');
  await page.click('text=Book Now');
  await page.fill('[name="date"]', '2024-12-25');
  await page.click('text=Confirm Booking');
  await expect(page.locator('text=Booking confirmed')).toBeVisible();
});
```

### Accessibility Tests
```typescript
// ✅ Test WCAG compliance
test('space card is accessible', async ({ page }) => {
  await page.goto('/spaces');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

## Test Organization

```
tests/
├── unit/
│   ├── utils/
│   ├── hooks/
│   └── lib/
├── integration/
│   ├── components/
│   └── pages/
└── e2e/
    ├── auth.spec.ts
    ├── booking.spec.ts
    └── payment.spec.ts
```

## Consequences

### Positive
- High confidence in code changes
- Early bug detection
- Better code design (testable code is good code)
- Documentation through tests
- Safe refactoring

### Negative
- Initial setup time
- Maintenance overhead
- Slower CI/CD pipeline
- Need to educate team on best practices

## CI/CD Integration

```yaml
# GitHub Actions
- name: Unit Tests
  run: npm run test:unit
  
- name: Integration Tests
  run: npm run test:integration
  
- name: E2E Tests
  run: npm run test:e2e
  
- name: Coverage Report
  run: npm run test:coverage
```

## Review Date
2025-08-01 - Reassess coverage targets and tools
