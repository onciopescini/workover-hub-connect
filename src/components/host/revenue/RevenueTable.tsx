
import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payout {
  id: string;
  amount: number;
  date: string;
  booking_id: string;
  space_title: string;
}

interface RevenueTableProps {
  payouts: Payout[];
}

export const RevenueTable = ({ payouts }: RevenueTableProps) => {
  if (payouts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessun pagamento trovato per il periodo selezionato</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Spazio</TableHead>
            <TableHead>Importo</TableHead>
            <TableHead>ID Prenotazione</TableHead>
            <TableHead>Stato</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payouts.map((payout) => (
            <TableRow key={payout.id}>
              <TableCell className="font-medium">
                {new Date(payout.date).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </TableCell>
              <TableCell>
                <div className="max-w-[200px] truncate">
                  {payout.space_title}
                </div>
              </TableCell>
              <TableCell className="font-medium text-green-600">
                €{payout.amount.toFixed(2)}
              </TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">
                {payout.booking_id.slice(0, 8)}...
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Completato
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
