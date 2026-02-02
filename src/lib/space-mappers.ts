import type { Database } from "@/integrations/supabase/types";
import type { Space, SpaceInsert, SpaceUpdate } from "@/types/space";

type SpaceRow = Database["public"]["Tables"]["spaces"]["Row"];
type SpaceInsertPayload = Database["public"]["Tables"]["spaces"]["Insert"];
type SpaceUpdatePayload = Database["public"]["Tables"]["spaces"]["Update"];

// Partial space row - accepts any subset of SpaceRow fields
type PartialSpaceRow = Partial<SpaceRow> & {
  id: string;
  features?: string[] | null;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const getSpaceFeatures = (row: PartialSpaceRow): string[] => {
  if (isStringArray(row.features)) {
    return row.features;
  }
  return row.workspace_features ?? [];
};

export const resolveSpaceFeatures = (record: Record<string, unknown>): string[] => {
  const row = record as PartialSpaceRow;
  return getSpaceFeatures(row);
};

/**
 * Maps a raw SpaceRow from the database to a typed Space object.
 * Accepts partial data to support different select queries.
 */
export const mapSpaceRowToSpace = (row: PartialSpaceRow): Space => {
  return {
    id: row.id,
    host_id: row.host_id ?? '',
    title: row.title ?? '',
    description: row.description ?? '',
    address: row.address ?? '',
    price_per_hour: row.price_per_hour ?? 0,
    price_per_day: row.price_per_day ?? 0,
    max_capacity: row.max_capacity ?? 0,
    category: row.category ?? 'professional',
    work_environment: row.work_environment ?? 'controlled',
    confirmation_type: row.confirmation_type ?? 'instant',
    amenities: row.amenities ?? [],
    photos: row.photos ?? [],
    published: row.published ?? false,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
    seating_types: row.seating_types ?? [],
    workspace_features: row.workspace_features ?? [],
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    capacity: row.capacity ?? null,
    pending_approval: row.pending_approval ?? null,
    availability: row.availability ?? null,
    timezone: row.timezone ?? undefined,
    country_code: row.country_code ?? null,
    city_name: row.city_name ?? null,
    cached_avg_rating: row.cached_avg_rating ?? null,
    cached_review_count: row.cached_review_count ?? null,
    ideal_guest_tags: row.ideal_guest_tags ?? [],
    event_friendly_tags: row.event_friendly_tags ?? [],
    cancellation_policy: row.cancellation_policy ?? null,
    rules: row.rules ?? null,
    is_suspended: row.is_suspended ?? null,
    suspension_reason: row.suspension_reason ?? null,
    suspended_at: row.suspended_at ?? null,
    suspended_by: row.suspended_by ?? null,
    deleted_at: row.deleted_at ?? null,
    approved_at: row.approved_at ?? null,
    approved_by: row.approved_by ?? null,
    rejection_reason: row.rejection_reason ?? null,
    revision_notes: row.revision_notes ?? null,
    revision_requested: row.revision_requested ?? null,
    approximate_location: row.approximate_location ?? null,
    features: getSpaceFeatures(row),
    name: row.title ?? '',
    city: row.city_name ?? undefined,
  } as Space;
};

export const toSpaceInsertPayload = (space: SpaceInsert): SpaceInsertPayload => ({
  ...space,
  workspace_features: space.features ?? [],
});

export const toSpaceUpdatePayload = (space: SpaceUpdate): SpaceUpdatePayload => ({
  ...space,
  workspace_features: space.features ?? [],
});
