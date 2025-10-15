import { useState } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Info } from "lucide-react";
import { useCoworkerReceipts, useCoworkerInvoices } from "@/hooks/queries/useCoworkerDocuments";
import ReceiptCard from "@/components/coworker/documents/ReceiptCard";
import InvoiceCard from "@/components/coworker/documents/InvoiceCard";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MyDocumentsPage = () => {
  const { authState } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activeTab, setActiveTab] = useState<"receipts" | "invoices">("receipts");

  const { data: receipts = [], isLoading: isLoadingReceipts } = useCoworkerReceipts(
    authState.user?.id || "",
    selectedYear
  );

  const { data: invoices = [], isLoading: isLoadingInvoices } = useCoworkerInvoices(
    authState.user?.id || "",
    selectedYear
  );

  const handleExportCSV = () => {
    const allDocs = [
      ...receipts.map((r: any) => ({
        data: r.receipt_date,
        tipo: "Ricevuta Non Fiscale",
        numero: r.receipt_number,
        emittente: r.host ? `${r.host.first_name} ${r.host.last_name}` : "N/A",
        imponibile: r.canone_amount || 0,
        iva: 0,
        totale: r.total_amount,
        detraibile: "No",
      })),
      ...invoices.map((i: any) => ({
        data: i.invoice_date,
        tipo: "Fattura Elettronica",
        numero: i.invoice_number,
        emittente: i.booking?.space?.host?.business_name ||
          (i.booking?.space?.host ? `${i.booking.space.host.first_name} ${i.booking.space.host.last_name}` : "N/A"),
        imponibile: i.base_amount,
        iva: i.vat_amount,
        totale: i.total_amount,
        detraibile: "Sì",
      })),
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    const headers = ["Data", "Tipo", "Numero", "Emittente", "Imponibile", "IVA", "Totale", "Detraibile"];
    const rows = allDocs.map((doc) => [
      doc.data,
      doc.tipo,
      doc.numero,
      doc.emittente,
      `€${doc.imponibile.toFixed(2)}`,
      `€${doc.iva.toFixed(2)}`,
      `€${doc.totale.toFixed(2)}`,
      doc.detraibile,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `documenti_fiscali_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">I Miei Documenti</h1>
          <p className="text-muted-foreground">
            Ricevute e fatture delle tue prenotazioni
          </p>
        </div>

        <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(Number(val))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleziona anno" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Documenti Fiscali</AlertTitle>
        <AlertDescription>
          Le ricevute non fiscali hanno valore probatorio ma non fiscale.
          Le fatture elettroniche sono documenti fiscali detraibili/deducibili.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "receipts" | "invoices")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receipts">
            Ricevute Non Fiscali
            {receipts.length > 0 && (
              <Badge className="ml-2" variant="secondary">{receipts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Fatture Elettroniche
            {invoices.length > 0 && (
              <Badge className="ml-2" variant="secondary">{invoices.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="space-y-4">
          {isLoadingReceipts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna ricevuta trovata per l'anno {selectedYear}
            </div>
          ) : (
            receipts.map((receipt: any) => (
              <ReceiptCard key={receipt.id} receipt={receipt} />
            ))
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          {isLoadingInvoices ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna fattura trovata per l'anno {selectedYear}
            </div>
          ) : (
            invoices.map((invoice: any) => (
              <InvoiceCard key={invoice.id} invoice={invoice} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {(receipts.length > 0 || invoices.length > 0) && (
        <div className="flex justify-end">
          <Button onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Esporta CSV per Commercialista
          </Button>
        </div>
      )}
    </div>
  );
};

export default MyDocumentsPage;
