type BookingSpace = {
  title?: string | null;
  name?: string | null;
};

type BookingCoworker = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toBookingSpace = (value: unknown): BookingSpace | null => {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value['title'] === "string" ? value['title'] : null;
  const name = typeof value['name'] === "string" ? value['name'] : null;

  if (!title && !name) {
    return null;
  }

  return { title, name };
};

export const resolveBookingSpace = (booking: Record<string, unknown>): BookingSpace | null => {
  const relation = booking['space'] ?? booking['spaces'] ?? booking['workspaces'];
  if (Array.isArray(relation)) {
    return toBookingSpace(relation[0]);
  }

  return toBookingSpace(relation);
};

export const resolveBookingCoworker = (booking: Record<string, unknown>): BookingCoworker | null => {
  const coworkerRelation = booking['coworker'];
  if (Array.isArray(coworkerRelation)) {
    return isRecord(coworkerRelation[0]) ? (coworkerRelation[0] as BookingCoworker) : null;
  }

  return isRecord(coworkerRelation) ? (coworkerRelation as BookingCoworker) : null;
};
