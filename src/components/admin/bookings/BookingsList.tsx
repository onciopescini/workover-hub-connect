import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Eye } from "lucide-react";
import { useAdminBookings } from "@/hooks/admin/useAdminBookings";
import { BookingDetailModal } from "./BookingDetailModal";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { BOOKING_STATUS_LABELS } from "@/types/booking";
import { exportBookingsToCSV } from "@/lib/admin/admin-booking-utils";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export function BookingsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  
  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paymentFilter]);

  const { bookings, totalCount, isLoading } = useAdminBookings({
    search, 
    statusFilter: statusFilter === "all" ? "" : statusFilter,
    paymentFilter: paymentFilter === "all" ? "" : paymentFilter,
    page,
    pageSize
  });

  const totalPages = Math.ceil((totalCount || 0) / pageSize);

  const handleExport = () => {
    if (!bookings) return;
    exportBookingsToCSV(bookings);
    toast.success("Export completato");
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      completed: "default",
      failed: "destructive",
      refunded: "default"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getBookingStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">N/A</Badge>;
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      pending_approval: "secondary",
      pending_payment: "secondary",
      confirmed: "default",
      cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>
      {BOOKING_STATUS_LABELS[status as keyof typeof BOOKING_STATUS_LABELS] || status}
    </Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Prenotazioni</CardTitle>
          <CardDescription>Gestisci tutte le prenotazioni della piattaforma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per utente, spazio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stato prenotazione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="confirmed">Confermata</SelectItem>
                <SelectItem value="cancelled">Cancellata</SelectItem>
                <SelectItem value="pending_approval">In approvazione</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stato pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i pagamenti</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="completed">Completato</SelectItem>
                <SelectItem value="failed">Fallito</SelectItem>
                <SelectItem value="refunded">Rimborsato</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Esporta CSV
            </Button>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Utente</TableHead>
                  <TableHead>Spazio</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : bookings?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nessuna prenotazione trovata
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings?.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        {format(new Date(booking.booking_date + 'T00:00:00'), "dd MMM yyyy", { locale: it })}
                      </TableCell>
                      <TableCell>
                        {booking.coworker?.first_name} {booking.coworker?.last_name}
                      </TableCell>
                      <TableCell>{booking.space?.title || 'N/A'}</TableCell>
                      <TableCell>{getBookingStatusBadge(booking.status)}</TableCell>
                      <TableCell>
                        {booking.payments?.[0] 
                          ? getPaymentStatusBadge(booking.payments[0].payment_status)
                          : <Badge variant="secondary">Nessun pagamento</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        €{booking.payments?.[0]?.amount?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBooking(booking.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(p => p - 1);
                  }}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" onClick={(e) => e.preventDefault()} isActive>
                  {page} di {Math.max(1, totalPages)}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) setPage(p => p + 1);
                  }}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>

      {selectedBooking && (
        <BookingDetailModal
          bookingId={selectedBooking}
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </>
  );
}
