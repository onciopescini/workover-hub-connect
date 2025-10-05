# 🗄️ Database Schema Reference

Documentazione completa dello schema database PostgreSQL di WorkOver.

---

## 📚 Table of Contents

1. [Core Tables](#core-tables)
2. [Feature Tables](#feature-tables)
3. [Security & Compliance Tables](#security--compliance-tables)
4. [Admin Tables](#admin-tables)
5. [Relationships](#relationships)
6. [Indexes](#indexes)
7. [RLS Policies](#rls-policies)
8. [Functions & Triggers](#functions--triggers)

---

## Core Tables

### profiles
Profili utente (host, coworker, admin).

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT,
  role user_role NOT NULL,
  
  -- Contact Info
  phone VARCHAR,
  city VARCHAR,
  location TEXT,
  
  -- Professional Info
  profession VARCHAR,
  job_title TEXT,
  job_type TEXT,
  work_style TEXT,
  bio TEXT,
  skills TEXT,
  interests TEXT,
  competencies TEXT[],
  industries TEXT[],
  
  -- Collaboration
  collaboration_availability TEXT DEFAULT 'not_available',
  collaboration_types TEXT[] DEFAULT '{}',
  preferred_work_mode TEXT DEFAULT 'flessibile',
  collaboration_description TEXT,
  
  -- Social Links
  profile_photo_url TEXT,
  website TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  facebook_url TEXT,
  youtube_url TEXT,
  
  -- Stripe Integration
  stripe_account_id TEXT,
  stripe_connected BOOLEAN DEFAULT false,
  stripe_onboarding_status stripe_onboarding_state DEFAULT 'none',
  return_url TEXT,
  
  -- Tax Info
  tax_country TEXT,
  vat_number TEXT,
  tax_id TEXT,
  
  -- Status Flags
  networking_enabled BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  age_confirmed BOOLEAN DEFAULT false,
  is_suspended BOOLEAN DEFAULT false,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID,
  suspension_reason TEXT,
  space_creation_restricted BOOLEAN DEFAULT false,
  restriction_reason TEXT,
  data_retention_exempt BOOLEAN DEFAULT false,
  
  -- Audit
  admin_notes TEXT,
  last_login_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_profiles_role` ON `role`
- `idx_profiles_city` ON `city`
- `idx_profiles_suspended` ON `is_suspended`

**RLS Policies:**
- Users can view/edit their own profile
- Admins can view/edit all profiles
- Networking-enabled users can view other profiles (with privacy checks)

---

### spaces
Workspace listings.

```sql
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Basic Info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  space_type TEXT NOT NULL,
  
  -- Location
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT DEFAULT 'IT',
  latitude NUMERIC,
  longitude NUMERIC,
  
  -- Pricing
  price_per_hour NUMERIC NOT NULL,
  price_per_day NUMERIC,
  currency TEXT DEFAULT 'EUR',
  
  -- Capacity & Features
  capacity INTEGER NOT NULL DEFAULT 1,
  amenities TEXT[],
  
  -- Media
  main_image_url TEXT,
  additional_images TEXT[],
  
  -- Status
  status TEXT DEFAULT 'pending',
  is_published BOOLEAN DEFAULT false,
  publish_rejected_reason TEXT,
  
  -- Stats
  rating NUMERIC,
  total_bookings INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_spaces_host` ON `host_id`
- `idx_spaces_city` ON `city`
- `idx_spaces_status` ON `status`
- `idx_spaces_published` ON `is_published`
- `idx_spaces_location` ON `(latitude, longitude)` USING GIST

**RLS Policies:**
- Public can view published spaces
- Hosts can manage their own spaces
- Admins can manage all spaces

---

### bookings
Booking records.

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Booking Details
  booking_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  guests_count INTEGER DEFAULT 1,
  
  -- Status
  status booking_status DEFAULT 'pending',
  reservation_token UUID DEFAULT gen_random_uuid(),
  slot_reserved_until TIMESTAMPTZ,
  
  -- Payment
  payment_required BOOLEAN DEFAULT true,
  payment_session_id TEXT,
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancelled_by_host BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  cancellation_fee NUMERIC DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Constraints:**
- `CHECK (start_time < end_time)`
- `CHECK (guests_count > 0)`
- `CHECK (booking_date >= CURRENT_DATE)`

**Indexes:**
- `idx_bookings_space` ON `space_id`
- `idx_bookings_user` ON `user_id`
- `idx_bookings_date` ON `booking_date`
- `idx_bookings_status` ON `status`

**RLS Policies:**
- Users can view their own bookings
- Hosts can view bookings for their spaces
- Users can create/cancel their bookings
- Hosts can update booking status

---

### availability
Space availability schedules.

```sql
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id),
  
  -- Schedule
  day_of_week TEXT NOT NULL, -- 'monday', 'tuesday', ...
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Constraints:**
- `CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))`
- `CHECK (start_time < end_time)`

**Indexes:**
- `idx_availability_space` ON `space_id`
- `idx_availability_day` ON `day_of_week`

---

### payments
Payment transactions.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Amount
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Platform Fees
  platform_fee NUMERIC,
  host_amount NUMERIC,
  
  -- Stripe
  stripe_session_id TEXT,
  stripe_transfer_id TEXT,
  receipt_url TEXT,
  
  -- Status
  payment_status TEXT DEFAULT 'pending',
  method TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_payments_booking` ON `booking_id`
- `idx_payments_user` ON `user_id`
- `idx_payments_status` ON `payment_status`

---

## Feature Tables

### messages
Direct messaging between users.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Context
  booking_id UUID REFERENCES bookings(id),
  conversation_id UUID REFERENCES conversations(id),
  
  -- Content
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Constraints:**
- `CHECK (booking_id IS NOT NULL OR conversation_id IS NOT NULL)`

**Indexes:**
- `idx_messages_sender` ON `sender_id`
- `idx_messages_booking` ON `booking_id`
- `idx_messages_conversation` ON `conversation_id`

---

### conversations
Message conversations.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES profiles(id),
  coworker_id UUID NOT NULL REFERENCES profiles(id),
  space_id UUID REFERENCES spaces(id),
  booking_id UUID REFERENCES bookings(id),
  
  -- Status
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- `idx_conversations_host` ON `host_id`
- `idx_conversations_coworker` ON `coworker_id`

---

### booking_reviews
Reviews for bookings.

```sql
CREATE TABLE booking_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  author_id UUID NOT NULL REFERENCES profiles(id),
  target_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Review
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  
  -- Visibility
  is_visible BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Constraints:**
- `UNIQUE (booking_id, author_id)`

**Indexes:**
- `idx_reviews_booking` ON `booking_id`
- `idx_reviews_target` ON `target_id`

---

### favorites
Saved spaces.

```sql
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  space_id UUID NOT NULL REFERENCES spaces(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE (user_id, space_id)
);
```

---

### events
Networking events.

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id),
  space_id UUID NOT NULL REFERENCES spaces(id),
  
  -- Event Info
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  city TEXT,
  
  -- Capacity
  max_participants INTEGER DEFAULT 10,
  current_participants INTEGER DEFAULT 0,
  
  -- Media
  image_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'active',
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### connections
User networking connections.

```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Status
  status TEXT NOT NULL, -- 'pending', 'accepted', 'rejected'
  expires_at TIMESTAMPTZ DEFAULT (now() + '7 days'),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Security & Compliance Tables

### cookie_consent_log
GDPR cookie consent tracking.

```sql
CREATE TABLE cookie_consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  session_id TEXT,
  
  -- Consent
  necessary_consent BOOLEAN DEFAULT true,
  analytics_consent BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,
  preferences_consent BOOLEAN DEFAULT false,
  
  -- Details
  consent_version TEXT DEFAULT '1.0.0',
  consent_method TEXT DEFAULT 'banner',
  ip_address INET,
  user_agent TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  consent_given_at TIMESTAMPTZ DEFAULT now(),
  withdrawn_at TIMESTAMPTZ
);
```

---

### gdpr_requests
GDPR data export/deletion requests.

```sql
CREATE TABLE gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Request
  request_type TEXT NOT NULL, -- 'export', 'delete'
  status TEXT DEFAULT 'pending',
  processing_status TEXT DEFAULT 'pending',
  
  -- Export Data
  export_file_url TEXT,
  file_size BIGINT,
  download_token TEXT,
  expires_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  processed_by UUID REFERENCES profiles(id),
  
  -- Timestamps
  requested_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### data_access_logs
Track access to user data (GDPR Article 30).

```sql
CREATE TABLE data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  accessed_user_id UUID,
  
  -- Access Details
  access_type TEXT NOT NULL, -- 'read', 'write', 'delete'
  table_name TEXT NOT NULL,
  column_names TEXT[],
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### rate_limits
API rate limiting.

```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- user_id, ip_address
  action TEXT NOT NULL, -- 'login', 'api_call', etc.
  
  -- Tracking
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Admin Tables

### admin_actions_log
Track admin actions.

```sql
CREATE TABLE admin_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Action
  action_type TEXT NOT NULL, -- 'suspend_user', 'approve_space', etc.
  target_type TEXT NOT NULL, -- 'user', 'space', 'booking'
  target_id UUID NOT NULL,
  
  -- Details
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### reports
User reports.

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Target
  target_type TEXT NOT NULL, -- 'space', 'user', 'booking'
  target_id UUID NOT NULL,
  
  -- Report
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  
  -- Review
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Relationships

```
profiles
  ├── spaces (host_id)
  ├── bookings (user_id)
  ├── messages (sender_id)
  ├── favorites (user_id)
  ├── connections (sender_id, receiver_id)
  ├── events (created_by)
  └── reviews (author_id, target_id)

spaces
  ├── bookings (space_id)
  ├── availability (space_id)
  ├── favorites (space_id)
  ├── space_tags (space_id)
  └── events (space_id)

bookings
  ├── payments (booking_id)
  ├── messages (booking_id)
  └── booking_reviews (booking_id)
```

---

## Indexes

### Performance Indexes

```sql
-- Frequently queried relationships
CREATE INDEX idx_bookings_space_date ON bookings(space_id, booking_date);
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);

-- Search indexes
CREATE INDEX idx_spaces_city_published ON spaces(city, is_published);
CREATE INDEX idx_profiles_city_role ON profiles(city, role);

-- GIS indexes
CREATE INDEX idx_spaces_location ON spaces USING GIST (
  ll_to_earth(latitude, longitude)
);
```

---

## RLS Policies

### Common Patterns

#### 1. Own Data Only
```sql
CREATE POLICY "users_own_data"
  ON table_name
  FOR ALL
  USING (auth.uid() = user_id);
```

#### 2. Owner + Related Users
```sql
CREATE POLICY "bookings_access"
  ON bookings
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT host_id FROM spaces WHERE id = bookings.space_id
    )
  );
```

#### 3. Public Read
```sql
CREATE POLICY "public_read"
  ON spaces
  FOR SELECT
  USING (is_published = true);
```

#### 4. Admin Access
```sql
CREATE POLICY "admin_access"
  ON table_name
  FOR ALL
  USING (is_admin(auth.uid()));
```

---

## Functions & Triggers

### Timestamp Triggers

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Booking Conflict Prevention

```sql
CREATE OR REPLACE FUNCTION check_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE space_id = NEW.space_id
    AND booking_date = NEW.booking_date
    AND status IN ('confirmed', 'pending')
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    AND (
      (start_time, end_time) OVERLAPS (NEW.start_time, NEW.end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Booking conflict detected';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Rating Calculation

```sql
CREATE OR REPLACE FUNCTION update_space_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE spaces
  SET rating = (
    SELECT AVG(rating)
    FROM booking_reviews
    WHERE booking_id IN (
      SELECT id FROM bookings WHERE space_id = (
        SELECT space_id FROM bookings WHERE id = NEW.booking_id
      )
    )
  )
  WHERE id = (SELECT space_id FROM bookings WHERE id = NEW.booking_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Data Types

### Custom ENUMs

```sql
CREATE TYPE user_role AS ENUM ('coworker', 'host', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE stripe_onboarding_state AS ENUM ('none', 'started', 'completed');
CREATE TYPE message_template_type AS ENUM ('confirmation', 'reminder', 'cancellation', 'custom');
```

---

## Best Practices

### 1. Always Enable RLS
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### 2. Use UUIDs for Primary Keys
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

### 3. Add Timestamps
```sql
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now()
```

### 4. Add Constraints
```sql
CHECK (rating >= 1 AND rating <= 5),
CHECK (start_time < end_time)
```

### 5. Create Appropriate Indexes
```sql
CREATE INDEX idx_name ON table(column);
```

---

**Last Updated**: 2025-01-XX  
**Schema Version**: 2.0
