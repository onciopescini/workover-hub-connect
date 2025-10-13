# ADR 001: Database Choice - Supabase

## Status
**Accepted** - 2024-01-15

## Context
We needed a scalable, developer-friendly database solution with built-in authentication, real-time capabilities, and serverless functions.

## Decision
We chose **Supabase** as our backend-as-a-service platform.

## Rationale

### Pros
- **PostgreSQL**: Industry-standard, powerful relational database
- **Row Level Security (RLS)**: Built-in data security at database level
- **Real-time subscriptions**: WebSocket support out of the box
- **Edge Functions**: Serverless Deno runtime for backend logic
- **Storage**: Built-in file storage with CDN
- **Auto-generated APIs**: RESTful and GraphQL APIs
- **Open Source**: Can self-host if needed
- **Developer Experience**: Excellent documentation and tooling
- **Cost-effective**: Generous free tier, pay-as-you-grow pricing

### Cons
- **Vendor lock-in risk**: Mitigated by open-source nature
- **Learning curve**: RLS policies require understanding
- **Limited compute**: Edge functions have execution limits

## Alternatives Considered

### Firebase
- **Rejected**: NoSQL data model less suitable for relational booking data
- **Rejected**: Less control over data structure and queries

### Custom Node.js + PostgreSQL
- **Rejected**: Higher development and maintenance overhead
- **Rejected**: Need to build auth, real-time, storage from scratch

### AWS Amplify
- **Rejected**: More complex setup and configuration
- **Rejected**: Higher learning curve for team

## Consequences

### Positive
- Rapid development with built-in features
- Strong security with RLS policies
- Real-time messaging works out of the box
- Easy to scale infrastructure
- Great developer experience

### Negative
- Team needs to learn RLS policy syntax
- Edge functions limited to Deno runtime
- Must monitor Supabase service limits

## Implementation Notes
- All database access goes through Supabase client
- RLS policies enforce all authorization rules
- Edge Functions handle sensitive operations (payments, emails)
- Regular backups configured via Supabase dashboard

## Review Date
2025-06-01 - Reassess after 6 months of production use
