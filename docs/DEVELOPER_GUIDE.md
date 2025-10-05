# 👨‍💻 Developer Guide

Guida completa per sviluppatori che lavorano su WorkOver.

---

## 📚 Table of Contents

1. [Getting Started](#getting-started)
2. [Development Workflow](#development-workflow)
3. [Project Structure](#project-structure)
4. [Coding Standards](#coding-standards)
5. [Testing](#testing)
6. [Database Development](#database-development)
7. [Debugging](#debugging)
8. [Performance](#performance)
9. [Deployment](#deployment)

---

## Getting Started

### Prerequisites

```bash
# Required
- Node.js 18.x or higher
- npm 9.x or higher (or yarn/pnpm)
- Git

# Optional but recommended
- VSCode with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Tailwind CSS IntelliSense
```

### Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd workover-app

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Generate Supabase types
npm run type-check

# 5. Start development server
npm run dev
```

### Environment Variables

Minimum required `.env.local`:

```bash
# Supabase (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Optional - Development
VITE_BOOKING_TWO_STEP=true
VITE_ENABLE_NETWORKING=true
```

---

## Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Start dev server
npm run dev

# 4. Make changes and test
# ... development ...

# 5. Run checks before commit
npm run lint
npm run type-check
npm test

# 6. Commit changes
git add .
git commit -m "feat: add my feature"

# 7. Push and create PR
git push origin feature/my-feature
```

### Branch Naming

```
feature/  - New features
fix/      - Bug fixes
refactor/ - Code refactoring
docs/     - Documentation
test/     - Test additions
chore/    - Maintenance tasks
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add booking calendar view
fix: resolve date picker timezone issue
docs: update API reference
style: format code with prettier
refactor: simplify booking validation logic
test: add unit tests for availability check
chore: update dependencies
```

---

## Project Structure

### Directory Organization

```
src/
├── components/          # React components
│   ├── ui/             # Base UI (shadcn)
│   ├── shared/         # Shared components
│   ├── spaces/         # Space feature
│   ├── bookings/       # Booking feature
│   ├── messages/       # Messaging feature
│   ├── admin/          # Admin feature
│   ├── auth/           # Authentication
│   ├── error/          # Error boundaries
│   ├── performance/    # Performance monitoring
│   └── optimization/   # Lazy loading utilities
│
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   ├── useBooking.ts
│   └── useDebounce.ts
│
├── lib/                # Utilities & services
│   ├── supabase.ts     # Supabase client
│   ├── logger.ts       # Structured logging
│   ├── sre-logger.ts   # SRE logging
│   ├── react-query-config.ts  # React Query setup
│   └── sentry-config.ts       # Sentry setup
│
├── schemas/            # Zod validation schemas
│   ├── spaceSchema.ts
│   ├── bookingSchema.ts
│   └── profileSchema.ts
│
├── pages/              # Route components
│   ├── Index.tsx
│   ├── Dashboard.tsx
│   └── Profile.tsx
│
├── types/              # TypeScript types
│   └── database.types.ts  # Supabase types
│
├── utils/              # Helper functions
│   ├── date.ts
│   ├── format.ts
│   └── validation.ts
│
├── constants/          # Application constants
│   └── index.ts
│
└── config/             # Configuration
    └── app.config.ts
```

### Feature-Based Organization

Organize related files together:

```
src/components/bookings/
├── BookingCard.tsx
├── BookingForm.tsx
├── BookingList.tsx
├── useBooking.ts        # Related hook
└── bookingUtils.ts      # Related utils
```

---

## Coding Standards

### TypeScript

```typescript
// ✅ Good - Explicit types
interface BookingData {
  spaceId: string;
  date: string;
  startTime: string;
}

function createBooking(data: BookingData): Promise<Booking> {
  return supabase.from('bookings').insert(data);
}

// ❌ Bad - Any types
function createBooking(data: any): any {
  return supabase.from('bookings').insert(data);
}
```

### React Components

```typescript
// ✅ Good - Functional component with types
interface SpaceCardProps {
  space: Space;
  onSelect?: (id: string) => void;
}

export function SpaceCard({ space, onSelect }: SpaceCardProps) {
  return (
    <Card onClick={() => onSelect?.(space.id)}>
      <h3>{space.title}</h3>
    </Card>
  );
}

// ❌ Bad - No types, unclear props
export function SpaceCard(props) {
  return <Card>{props.title}</Card>;
}
```

### Custom Hooks

```typescript
// ✅ Good - Descriptive name, typed return
export function useBookingForm(spaceId: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const submit = async (data: BookingData) => {
    setLoading(true);
    try {
      await createBooking(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  
  return { submit, loading, error };
}
```

### State Management

```typescript
// ✅ Good - React Query for server state
const { data, isLoading } = useQuery({
  queryKey: ['spaces', city],
  queryFn: () => fetchSpaces(city),
});

// ✅ Good - useState for UI state
const [isOpen, setIsOpen] = useState(false);

// ❌ Bad - useState for server data
const [spaces, setSpaces] = useState([]);
useEffect(() => {
  fetchSpaces().then(setSpaces);
}, []);
```

---

## Testing

### Unit Tests

```typescript
// BookingForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BookingForm } from './BookingForm';

describe('BookingForm', () => {
  it('validates required fields', async () => {
    render(<BookingForm spaceId="123" />);
    
    const submitButton = screen.getByRole('button', { name: /prenota/i });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/data richiesta/i)).toBeInTheDocument();
  });
  
  it('submits valid booking', async () => {
    const onSubmit = jest.fn();
    render(<BookingForm spaceId="123" onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/data/i), {
      target: { value: '2025-02-15' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /prenota/i }));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
```

### Integration Tests

```typescript
// booking-flow.test.tsx
describe('Booking Flow', () => {
  it('completes full booking process', async () => {
    // 1. Browse spaces
    render(<SpaceList />);
    const spaceCard = await screen.findByText('Modern Office');
    fireEvent.click(spaceCard);
    
    // 2. Select dates
    const dateInput = screen.getByLabelText(/data/i);
    fireEvent.change(dateInput, { target: { value: '2025-02-15' } });
    
    // 3. Confirm booking
    const confirmButton = screen.getByRole('button', { name: /conferma/i });
    fireEvent.click(confirmButton);
    
    // 4. Verify success
    expect(await screen.findByText(/prenotazione confermata/i)).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
// e2e/booking.spec.ts
import { test, expect } from '@playwright/test';

test('user can book a space', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // Find space
  await page.goto('/spaces');
  await page.click('text=Modern Office');
  
  // Book
  await page.fill('[name="booking_date"]', '2025-02-15');
  await page.selectOption('[name="start_time"]', '09:00');
  await page.selectOption('[name="end_time"]', '17:00');
  await page.click('text=Prenota');
  
  // Verify
  await expect(page.locator('text=Prenotazione confermata')).toBeVisible();
});
```

### Running Tests

```bash
# Unit tests
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage

# E2E tests
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Interactive mode
npm run test:smoke        # Smoke tests only
```

---

## Database Development

### Working with Migrations

```bash
# Create new migration
supabase migration new add_bookings_table

# Apply migrations
supabase db push

# Reset database (development only!)
supabase db reset

# Generate TypeScript types
npm run type-check
```

### Writing Migrations

```sql
-- migrations/20250101_add_notifications.sql

-- Create table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "users_view_own_notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
```

### Updating Tables

When modifying tables, update:

1. **Migration** - Add/modify columns
2. **RLS Policies** - Update security policies
3. **TypeScript Types** - Regenerate types
4. **Queries** - Update affected queries
5. **Components** - Update UI components

```bash
# After migration
npm run type-check  # Regenerate types
npm test            # Verify queries still work
```

---

## Debugging

### React DevTools

```tsx
// Add display names for debugging
SpaceCard.displayName = 'SpaceCard';

// Use React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Console Logging

```typescript
// ✅ Good - Structured logging
import { sreLogger } from '@/lib/sre-logger';

sreLogger.info('Booking created', {
  action: 'create_booking',
  bookingId: booking.id,
  userId: user.id,
});

sreLogger.error('Booking failed', {
  action: 'create_booking_error',
  error: error.message,
}, error);

// ❌ Bad - console.log
console.log('booking created');
```

### Network Debugging

```typescript
// Enable verbose Supabase logging
const supabase = createClient(url, key, {
  auth: {
    debug: true,
  },
});
```

### Performance Debugging

```typescript
// Use Performance Monitor
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor';

<PerformanceMonitor />

// Measure component render time
import { memo } from 'react';

const ExpensiveComponent = memo(({ data }) => {
  // Component logic
});
```

---

## Performance

### Code Splitting

```typescript
// ✅ Good - Lazy load heavy components
const SpaceMap = lazy(() => import('./SpaceMap'));
const Analytics = lazy(() => import('./Analytics'));

// Use with Suspense
<Suspense fallback={<Spinner />}>
  <SpaceMap />
</Suspense>
```

### Memoization

```typescript
// Expensive calculations
const sortedSpaces = useMemo(
  () => spaces.sort((a, b) => a.price - b.price),
  [spaces]
);

// Stable callback references
const handleClick = useCallback(
  (id: string) => {
    onSelect(id);
  },
  [onSelect]
);

// Component memoization
const SpaceCard = memo(({ space }) => {
  return <Card>{space.title}</Card>;
});
```

### React Query Optimization

```typescript
// Prefetch on hover
const handleMouseEnter = () => {
  queryClient.prefetchQuery({
    queryKey: ['space', id],
    queryFn: () => fetchSpace(id),
  });
};

// Stale-while-revalidate pattern
const { data } = useQuery({
  queryKey: ['spaces'],
  queryFn: fetchSpaces,
  staleTime: 5 * 60 * 1000,  // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

---

## Deployment

### Pre-deployment Checklist

```bash
# 1. Run all checks
npm run lint
npm run type-check
npm test
npm run test:e2e

# 2. Build production
npm run build

# 3. Test production build
npm run preview

# 4. Check bundle size
npm run analyze
```

### Environment-Specific Configs

```typescript
// config/app.config.ts
export const config = {
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
  
  // Feature flags
  features: {
    networking: import.meta.env.VITE_ENABLE_NETWORKING === 'true',
    twoStepBooking: import.meta.env.VITE_BOOKING_TWO_STEP === 'true',
  },
  
  // API endpoints
  api: {
    supabase: import.meta.env.VITE_SUPABASE_URL,
  },
};
```

---

## Common Tasks

### Adding a New Feature

1. **Create branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Create component**
   ```bash
   mkdir src/components/my-feature
   touch src/components/my-feature/MyFeature.tsx
   ```

3. **Add schema** (if needed)
   ```bash
   touch src/schemas/myFeatureSchema.ts
   ```

4. **Add tests**
   ```bash
   touch src/components/my-feature/__tests__/MyFeature.test.tsx
   ```

5. **Update routing**
   ```typescript
   // src/components/routing/AppRoutes.tsx
   const MyFeature = lazy(() => import('@/pages/MyFeature'));
   ```

### Adding a Database Table

1. **Create migration**
   ```bash
   supabase migration new add_my_table
   ```

2. **Write SQL**
   ```sql
   CREATE TABLE my_table (...);
   ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
   CREATE POLICY ...;
   ```

3. **Apply migration**
   ```bash
   supabase db push
   ```

4. **Regenerate types**
   ```bash
   npm run type-check
   ```

5. **Update queries**
   ```typescript
   const { data } = await supabase.from('my_table').select('*');
   ```

---

## Resources

### Documentation
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/docs)
- [React Query](https://tanstack.com/query/latest)

### Tools
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Playwright](https://playwright.dev/)
- [Vite](https://vitejs.dev/)

### Internal Docs
- [Architecture](./ARCHITECTURE.md)
- [API Reference](./API_REFERENCE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Schema Reference](./SCHEMA_REFERENCE.md)

---

**Last Updated**: 2025-01-XX  
**Version**: 2.0
