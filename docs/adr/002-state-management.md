# ADR 002: State Management - React Query

## Status
**Accepted** - 2024-01-20

## Context
We needed a robust state management solution to handle server state (API data), client state (UI), and caching for optimal performance.

## Decision
We chose **TanStack Query (React Query)** for server state management, combined with React Context for auth state and local component state for UI.

## Rationale

### React Query Pros
- **Server state specialization**: Purpose-built for API data management
- **Automatic caching**: Intelligent cache invalidation and updates
- **Background refetching**: Keeps data fresh automatically
- **Optimistic updates**: Better UX during mutations
- **DevTools**: Excellent debugging experience
- **Type safety**: Full TypeScript support
- **Small bundle size**: ~13kb minified

### Architecture
```
Server State (React Query)
  ├── Bookings, Spaces, Reviews
  ├── User profiles
  └── Messages, Notifications

Client State (React Context)
  └── Auth state (user, session)

UI State (Component State)
  ├── Form inputs
  ├── Modals, dialogs
  └── Temporary UI flags
```

## Alternatives Considered

### Redux Toolkit
- **Rejected**: Overkill for our needs
- **Rejected**: More boilerplate for async operations
- **Rejected**: Not specialized for server state

### Zustand
- **Rejected**: Good for client state, but lacks React Query features
- **Rejected**: Would need additional library for server state
- **Could reconsider**: If we need complex client state in future

### SWR
- **Considered**: Very similar to React Query
- **Rejected**: React Query has better DevTools and ecosystem

## Consequences

### Positive
- Minimal boilerplate for API calls
- Automatic loading and error states
- Built-in retry logic and error recovery
- Excellent performance with caching
- Easy to implement optimistic updates
- Great developer experience with DevTools

### Negative
- Learning curve for advanced patterns (optimistic updates, infinite queries)
- Need to carefully design cache keys
- Must understand staleness and refetching behavior

## Implementation Guidelines

### Query Keys
```typescript
// ✅ Good: Hierarchical, descriptive
['spaces', spaceId]
['bookings', 'host', hostId]
['messages', conversationId, { limit: 20 }]

// ❌ Bad: Flat, unclear
['space']
['data', id]
```

### Cache Configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});
```

### Mutations with Invalidation
```typescript
const mutation = useMutation({
  mutationFn: createBooking,
  onSuccess: () => {
    queryClient.invalidateQueries(['bookings']);
    queryClient.invalidateQueries(['spaces', spaceId]);
  },
});
```

## Review Date
2025-07-01 - Reassess after 6 months of production use
