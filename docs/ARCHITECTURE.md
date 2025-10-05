# 🏗️ Architecture Overview

Documentazione completa dell'architettura WorkOver platform.

---

## 📚 Table of Contents

1. [System Architecture](#system-architecture)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Performance Architecture](#performance-architecture)
7. [Deployment Architecture](#deployment-architecture)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  React Query │  │  Local Cache │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE BACKEND                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │ Edge Functions│  │   Storage    │      │
│  │     RLS      │  │  (Serverless) │  │   (Files)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Stripe    │  │    Sentry    │  │   Mapbox     │      │
│  │  (Payments)  │  │  (Monitoring)│  │    (Maps)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite (SWC compiler)
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + CSS Variables
- **UI Components**: Radix UI + shadcn/ui
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion

#### Backend
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth (JWT-based)
- **Storage**: Supabase Storage (S3-compatible)
- **Edge Functions**: Deno-based serverless functions
- **Real-time**: Supabase Realtime (WebSockets)

#### Infrastructure
- **Hosting**: Lovable Platform / Vercel
- **CDN**: Cloudflare / Vercel Edge Network
- **Monitoring**: Sentry + Custom SRE Dashboard
- **Analytics**: PostHog + Plausible

---

## Frontend Architecture

### Component Architecture

```
src/
├── components/
│   ├── ui/                    # Base UI components (atomic)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── shared/                # Shared business components
│   │   ├── ErrorFallback.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ...
│   ├── spaces/                # Feature: Spaces
│   │   ├── SpaceCard.tsx
│   │   ├── SpaceForm.tsx
│   │   ├── SpaceMap.tsx
│   │   └── ...
│   ├── bookings/              # Feature: Bookings
│   ├── messages/              # Feature: Messaging
│   ├── admin/                 # Feature: Admin
│   ├── auth/                  # Feature: Authentication
│   ├── performance/           # Performance monitoring
│   ├── error/                 # Error boundaries
│   └── optimization/          # Lazy loading utilities
```

### State Management Strategy

#### 1. Server State (React Query)
```typescript
// Gestione cache, prefetching, invalidation
const { data, isLoading } = useQuery({
  queryKey: queryKeys.spaces.detail(id),
  queryFn: () => fetchSpace(id),
  staleTime: 5 * 60 * 1000, // 5 minuti
});
```

#### 2. UI State (React useState/useReducer)
```typescript
// Stato locale componente
const [isOpen, setIsOpen] = useState(false);
```

#### 3. Global State (Context API)
```typescript
// AuthContext, ThemeContext, GDPRContext
const { user, isAuthenticated } = useAuth();
```

### Routing Architecture

```typescript
// Route-based code splitting
<Routes>
  {/* Eager loading per SEO */}
  <Route path="/" element={<Index />} />
  <Route path="/spaces" element={<PublicSpaces />} />
  
  {/* Lazy loading per performance */}
  <Route path="/dashboard" element={<LazyDashboard />} />
  <Route path="/profile" element={<LazyProfile />} />
</Routes>
```

### Data Fetching Patterns

#### Pattern 1: Simple Query
```typescript
const { data, error, isLoading } = useQuery({
  queryKey: ['spaces'],
  queryFn: fetchSpaces,
});
```

#### Pattern 2: Dependent Query
```typescript
const { data: space } = useQuery({
  queryKey: ['space', id],
  queryFn: () => fetchSpace(id),
});

const { data: bookings } = useQuery({
  queryKey: ['bookings', id],
  queryFn: () => fetchBookings(id),
  enabled: !!space, // Solo quando space è caricato
});
```

#### Pattern 3: Parallel Queries
```typescript
const results = useQueries({
  queries: [
    { queryKey: ['spaces'], queryFn: fetchSpaces },
    { queryKey: ['bookings'], queryFn: fetchBookings },
    { queryKey: ['profile'], queryFn: fetchProfile },
  ],
});
```

#### Pattern 4: Infinite Scroll
```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['spaces'],
  queryFn: ({ pageParam = 1 }) => fetchSpaces(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextPage,
});
```

---

## Backend Architecture

### Database Schema

#### Core Tables
1. **profiles** - User profiles (host, coworker, admin)
2. **spaces** - Workspace listings
3. **bookings** - Booking records
4. **messages** - Direct messaging
5. **payments** - Payment transactions
6. **reviews** - Booking reviews

#### Security Tables
7. **admin_actions_log** - Admin activity tracking
8. **data_access_logs** - GDPR compliance logs
9. **rate_limits** - API rate limiting

#### Feature Tables
10. **events** - Networking events
11. **connections** - User connections
12. **favorites** - Saved spaces
13. **notifications** - User notifications

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete schema.

### Row Level Security (RLS)

Ogni tabella ha policy RLS per garantire:
- Utenti vedono solo i loro dati
- Host vedono bookings dei loro spazi
- Admin hanno accesso completo

Esempio:
```sql
-- Bookings: User e Host possono vedere
CREATE POLICY "Coworkers and hosts can view bookings"
ON bookings FOR SELECT
USING (
  auth.uid() = user_id OR
  auth.uid() IN (
    SELECT host_id FROM spaces WHERE id = bookings.space_id
  )
);
```

### Edge Functions

```
supabase/functions/
├── stripe-webhook/        # Gestione webhook Stripe
├── booking-confirm/       # Conferma booking automatica
├── notification-send/     # Invio notifiche
├── image-optimize/        # Ottimizzazione immagini
└── shared/                # Utilities condivise
    ├── cors.ts
    └── error-handler.ts
```

#### Deployment
```bash
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy booking-confirm
```

---

## Data Flow

### Booking Flow

```
1. User selects space and dates
   └─> Client: SpaceDetail component

2. Check availability
   └─> React Query: prefetch availability
   └─> Supabase: Query availability table

3. Create booking (pending)
   └─> Client: BookingForm mutation
   └─> Supabase: Insert into bookings table
   └─> RLS: Verify user is authenticated

4. Process payment
   └─> Stripe: Create checkout session
   └─> Redirect to Stripe Checkout

5. Payment webhook
   └─> Edge Function: stripe-webhook
   └─> Update booking status: "confirmed"
   └─> Create payment record

6. Notification
   └─> Edge Function: notification-send
   └─> Email to host and coworker

7. Cache invalidation
   └─> React Query: Invalidate bookings
   └─> UI: Auto-refresh
```

### Authentication Flow

```
1. User submits credentials
   └─> Supabase Auth: signIn()

2. Supabase validates
   └─> Return JWT token

3. Client stores session
   └─> localStorage (by Supabase)

4. AuthProvider updates
   └─> Context: setUser(userData)
   └─> React Query: Prefetch user data

5. Protected routes accessible
   └─> AuthProtected wrapper
   └─> Redirect if not authenticated
```

---

## Security Architecture

### Authentication Layers

```
┌─────────────────────────────────────────┐
│     1. Supabase Auth (JWT)              │
│        - Email/Password                  │
│        - Google OAuth                    │
│        - Magic Links                     │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│     2. Row Level Security (RLS)         │
│        - auth.uid() checks              │
│        - Role-based policies            │
│        - Data isolation                 │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│     3. Application Logic                │
│        - Role checks (host/coworker)    │
│        - Business rules validation      │
│        - Custom permissions             │
└─────────────────────────────────────────┘
```

### Security Measures

#### Frontend
1. **XSS Protection**
   - DOMPurify per contenuti HTML
   - Sanitizzazione input utente
   - CSP headers

2. **CSRF Protection**
   - SameSite cookies
   - CSRF tokens su form critici

3. **Rate Limiting**
   - Client-side throttling
   - Debounced search inputs

#### Backend
1. **Row Level Security**
   - Ogni query filtra per auth.uid()
   - Nessun accesso diretto senza autenticazione

2. **Edge Function Security**
   - JWT verification
   - CORS configuration
   - Input validation

3. **API Rate Limiting**
   - Rate limits table
   - Exponential backoff
   - IP-based throttling

### GDPR Compliance

```
┌─────────────────────────────────────────┐
│  Data Access Tracking                   │
│  - Ogni accesso ai dati loggato         │
│  - data_access_logs table               │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│  Data Export (Right to Access)          │
│  - Edge Function: gdpr-export           │
│  - JSON export di tutti i dati utente   │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│  Data Deletion (Right to be Forgotten)  │
│  - Edge Function: gdpr-delete           │
│  - Cancellazione definitiva dati        │
│  - Anonimizzazione review/bookings      │
└─────────────────────────────────────────┘
```

---

## Performance Architecture

### Optimization Layers

#### 1. Bundle Optimization
```javascript
// vite.config.ts
rollupOptions: {
  output: {
    manualChunks: {
      'react-vendor': ['react', 'react-dom'],
      'router': ['react-router-dom'],
      'react-query': ['@tanstack/react-query'],
      'ui': ['@radix-ui/...'],
    }
  }
}
```

#### 2. Code Splitting
```typescript
// Lazy loading componenti pesanti
const SpaceMap = lazy(() => import('./SpaceMap'));
const Analytics = lazy(() => import('./Analytics'));
```

#### 3. React Query Cache
```typescript
// Cache configuration
queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minuti
      cacheTime: 10 * 60 * 1000,     // 10 minuti
      refetchOnWindowFocus: false,
    }
  }
});
```

#### 4. Image Optimization
```typescript
// Lazy loading immagini
const [imgRef, isVisible] = useIntersectionObserver();

<img
  ref={imgRef}
  src={isVisible ? actualSrc : placeholderSrc}
  loading="lazy"
/>
```

#### 5. Database Optimization
- Indexes su foreign keys
- Materialized views per analytics
- Query caching con availability_cache

### Performance Monitoring

```typescript
// Web Vitals tracking
import { measureWebVitals } from '@/lib/performance';

measureWebVitals({
  onLCP: (metric) => sendToSentry('LCP', metric),
  onFID: (metric) => sendToSentry('FID', metric),
  onCLS: (metric) => sendToSentry('CLS', metric),
});
```

---

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────┐
│           Cloudflare CDN                 │
│  - Static assets caching                │
│  - DDoS protection                       │
│  - Global edge network                   │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│         Vercel Edge Network              │
│  - SSR (if needed)                       │
│  - Edge functions                        │
│  - Automatic HTTPS                       │
└─────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────┐
│         Supabase Cloud                   │
│  - PostgreSQL (multi-region)            │
│  - Edge Functions (Deno)                │
│  - Object Storage                        │
│  - Realtime WebSockets                   │
└─────────────────────────────────────────┘
```

### CI/CD Pipeline

```
1. Push to main branch
   └─> GitHub Actions triggered

2. Build & Test
   ├─> npm run build
   ├─> npm run test
   └─> npm run type-check

3. Deploy to staging
   └─> Vercel preview deployment

4. Run E2E tests
   └─> Playwright tests

5. Deploy to production
   └─> Vercel production
   └─> Supabase migrations
```

### Environment Strategy

```
Development:
  - Local Supabase instance
  - Test Stripe keys
  - Debug mode enabled

Staging:
  - Supabase staging project
  - Test Stripe keys
  - Sentry reporting

Production:
  - Supabase production project
  - Live Stripe keys
  - Full monitoring
  - Error tracking
```

---

## Scalability Considerations

### Horizontal Scaling
- Supabase auto-scales database connections
- Edge Functions scale automatically
- CDN handles traffic spikes

### Database Scaling
- Read replicas for analytics queries
- Connection pooling (PgBouncer)
- Partitioning for large tables (future)

### Caching Strategy
1. **Browser Cache** - Static assets (1 year)
2. **CDN Cache** - HTML/CSS/JS (1 hour)
3. **React Query Cache** - API responses (5-10 min)
4. **Database Cache** - Availability queries (1 min)

---

## Error Handling Architecture

### Error Boundaries

```typescript
<ErrorBoundary
  fallback={<ErrorFallback />}
  onError={(error, errorInfo) => {
    Sentry.captureException(error, { errorInfo });
  }}
>
  <App />
</ErrorBoundary>
```

### Error Recovery

1. **Network Errors** - Auto-retry con exponential backoff
2. **Auth Errors** - Redirect a login
3. **Validation Errors** - Form feedback
4. **Critical Errors** - ErrorBoundary + Sentry report

---

## Monitoring Stack

```
┌─────────────────────────────────────────┐
│            Sentry                        │
│  - Error tracking                        │
│  - Performance monitoring                │
│  - User session replay                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Custom SRE Dashboard             │
│  - Real-time metrics                     │
│  - API latency (P50, P95, P99)          │
│  - Error rates                           │
│  - Active sessions                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Supabase Dashboard               │
│  - Database performance                  │
│  - Query analytics                       │
│  - Connection pooling                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Plausible Analytics              │
│  - Privacy-first analytics               │
│  - User behavior tracking                │
│  - No cookies required                   │
└─────────────────────────────────────────┘
```

---

## Best Practices

### Code Organization
✅ Feature-based folder structure  
✅ Colocation (componenti + hooks + utils)  
✅ Barrel exports (index.ts)  
✅ TypeScript strict mode

### Performance
✅ Code splitting per route  
✅ Lazy loading componenti pesanti  
✅ Memoization strategica  
✅ Debouncing input  
✅ Virtual scrolling liste lunghe

### Security
✅ RLS su tutte le tabelle  
✅ Input validation (Zod)  
✅ XSS protection (DOMPurify)  
✅ HTTPS only  
✅ Secure headers (CSP, HSTS)

### Testing
✅ Unit tests per utilities  
✅ Component tests per UI  
✅ Integration tests per flows  
✅ E2E tests per critical paths  
✅ >80% code coverage

---

**Ultimo aggiornamento**: 2025-01-XX  
**Versione architettura**: 2.0
