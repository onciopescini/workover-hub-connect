# 💻 Development Guide

## Local Setup

### Prerequisites

- **Node.js** 18+ or **Bun** 1.0+
- **Git**
- **Supabase Account** (for backend)
- **Stripe Account** (for payments)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd workover

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun run dev
```

### Environment Variables

Create a `.env.local` file:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Optional: Analytics
VITE_POSTHOG_KEY=your_posthog_key
VITE_POSTHOG_HOST=https://app.posthog.com

# Optional: Monitoring
VITE_SENTRY_DSN=your_sentry_dsn

# Optional: Maps
VITE_MAPBOX_TOKEN=your_mapbox_token
```

## Project Structure

```
workover/
├── docs/                    # Documentation
├── public/                  # Static assets
├── scripts/                 # Build and utility scripts
├── src/
│   ├── components/          # React components
│   │   ├── admin/          # Admin dashboard components
│   │   ├── auth/           # Authentication components
│   │   ├── booking/        # Booking flow components
│   │   ├── error/          # Error handling components
│   │   ├── profile/        # User profile components
│   │   ├── security/       # Security components
│   │   └── ui/             # Reusable UI components (shadcn)
│   ├── hooks/              # Custom React hooks
│   │   ├── auth/           # Authentication hooks
│   │   ├── queries/        # React Query hooks
│   │   └── ...
│   ├── lib/                # Utilities and configurations
│   ├── pages/              # Page components (routes)
│   ├── providers/          # Context providers
│   ├── types/              # TypeScript types
│   ├── utils/              # Helper functions
│   └── integrations/       # External service integrations
├── supabase/
│   ├── functions/          # Edge Functions
│   ├── migrations/         # Database migrations
│   └── config.toml         # Supabase configuration
└── tests/                  # Test files
```

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ...

# Run tests
npm test

# Run type check
npm run type-check

# Run linter
npm run lint
```

### 2. Component Development

Components follow atomic design principles:

- **Atoms**: Basic UI elements (`Button`, `Input`)
- **Molecules**: Simple component combinations (`SearchBar`)
- **Organisms**: Complex components (`SpaceCard`, `BookingForm`)
- **Templates**: Page layouts
- **Pages**: Complete pages with data fetching

### 3. State Management

- **Server State**: React Query (`@tanstack/react-query`)
- **Auth State**: `AuthContext` + `useAuth` hook
- **UI State**: Local component state or URL params
- **Form State**: React Hook Form

### 4. Styling Guidelines

- Use **Tailwind CSS** utility classes
- Use **semantic tokens** from `index.css`
- Component-specific styles in component files
- NO inline styles
- Responsive design: mobile-first

```tsx
// ✅ Good
<Button className="bg-primary text-primary-foreground">
  Click me
</Button>

// ❌ Bad
<Button style={{ backgroundColor: '#4F46E5', color: 'white' }}>
  Click me
</Button>
```

### 5. Testing Strategy

#### Unit Tests
```bash
npm run test:unit
```

Test individual functions, hooks, and utilities.

#### Integration Tests
```bash
npm run test:integration
```

Test component interactions and API calls.

#### E2E Tests
```bash
npm run test:e2e
```

Test complete user flows with Playwright.

### 6. Database Changes

Use Supabase migrations for all database changes:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_description.sql
CREATE TABLE my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users manage own data"
  ON my_table
  FOR ALL
  USING (auth.uid() = user_id);
```

### 7. Edge Functions

Create Edge Functions in `supabase/functions/`:

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { combineHeaders } from '../_shared/security-headers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: combineHeaders() });
  }

  try {
    // Function logic
    return new Response(
      JSON.stringify({ success: true }),
      { headers: combineHeaders({ 'Content-Type': 'application/json' }) }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: combineHeaders({ 'Content-Type': 'application/json' }) }
    );
  }
});
```

## Debugging

### Frontend Debugging

1. **React DevTools**: Install browser extension
2. **TanStack Query DevTools**: Enabled in development
3. **Console Logs**: Use `logger.info()`, `logger.error()`
4. **Sentry**: Check error tracking dashboard

### Backend Debugging

1. **Supabase Logs**: Check Edge Function logs
2. **Database Logs**: Check Postgres logs
3. **RLS Policies**: Test with different users

### Common Issues

#### Authentication Issues
```typescript
// Check auth state
const { authState } = useAuth();
console.log('Auth state:', authState);
```

#### Query Issues
```typescript
// Enable query logging
const queryClient = useQueryClient();
queryClient.setLogger({
  log: console.log,
  warn: console.warn,
  error: console.error,
});
```

## Performance Optimization

### Code Splitting
- Lazy load routes with `React.lazy()`
- Use dynamic imports for heavy components

### Image Optimization
- Use WebP format
- Implement lazy loading
- Use appropriate image sizes

### Bundle Analysis
```bash
npm run build
npm run analyze
```

## Code Quality

### Type Safety
- Use TypeScript strictly
- Avoid `any` type
- Define proper interfaces

### Linting
```bash
npm run lint
npm run lint:fix
```

### Formatting
Uses Prettier (auto-format on save recommended)

## Git Workflow

1. **Branch naming**: `feature/`, `fix/`, `docs/`, `refactor/`
2. **Commits**: Use conventional commits
3. **Pull Requests**: Require review before merge
4. **Main branch**: Protected, deploy on merge

## Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [Stripe Docs](https://stripe.com/docs)

---

**Need Help?** Open an issue or contact the maintainers.
