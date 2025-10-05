# 🔌 API Reference

Documentazione completa delle API Supabase (database queries, RPC functions, Edge Functions).

---

## 📚 Table of Contents

1. [Authentication API](#authentication-api)
2. [Database Queries](#database-queries)
3. [RPC Functions](#rpc-functions)
4. [Edge Functions](#edge-functions)
5. [Real-time Subscriptions](#real-time-subscriptions)
6. [Storage API](#storage-api)

---

## Authentication API

### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: {
      first_name: 'John',
      last_name: 'Doe',
      role: 'coworker'
    }
  }
});
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword'
});
```

### Sign Out

```typescript
const { error } = await supabase.auth.signOut();
```

### Get Session

```typescript
const { data: { session } } = await supabase.auth.getSession();
```

### Google OAuth

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});
```

---

## Database Queries

### Profiles

#### Get Current User Profile

```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();
```

#### Update Profile

```typescript
const { data, error } = await supabase
  .from('profiles')
  .update({
    first_name: 'John',
    last_name: 'Doe',
    bio: 'Developer',
    location: 'Milan'
  })
  .eq('id', user.id)
  .select()
  .single();
```

#### Get Public Profile

```typescript
const { data, error } = await supabase
  .from('profiles')
  .select(`
    id,
    first_name,
    last_name,
    bio,
    profile_photo_url,
    location,
    networking_enabled
  `)
  .eq('id', userId)
  .eq('networking_enabled', true)
  .single();
```

---

### Spaces

#### Get All Published Spaces

```typescript
const { data, error } = await supabase
  .from('spaces')
  .select(`
    *,
    profiles:host_id (
      first_name,
      last_name,
      profile_photo_url
    )
  `)
  .eq('is_published', true)
  .eq('status', 'approved')
  .order('created_at', { ascending: false });
```

#### Search Spaces by City

```typescript
const { data, error } = await supabase
  .from('spaces')
  .select('*')
  .eq('is_published', true)
  .ilike('city', `%${searchTerm}%`);
```

#### Get Space with Availability

```typescript
const { data, error } = await supabase
  .from('spaces')
  .select(`
    *,
    profiles:host_id (first_name, last_name, profile_photo_url),
    availability (day_of_week, start_time, end_time)
  `)
  .eq('id', spaceId)
  .single();
```

#### Create Space

```typescript
const { data, error } = await supabase
  .from('spaces')
  .insert({
    host_id: user.id,
    title: 'Modern Coworking Space',
    description: 'Beautiful space in Milan',
    space_type: 'desk',
    address: 'Via Roma 123',
    city: 'Milan',
    zip_code: '20100',
    price_per_hour: 10,
    capacity: 5,
    amenities: ['wifi', 'coffee', 'parking']
  })
  .select()
  .single();
```

#### Update Space

```typescript
const { data, error } = await supabase
  .from('spaces')
  .update({
    title: 'Updated Title',
    description: 'New description'
  })
  .eq('id', spaceId)
  .eq('host_id', user.id)
  .select()
  .single();
```

#### Delete Space

```typescript
const { error } = await supabase
  .from('spaces')
  .delete()
  .eq('id', spaceId)
  .eq('host_id', user.id);
```

---

### Bookings

#### Create Booking

```typescript
const { data, error } = await supabase
  .from('bookings')
  .insert({
    space_id: spaceId,
    user_id: user.id,
    booking_date: '2025-02-01',
    start_time: '09:00',
    end_time: '17:00',
    guests_count: 2,
    status: 'pending'
  })
  .select()
  .single();
```

#### Get User Bookings

```typescript
const { data, error } = await supabase
  .from('bookings')
  .select(`
    *,
    spaces (
      title,
      city,
      main_image_url,
      profiles:host_id (first_name, last_name)
    )
  `)
  .eq('user_id', user.id)
  .order('booking_date', { ascending: false });
```

#### Get Host Bookings

```typescript
const { data, error } = await supabase
  .from('bookings')
  .select(`
    *,
    spaces!inner (id, title),
    profiles:user_id (first_name, last_name, profile_photo_url)
  `)
  .eq('spaces.host_id', user.id)
  .order('booking_date', { ascending: false });
```

#### Update Booking Status

```typescript
const { data, error } = await supabase
  .from('bookings')
  .update({ status: 'confirmed' })
  .eq('id', bookingId)
  .select()
  .single();
```

#### Cancel Booking

```typescript
const { data, error } = await supabase
  .from('bookings')
  .update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancellation_reason: 'User cancelled'
  })
  .eq('id', bookingId)
  .eq('user_id', user.id)
  .select()
  .single();
```

---

### Messages

#### Send Message

```typescript
const { data, error } = await supabase
  .from('messages')
  .insert({
    sender_id: user.id,
    booking_id: bookingId,
    content: 'Hello, I have a question...'
  })
  .select()
  .single();
```

#### Get Conversation Messages

```typescript
const { data, error } = await supabase
  .from('messages')
  .select(`
    *,
    profiles:sender_id (first_name, last_name, profile_photo_url)
  `)
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });
```

#### Mark Messages as Read

```typescript
const { error } = await supabase
  .from('messages')
  .update({ is_read: true })
  .eq('conversation_id', conversationId)
  .neq('sender_id', user.id);
```

---

### Reviews

#### Create Review

```typescript
const { data, error } = await supabase
  .from('booking_reviews')
  .insert({
    booking_id: bookingId,
    author_id: user.id,
    target_id: hostId,
    rating: 5,
    content: 'Great space, highly recommended!'
  })
  .select()
  .single();
```

#### Get Space Reviews

```typescript
const { data, error } = await supabase
  .from('booking_reviews')
  .select(`
    *,
    profiles:author_id (first_name, last_name, profile_photo_url),
    bookings!inner (space_id)
  `)
  .eq('bookings.space_id', spaceId)
  .eq('is_visible', true)
  .order('created_at', { ascending: false });
```

---

### Favorites

#### Add to Favorites

```typescript
const { data, error } = await supabase
  .from('favorites')
  .insert({
    user_id: user.id,
    space_id: spaceId
  })
  .select()
  .single();
```

#### Remove from Favorites

```typescript
const { error } = await supabase
  .from('favorites')
  .delete()
  .eq('user_id', user.id)
  .eq('space_id', spaceId);
```

#### Get User Favorites

```typescript
const { data, error } = await supabase
  .from('favorites')
  .select(`
    *,
    spaces (
      id,
      title,
      city,
      price_per_hour,
      main_image_url
    )
  `)
  .eq('user_id', user.id);
```

---

## RPC Functions

### check_availability

Verifica disponibilità di uno spazio per una data e orario.

```typescript
const { data, error } = await supabase.rpc('check_availability', {
  p_space_id: spaceId,
  p_booking_date: '2025-02-01',
  p_start_time: '09:00',
  p_end_time: '17:00'
});

// Returns: boolean
```

### is_admin

Verifica se l'utente corrente è admin.

```typescript
const { data, error } = await supabase.rpc('is_admin', {
  user_id: user.id
});

// Returns: boolean
```

### check_profile_access

Verifica permessi di accesso a un profilo (GDPR).

```typescript
const { data, error } = await supabase.rpc('check_profile_access', {
  accessor_id: user.id,
  profile_id: targetUserId
});

// Returns: { has_access: boolean, reason: string }
```

### calculate_booking_price

Calcola prezzo totale di un booking.

```typescript
const { data, error } = await supabase.rpc('calculate_booking_price', {
  p_space_id: spaceId,
  p_start_time: '09:00',
  p_end_time: '17:00'
});

// Returns: { total: number, hours: number, hourly_rate: number }
```

---

## Edge Functions

### stripe-webhook

Gestisce webhook di Stripe per confermare pagamenti.

**Endpoint**: `https://[project-ref].supabase.co/functions/v1/stripe-webhook`

**Method**: POST

**Headers**:
```json
{
  "stripe-signature": "..."
}
```

**Handles**:
- `checkout.session.completed` - Conferma booking
- `payment_intent.succeeded` - Registra pagamento
- `charge.refunded` - Gestisce rimborsi

---

### booking-confirm

Conferma automaticamente bookings dopo pagamento.

**Endpoint**: `https://[project-ref].supabase.co/functions/v1/booking-confirm`

**Method**: POST

**Body**:
```json
{
  "bookingId": "uuid",
  "paymentSessionId": "cs_..."
}
```

**Response**:
```json
{
  "success": true,
  "booking": { ... }
}
```

---

### notification-send

Invia notifiche email/push.

**Endpoint**: `https://[project-ref].supabase.co/functions/v1/notification-send`

**Method**: POST

**Body**:
```json
{
  "type": "booking_confirmed",
  "userId": "uuid",
  "data": {
    "bookingId": "uuid",
    "spaceName": "Modern Office"
  }
}
```

---

### image-optimize

Ottimizza immagini caricate.

**Endpoint**: `https://[project-ref].supabase.co/functions/v1/image-optimize`

**Method**: POST

**Body**:
```json
{
  "imageUrl": "https://...",
  "spaceId": "uuid",
  "quality": 80
}
```

**Response**:
```json
{
  "optimizedUrl": "https://...",
  "originalSize": 2048000,
  "optimizedSize": 512000,
  "compressionRatio": 0.75
}
```

---

## Real-time Subscriptions

### Subscribe to Messages

```typescript
const channel = supabase
  .channel('messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      console.log('New message:', payload.new);
      // Update UI with new message
    }
  )
  .subscribe();

// Cleanup
channel.unsubscribe();
```

### Subscribe to Booking Updates

```typescript
const channel = supabase
  .channel('bookings')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'bookings',
      filter: `user_id=eq.${user.id}`
    },
    (payload) => {
      console.log('Booking updated:', payload.new);
      // Refresh booking data
    }
  )
  .subscribe();
```

---

## Storage API

### Upload Space Image

```typescript
const { data, error } = await supabase.storage
  .from('spaces')
  .upload(`${spaceId}/${Date.now()}-${file.name}`, file, {
    cacheControl: '3600',
    upsert: false
  });

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('spaces')
  .getPublicUrl(data.path);
```

### Upload Profile Photo

```typescript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${user.id}/avatar.jpg`, file, {
    cacheControl: '3600',
    upsert: true
  });
```

### Delete Image

```typescript
const { error } = await supabase.storage
  .from('spaces')
  .remove([imagePath]);
```

---

## Error Handling

### Standard Error Response

```typescript
{
  error: {
    message: string,
    code: string,
    details: string,
    hint: string
  }
}
```

### Common Error Codes

- `PGRST116` - RLS policy violation
- `23505` - Unique constraint violation
- `23503` - Foreign key constraint violation
- `42501` - Insufficient privileges
- `P0001` - Custom exception raised

### Error Handling Pattern

```typescript
try {
  const { data, error } = await supabase
    .from('table')
    .select('*');
  
  if (error) throw error;
  
  return data;
} catch (error) {
  console.error('Database error:', error);
  
  if (error.code === 'PGRST116') {
    // Handle RLS policy violation
  } else if (error.code === '23505') {
    // Handle duplicate entry
  } else {
    // Generic error handling
  }
  
  throw error;
}
```

---

## Rate Limiting

### Limits

- **Auth requests**: 60/minute per IP
- **Database queries**: 1000/minute per user
- **Edge functions**: 100/minute per user
- **Storage uploads**: 50/hour per user

### Headers

Response includes rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## Best Practices

### 1. Always Check Errors

```typescript
const { data, error } = await supabase...;
if (error) {
  console.error(error);
  // Handle error
}
```

### 2. Use Select() for Specific Fields

```typescript
// ✅ Good
.select('id, title, price')

// ❌ Bad (fetches everything)
.select('*')
```

### 3. Batch Related Queries

```typescript
// ✅ Good - Single query with join
.select(`
  *,
  profiles(name),
  bookings(count)
`)

// ❌ Bad - Multiple queries
const space = await supabase.from('spaces')...;
const profile = await supabase.from('profiles')...;
const bookings = await supabase.from('bookings')...;
```

### 4. Use Pagination

```typescript
const { data, error } = await supabase
  .from('spaces')
  .select('*')
  .range(0, 9) // First 10 items
  .order('created_at', { ascending: false });
```

### 5. Cleanup Subscriptions

```typescript
useEffect(() => {
  const channel = supabase.channel('...')...;
  
  return () => {
    channel.unsubscribe();
  };
}, []);
```

---

**Last Updated**: 2025-01-XX  
**API Version**: 2.0
