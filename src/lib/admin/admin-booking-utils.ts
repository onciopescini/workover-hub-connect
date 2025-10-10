import { format } from "date-fns";
import { it } from "date-fns/locale";

export function exportBookingsToCSV(bookings: any[]) {
  const headers = [
    'ID Prenotazione',
    'Data',
    'Orario Inizio',
    'Orario Fine',
    'Ospiti',
    'Stato',
    'Nome Utente',
    'Email Utente',
    'Spazio',
    'Importo Pagamento',
    'Stato Pagamento',
    'Data Creazione'
  ];

  const rows = bookings.map(booking => [
    booking.id,
    format(new Date(booking.booking_date), "dd/MM/yyyy", { locale: it }),
    booking.start_time || '',
    booking.end_time || '',
    booking.guests_count,
    booking.status,
    `${booking.coworker?.first_name || ''} ${booking.coworker?.last_name || ''}`,
    booking.coworker?.email || '',
    booking.space?.title || '',
    booking.payments?.[0]?.amount?.toFixed(2) || '0.00',
    booking.payments?.[0]?.payment_status || 'nessuno',
    format(new Date(booking.created_at), "dd/MM/yyyy HH:mm", { locale: it })
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `prenotazioni_${format(new Date(), "yyyy-MM-dd")}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
