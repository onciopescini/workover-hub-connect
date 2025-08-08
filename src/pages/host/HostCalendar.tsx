
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { AdvancedCalendarView, ConflictManagementSystem } from "@/components/spaces/calendar";
import type { AvailabilityData, DaySchedule, TimeSlot, WeeklySchedule } from "@/types/availability";
import { fetchSpaceBookings, invalidateAvailabilityCache } from "@/lib/availability-utils";

// Robust normalization to enforce AvailabilityData shape
const normalizeAvailabilityData = (data: any): AvailabilityData => {
  const normalizeDaySchedule = (dayData: any): DaySchedule => ({
    enabled: Boolean(dayData?.enabled ?? false),
    slots: Array.isArray(dayData?.slots)
      ? dayData.slots.map((slot: any): TimeSlot => ({
          start: String(slot?.start ?? "09:00"),
          end: String(slot?.end ?? "17:00"),
        }))
      : [],
  });

  const normalizeWeeklySchedule = (recurring: any): WeeklySchedule => ({
    monday: normalizeDaySchedule(recurring?.monday),
    tuesday: normalizeDaySchedule(recurring?.tuesday),
    wednesday: normalizeDaySchedule(recurring?.wednesday),
    thursday: normalizeDaySchedule(recurring?.thursday),
    friday: normalizeDaySchedule(recurring?.friday),
    saturday: normalizeDaySchedule(recurring?.saturday),
    sunday: normalizeDaySchedule(recurring?.sunday),
  });

  return {
    recurring: normalizeWeeklySchedule(data?.recurring || {}),
    exceptions: Array.isArray(data?.exceptions)
      ? data.exceptions.map((exception: any) => ({
          date: String(exception?.date ?? ""),
          enabled: Boolean(exception?.enabled ?? false),
          slots: Array.isArray(exception?.slots)
            ? exception.slots.map((slot: any): TimeSlot => ({
                start: String(slot?.start ?? "09:00"),
                end: String(slot?.end ?? "17:00"),
              }))
            : undefined,
        }))
      : [],
  };
};

interface HostSpace {
  id: string;
  title: string;
  availability?: AvailabilityData | null;
}

const HostCalendar: React.FC = () => {
  const { authState } = useAuth();
  const [spaces, setSpaces] = useState<HostSpace[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(false);

  const userId = authState.user?.id;

  const dateRange = useMemo(() => {
    const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    return { start, end };
  }, [currentMonth]);

  const loadSpaces = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("spaces")
      .select("id,title,availability")
      .eq("host_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Errore caricamento spazi", error);
      return;
    }
    const list = (data || []) as HostSpace[];
    setSpaces(list);
    if (!selectedSpaceId && list.length > 0) {
      setSelectedSpaceId(list[0]?.id ?? null);
    }
  }, [userId, selectedSpaceId]);

  const loadAvailability = useCallback(async () => {
    if (!selectedSpaceId) return;
    const { data, error } = await supabase
      .from("spaces")
      .select("availability")
      .eq("id", selectedSpaceId)
      .maybeSingle();

    if (error) {
      console.error("Errore caricamento disponibilità", error);
      return;
    }
    setAvailability(normalizeAvailabilityData(data?.availability || {}));
  }, [selectedSpaceId]);

  const loadBookings = useCallback(async () => {
    if (!selectedSpaceId) return;
    setLoading(true);
    try {
      const rows = (await fetchSpaceBookings(selectedSpaceId, dateRange.start, dateRange.end, true, true)) as any[];
      setBookings(rows || []);
    } catch (e) {
      console.error("Errore caricamento prenotazioni", e);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSpaceId, dateRange.start, dateRange.end]);

  useEffect(() => {
    loadSpaces();
  }, [loadSpaces]);

  useEffect(() => {
    loadAvailability();
    loadBookings();
  }, [selectedSpaceId, loadAvailability, loadBookings]);

  // Realtime updates for bookings of the selected space
  useEffect(() => {
    if (!selectedSpaceId) return;
    const channel = supabase
      .channel(`space-${selectedSpaceId}-bookings-page`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `space_id=eq.${selectedSpaceId}` },
        () => {
          invalidateAvailabilityCache(selectedSpaceId);
          loadBookings();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSpaceId, loadBookings]);

  const handleAvailabilityChange = async (next: AvailabilityData) => {
    if (!selectedSpaceId) return;
    const normalized = normalizeAvailabilityData(next);
    setAvailability(normalized);
    const { error } = await supabase
      .from("spaces")
      .update({ availability: normalized as any })
      .eq("id", selectedSpaceId);
    if (error) {
      console.error("Errore salvataggio disponibilità", error);
    }
  };

  const navigateMonth = (dir: 'prev' | 'next' | 'today') => {
    if (dir === 'today') setCurrentMonth(new Date());
    else if (dir === 'prev') setCurrentMonth(prev => subMonths(prev, 1));
    else setCurrentMonth(prev => addMonths(prev, 1));
  };

  return (
    <AppLayout title="Calendario Host" subtitle="Gestisci prenotazioni e disponibilità dei tuoi spazi">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header controls */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigateMonth('today')}>Oggi</Button>

                <Select
                  value={selectedSpaceId ?? ""}
                  onValueChange={(val) => setSelectedSpaceId(val)}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Seleziona spazio" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="" disabled>Seleziona spazio</SelectItem>
                    {spaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {!selectedSpaceId ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nessuno spazio disponibile. Crea uno spazio per usare il calendario.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Conflicts */}
            {availability && (
              <ConflictManagementSystem
                availability={availability}
                bookings={bookings}
                onConflictResolved={() => {
                  // After resolving, refresh bookings
                  loadBookings();
                }}
              />
            )}

            {/* Calendar */}
            {availability && (
              <AdvancedCalendarView
                availability={availability}
                onAvailabilityChange={handleAvailabilityChange}
                spaceId={selectedSpaceId}
                bookings={bookings}
              />
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default HostCalendar;
