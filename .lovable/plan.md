
# Messaging UX Finalization - Sidebar and Refactoring (Phase 3)

## Overview

This plan implements the final phase of the messaging overhaul: a collapsible Context Sidebar and type consolidation to eliminate technical debt.

---

## Current State Analysis

### Type Duplication Identified

| File | `Conversation` Type | Primary User |
|:-----|:--------------------|:-------------|
| `src/types/chat.ts` | Rich type with `booking`, `space`, `participants[]`, `archived_at` | `useChat.ts`, `ChatWindow.tsx`, `ConversationList.tsx`, `chatService.ts` |
| `src/types/messaging.ts` | Simpler type with `title`, `subtitle`, `avatar`, `status` | Only `src/lib/conversations.ts` |

The `src/types/chat.ts` version is more complete and aligned with the current architecture.

### Profile Fields Available for Networking Context

The `profiles` table contains rich user data for the sidebar:
- `bio` - User biography
- `skills` - Comma-separated skills
- `interests` - User interests
- `job_title` - Professional title
- `location` - User location
- Social links (LinkedIn, Instagram, etc.)

---

## Implementation Plan

### Action 1: Create the `ChatDetailsPanel` Component

A new component that displays contextual information based on conversation type.

**File**: `src/components/chat/ChatDetailsPanel.tsx`

**Behavior**:
- Desktop: Toggleable panel on the right side of the chat (300px width)
- Mobile: Bottom sheet/drawer overlay using Vaul `Drawer` component

**Conditional Content**:

```text
+--------------------------------+
|  ChatDetailsPanel              |
+--------------------------------+
| IF booking_id exists:          |
|   - BookingContextCard         |
|   - "View Booking" button      |
|   - Space photo + link         |
+--------------------------------+
| ELSE (networking):             |
|   - User Avatar + Name         |
|   - Bio                        |
|   - Skills (as badges)         |
|   - "Where We Met" history     |
|   - "View Profile" button      |
+--------------------------------+
```

**Data Fetching**:
- User profile data: New query to fetch `profiles` by `otherUserId`
- Shared history: Reuse existing `NetworkingContextCard` logic

---

### Action 2: Update `ChatLayout.tsx` for Three-Panel Desktop Layout

**Current Structure**:
```
[Sidebar (w-80)] [Main Chat (flex-1)]
```

**New Structure**:
```
[Sidebar (w-80)] [Main Chat (flex-1)] [Details Panel (w-80, toggleable)]
```

**Changes**:
1. Accept new prop `detailsPanel: React.ReactNode`
2. Accept new prop `showDetails: boolean`
3. Add `onToggleDetails: () => void` callback
4. Desktop: Render details panel on the right when `showDetails` is true
5. Mobile: Details panel is handled separately via Drawer

---

### Action 3: Add Toggle Button to `ChatWindow.tsx` Header

**Location**: Right side of header, after Archive button

**Icon**: `Info` from lucide-react

**Behavior**: Calls `onToggleDetails()` callback to show/hide the sidebar

---

### Action 4: Update `MessagesPage.tsx` to Orchestrate Panel State

**Changes**:
1. Add state: `const [showDetailsPanel, setShowDetailsPanel] = useState(false)`
2. Pass `showDetails` and `onToggleDetails` to `ChatLayout`
3. Pass `onToggleDetails` to `ChatWindow`
4. Render `ChatDetailsPanel` as the third panel

---

### Action 5: Technical Debt Cleanup - Consolidate Types

**Strategy**: Keep `src/types/chat.ts` as the authoritative source. Migrate `src/lib/conversations.ts` to use these types.

**Files to Update**:

| File | Change |
|:-----|:-------|
| `src/types/chat.ts` | Add `MessageAttachment` interface (from messaging.ts) |
| `src/lib/conversations.ts` | Change import to `from '@/types/chat'` |
| `src/lib/conversations.ts` | Update return types to match `Conversation` from chat.ts |
| `src/types/messaging.ts` | **DELETE** after migration |

**Type Additions to `src/types/chat.ts`**:
```typescript
// From messaging.ts
export interface MessageAttachment {
  url: string;
  type: 'image' | 'file';
  name: string;
  size?: number;
}

// Extend Message with optional fields
export interface Message {
  // ... existing fields
  attachments?: MessageAttachment[];
  status?: 'pending' | 'sent' | 'error';
  tempId?: string;
}
```

---

## Technical Details

### New Component: `ChatDetailsPanel.tsx`

```typescript
interface ChatDetailsPanelProps {
  conversation: Conversation | undefined;
  currentUserId: string | undefined;
  onClose: () => void;
}
```

**Features**:
1. **For Booking Chats**:
   - Enhanced `BookingContextCard` with space photo
   - Link to `/bookings/{booking_id}`
   - Space link to `/spaces/{space_id}`

2. **For Networking Chats**:
   - Fetch other user's profile via query
   - Display bio, job title, skills as badges
   - Reuse `NetworkingContextCard` for shared history
   - Link to `/profile/{user_id}`

### Mobile Drawer Implementation

Using the existing `Drawer` component from Vaul:

```typescript
<Drawer open={isOpen} onOpenChange={onClose}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Dettagli</DrawerTitle>
    </DrawerHeader>
    {/* Panel content */}
  </DrawerContent>
</Drawer>
```

---

## File Changes Summary

| File | Action | Description |
|:-----|:-------|:------------|
| `src/components/chat/ChatDetailsPanel.tsx` | **CREATE** | New sidebar component with conditional content |
| `src/components/chat/ChatLayout.tsx` | **EDIT** | Add third panel slot for desktop, props for toggle state |
| `src/components/chat/ChatWindow.tsx` | **EDIT** | Add Info button to header, pass toggle callback |
| `src/pages/messages/MessagesPage.tsx` | **EDIT** | Add state management, pass panel to layout |
| `src/types/chat.ts` | **EDIT** | Add `MessageAttachment` and extend `Message` interface |
| `src/lib/conversations.ts` | **EDIT** | Change import from messaging.ts to chat.ts |
| `src/types/messaging.ts` | **DELETE** | Remove duplicate types file |

---

## Expected Result

After implementation:

1. **Desktop**: Users see a toggleable right sidebar with:
   - Booking details + View Booking button (for booking chats)
   - User profile + shared history (for networking chats)

2. **Mobile**: Tapping the Info icon opens a bottom drawer with the same content

3. **Type System**: Single authoritative `Conversation` type in `src/types/chat.ts`, no duplicate definitions

---

## Confirmation Checklist

| Item | Status |
|:-----|:-------|
| `Conversation` type duplication resolved | Will be confirmed |
| Sidebar renders booking data correctly | Will be confirmed |
| Sidebar renders networking profile data | Will be confirmed |
| Mobile drawer works correctly | Will be confirmed |
| Info toggle button in header | Will be confirmed |
