import type { AdminBooking } from "@/types/admin";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const getNumber = (value: unknown): number =>
  typeof value === "number" ? value : 0;

export const mapAdminBookingRecord = (record: unknown): AdminBooking | null => {
  if (!isRecord(record)) {
    return null;
  }

  const spaceName =
    typeof record['space_name'] === "string"
      ? record['space_name']
      : typeof record['workspace_name'] === "string"
      ? record['workspace_name']
      : "";

  return {
    booking_id: getString(record['booking_id']),
    created_at: getString(record['created_at']),
    check_in_date: getString(record['check_in_date']),
    check_out_date: getString(record['check_out_date']),
    status: getString(record['status']) as AdminBooking["status"],
    total_price: getNumber(record['total_price']),
    coworker_name: getString(record['coworker_name']),
    coworker_email: getString(record['coworker_email']),
    coworker_avatar_url:
      typeof record['coworker_avatar_url'] === "string"
        ? record['coworker_avatar_url']
        : null,
    space_name: spaceName,
    host_name: getString(record['host_name']),
    host_email: getString(record['host_email'])
  };
};
