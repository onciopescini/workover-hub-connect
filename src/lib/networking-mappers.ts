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
    typeof record['space_name'] === "string"
      ? record['space_name']
      : typeof record['workspace_name'] === "string"
      ? record['workspace_name']
      : "";

  const suggestedUser = isRecord(record['suggested_user']) ? record['suggested_user'] : null;

  return {
    id: typeof record['id'] === "string" ? record['id'] : '',
    user_id: getString(record['user_id']),
    first_name: getString(record['first_name']),
    last_name: getString(record['last_name']),
    avatar_url: typeof record['avatar_url'] === "string" ? record['avatar_url'] : null,
    space_name: spaceName,
    booking_date: getString(record['booking_date']),
    suggested_user: suggestedUser
      ? {
          id: getString(suggestedUser['id']),
          first_name: getString(suggestedUser['first_name']),
          last_name: getString(suggestedUser['last_name']),
          bio: typeof suggestedUser['bio'] === "string" ? suggestedUser['bio'] : null,
          avatar_url:
            typeof suggestedUser['avatar_url'] === "string"
              ? suggestedUser['avatar_url']
              : null
        }
      : undefined
  };
};
