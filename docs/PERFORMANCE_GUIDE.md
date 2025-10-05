# 🚀 Performance Optimization Guide

Guida completa alle ottimizzazioni di performance implementate nel progetto.

---

## 📚 Indice

1. [React Query Optimization](#react-query-optimization)
2. [Code Splitting & Lazy Loading](#code-splitting--lazy-loading)
3. [Hooks di Performance](#hooks-di-performance)
4. [Bundle Optimization](#bundle-optimization)
5. [Best Practices](#best-practices)

---

## React Query Optimization

### Configurazione Avanzata

```typescript
import { optimizedQueryClient, queryKeys } from '@/lib/react-query-config';

// Il QueryClient è già configurato con:
// - Cache intelligente (5 min staleTime, 20 min gcTime)
// - Retry automatico con backoff esponenziale
// - Error handling integrato con Sentry
// - Logging strutturato
```

### Query Keys Factory

```typescript
import { queryKeys } from '@/lib/react-query-config';

// Spaces
const spaceQuery = useQuery({
  queryKey: queryKeys.spaces.detail(spaceId),
  queryFn: () => fetchSpace(spaceId),
});

// User bookings
const bookingsQuery = useQuery({
  queryKey: queryKeys.bookings.userBookings(userId),
  queryFn: () => fetchUserBookings(userId),
});
```

### Prefetching Strategico

```typescript
import { prefetchUtils } from '@/lib/react-query-config';

// Prefetch al hover
const handleMouseEnter = async () => {
  await prefetchUtils.prefetchSpace(spaceId, () => fetchSpace(spaceId));
};

<SpaceCard onMouseEnter={handleMouseEnter} />
```

### Invalidation Automatica

```typescript
import { invalidateUtils } from '@/lib/react-query-config';

// Dopo una modifica
await invalidateUtils.invalidateSpace(spaceId);

// Invalida tutti gli spaces
await invalidateUtils.invalidateSpaces();
```

### Optimistic Updates

```typescript
import { optimisticUtils } from '@/lib/react-query-config';

// Update immediato nell'UI
const handleLike = () => {
  optimisticUtils.updateSpaceFavorite(spaceId, true);
  
  // La mutation verrà eseguita in background
  likeMutation.mutate(spaceId);
};
```

### Hook Ottimizzati

```typescript
import { useOptimizedQuery, useOptimizedMutation } from '@/hooks/useOptimizedQuery';

// Query ottimizzata con logging
const query = useOptimizedQuery({
  queryKey: queryKeys.spaces.all,
  queryFn: fetchSpaces,
  logKey: 'fetch_spaces',
});

// Mutation con invalidation automatica
const mutation = useOptimizedMutation({
  mutationFn: createSpace,
  invalidateKeys: [['spaces']],
  logKey: 'create_space',
});
```

---

## Code Splitting & Lazy Loading

### Componenti Lazy

```typescript
import { 
  LazySpaceMap, 
  LazyCalendar,
  usePreloadOnHover 
} from '@/components/optimization/LazyComponents';

function MyComponent() {
  const [showMap, setShowMap] = useState(false);
  
  // Preload al hover
  const preloadProps = usePreloadOnHover(
    () => import('@/components/spaces/SpaceMap')
  );
  
  return (
    <>
      <button 
        {...preloadProps}
        onClick={() => setShowMap(true)}
      >
        Show Map
      </button>
      
      {showMap && <LazySpaceMap spaceId={id} />}
    </>
  );
}
```

### Custom Lazy Component

```typescript
import { lazyWithSuspense } from '@/components/optimization/LazyComponents';

const MyHeavyComponent = lazyWithSuspense(
  () => import('./MyHeavyComponent'),
  <div>Loading...</div> // Custom fallback
);
```

### Route-Based Splitting

Le route sono già ottimizzate in `AppRoutes.tsx`:

```typescript
// Eager loading per pagine pubbliche (SEO)
import Index from "@/pages/Index";
import Login from "@/pages/Login";

// Lazy loading per pagine protette
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Profile = lazy(() => import("@/pages/Profile"));
```

---

## Hooks di Performance

### useDebounce

```typescript
import { useDebounce, useDebouncedCallback } from '@/hooks/useDebounce';

// Debounce di valore
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 500);

// Esegui query solo quando il valore si stabilizza
useEffect(() => {
  searchQuery(debouncedSearch);
}, [debouncedSearch]);

// Debounce di callback
const handleInput = useDebouncedCallback((value: string) => {
  // Chiamato max una volta ogni 500ms
  performExpensiveOperation(value);
}, 500);
```

### useThrottledCallback

```typescript
import { useThrottledCallback } from '@/hooks/useDebounce';

const handleScroll = useThrottledCallback(() => {
  // Chiamato max una volta ogni 200ms
  updateScrollPosition();
}, 200);

<div onScroll={handleScroll} />
```

### useIntersectionObserver

```typescript
import { 
  useIntersectionObserver,
  useLazyImage,
  useScrollAnimation,
  useInfiniteScroll 
} from '@/hooks/useIntersectionObserver';

// Lazy loading immagini
const [imgRef, loadedSrc] = useLazyImage(imageUrl);

<img 
  ref={imgRef} 
  src={loadedSrc || placeholderUrl} 
  alt="..." 
/>

// Animazioni on scroll
const [ref, isVisible] = useScrollAnimation();

<div 
  ref={ref} 
  className={isVisible ? 'animate-fade-in' : 'opacity-0'}
>
  Content
</div>

// Infinite scroll
const loadMoreRef = useInfiniteScroll(() => {
  loadMoreItems();
}, { disabled: isLoading });

<div ref={loadMoreRef}>Load More...</div>
```

---

## Bundle Optimization

Il progetto usa **code splitting automatico** in `vite.config.ts`:

### Vendor Splitting

```typescript
// Chunks separati per:
- react-vendor (React core)
- router (React Router)
- react-query (TanStack Query)
- supabase (Supabase client)
- radix-ui (componenti UI)
- forms (React Hook Form)
- validation (Zod)
- icons (Lucide)
- maps (Mapbox)
- charts (Recharts)
```

### Tree Shaking

Il bundler rimuove automaticamente:
- Codice non utilizzato
- Console statements in production
- Debug statements

---

## Best Practices

### 1. Query Caching

```typescript
// ✅ BUONO: Usa query keys factory
queryKey: queryKeys.spaces.detail(id)

// ❌ CATTIVO: Query keys inconsistenti
queryKey: ['space', id]
queryKey: ['spaces', id]
```

### 2. Lazy Loading

```typescript
// ✅ BUONO: Lazy loading componenti pesanti
const Map = lazy(() => import('./Map'));

// ❌ CATTIVO: Import sincrono di componenti pesanti
import Map from './Map';
```

### 3. Prefetching

```typescript
// ✅ BUONO: Prefetch al hover
onMouseEnter={() => prefetchSpace(id)}

// ❌ CATTIVO: Nessun prefetch
```

### 4. Debouncing

```typescript
// ✅ BUONO: Debounce search input
const debouncedSearch = useDebounce(search, 500);

// ❌ CATTIVO: Query ad ogni keystroke
onChange={(e) => performSearch(e.target.value)}
```

### 5. Memoization

```typescript
// ✅ BUONO: Memo per componenti costosi
const ExpensiveList = React.memo(({ items }) => {
  return items.map(item => <Item key={item.id} {...item} />);
});

// ✅ BUONO: useMemo per calcoli costosi
const sortedItems = useMemo(() => 
  items.sort((a, b) => a.value - b.value),
  [items]
);

// ✅ BUONO: useCallback per callbacks stabili
const handleClick = useCallback(() => {
  doSomething(dependency);
}, [dependency]);
```

### 6. Virtual Scrolling

Per liste molto lunghe (>100 items), considera `react-window`:

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {items[index]}
    </div>
  )}
</FixedSizeList>
```

---

## 📊 Performance Metrics

Obiettivi target:

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | < 1.8s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.8s | Lighthouse |
| Total Blocking Time | < 200ms | Lighthouse |
| Bundle Size (gzipped) | < 500KB | vite-bundle-analyzer |
| Query Response Time | < 500ms | React Query Devtools |

---

## 🔍 Monitoring

```typescript
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor';
import { PerformanceBudget } from '@/components/performance/PerformanceBudget';

// Già inclusi in App.tsx
<PerformanceMonitor /> // Monitora Web Vitals
<PerformanceBudget /> // Verifica budget di performance
```

---

## 🛠️ Tools

1. **React Query Devtools** (development)
   - Visualizza query cache
   - Monitora query timing
   - Debug invalidations

2. **Vite Bundle Analyzer** (production build)
   ```bash
   npm run build
   # Apre automaticamente il report del bundle
   ```

3. **Lighthouse** (Chrome DevTools)
   - Performance audit
   - Core Web Vitals
   - Best practices

4. **Sentry Performance Monitoring**
   - Transaction timing
   - API performance
   - Error tracking

---

**Performance optimization è un processo continuo. Monitora regolarmente le metriche e ottimizza dove necessario.**
