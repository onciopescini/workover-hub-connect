export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<TRecord> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: RealtimeEventType;
  new: TRecord | null;
  old: TRecord | null;
}
