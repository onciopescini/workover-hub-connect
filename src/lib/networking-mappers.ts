import type { ConnectionSuggestion } from "@/types/networking";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (value: unknown): string =>
  typeof value === "string" ? value : "";

export const mapConnectionSuggestion = (record: unknown): ConnectionSuggestion | null => {
  if (!isRecord(record)) {
    return null;
  }

  const spaceName =
    typeof record.space_name === "string"
      ? record.space_name
      : typeof record.workspace_name === "string"
      ? record.workspace_name
      : "";

  return {
    id: typeof record.id === "string" ? record.id : undefined,
    user_id: getString(record.user_id),
    first_name: getString(record.first_name),
    last_name: getString(record.last_name),
    avatar_url: typeof record.avatar_url === "string" ? record.avatar_url : null,
    space_name: spaceName,
    booking_date: getString(record.booking_date),
    suggested_user: isRecord(record.suggested_user)
      ? {
          id: getString(record.suggested_user.id),
          first_name: getString(record.suggested_user.first_name),
          last_name: getString(record.suggested_user.last_name),
          bio: typeof record.suggested_user.bio === "string" ? record.suggested_user.bio : null,
          avatar_url:
            typeof record.suggested_user.avatar_url === "string"
              ? record.suggested_user.avatar_url
              : null
        }
      : undefined
  };
};
