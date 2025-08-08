
import type { BookingWithDetails } from "@/types/booking";

function toCsvValue(v: any) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportBookingsToCSV(bookings: BookingWithDetails[], fileName = "prenotazioni.csv") {
  const headers = [
    "ID",
    "Spazio",
    "Data",
    "Inizio",
    "Fine",
    "Stato",
    "Coworker Nome",
    "Coworker Cognome",
    "Creato il",
  ];
  const rows = bookings.map((b) => [
    b.id,
    b.space?.title || "",
    b.booking_date || "",
    b.start_time || "",
    b.end_time || "",
    b.status,
    b.coworker?.first_name || "",
    b.coworker?.last_name || "",
    b.created_at || "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(toCsvValue).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

