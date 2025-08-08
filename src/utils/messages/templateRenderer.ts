
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { BookingWithDetails } from "@/types/booking";

type HostProfile = {
  first_name?: string;
  last_name?: string;
};

const MAX_LENGTH = 1000;
const ALLOWED_VARIABLES = [
  "space_title",
  "guest_first_name",
  "guest_last_name",
  "booking_date",
  "start_time",
  "end_time",
  "host_first_name",
  "host_last_name",
] as const;

type VariableKey = (typeof ALLOWED_VARIABLES)[number];

export function renderTemplate(
  template: string,
  booking: BookingWithDetails,
  host?: HostProfile
): string {
  if (!template) return "";

  // Sostituzioni sicure
  const map: Record<VariableKey, string> = {
    space_title: booking.space?.title || "",
    guest_first_name: booking.coworker?.first_name || "",
    guest_last_name: booking.coworker?.last_name || "",
    booking_date: booking.booking_date
      ? format(new Date(booking.booking_date), "dd/MM/yyyy", { locale: it })
      : "",
    start_time: booking.start_time || "",
    end_time: booking.end_time || "",
    host_first_name: host?.first_name || "",
    host_last_name: host?.last_name || "",
  };

  // Consenti solo variabili whitelistate
  let output = template.replace(/{{\s*([a-zA-Z_]+)\s*}}/g, (_, key: string) => {
    const k = key as VariableKey;
    if (ALLOWED_VARIABLES.includes(k)) {
      return map[k] ?? "";
    }
    // Se variabile non consentita, la rimuoviamo per semplicità
    return "";
  });

  // Limite lunghezza per mantenere messaggi concisi
  if (output.length > MAX_LENGTH) {
    output = output.slice(0, MAX_LENGTH - 3) + "...";
  }

  // No HTML: forziamo plain text semplice rimuovendo eventuali tag
  output = output.replace(/<[^>]+>/g, "");

  return output;
}

export function listAllowedVariables(): string[] {
  return ALLOWED_VARIABLES.map((v) => `{{${v}}}`);
}

