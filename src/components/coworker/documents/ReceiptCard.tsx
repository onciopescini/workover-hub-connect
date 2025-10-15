import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { downloadDocumentFromStorage } from "@/utils/documentDownload";
import { toast } from "sonner";

interface ReceiptCardProps {
  receipt: {
    id: string;
    receipt_number: string;
    receipt_date: string;
    total_amount: number;
    canone_amount: number;
    discount_amount: number | null;
    pdf_url: string | null;
    booking?: {
      booking_date: string;
      space?: {
        title: string;
      };
    };
    host?: {
      first_name: string;
      last_name: string;
    };
  };
}

const ReceiptCard = ({ receipt }: ReceiptCardProps) => {
  const handleDownloadPDF = async () => {
    if (!receipt.pdf_url) {
      toast.error("PDF non disponibile");
      return;
    }

    try {
      await downloadDocumentFromStorage(
        receipt.pdf_url,
        `ricevuta_${receipt.receipt_number}.pdf`
      );
      toast.success("PDF scaricato con successo");
    } catch (error: any) {
      toast.error(error.message || "Errore durante il download");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Ricevuta #{receipt.receipt_number}</CardTitle>
            <CardDescription>
              {receipt.booking?.space?.title || "Spazio"} - {format(parseISO(receipt.receipt_date), "dd MMMM yyyy", { locale: it })}
            </CardDescription>
          </div>
          <Badge variant="secondary">Ricevuta Non Fiscale</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {receipt.host && (
            <div>
              <Label>Emittente (Host Privato)</Label>
              <p>{receipt.host.first_name} {receipt.host.last_name}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Canone</Label>
              <p className="text-lg font-semibold">€{receipt.canone_amount?.toFixed(2) || "0.00"}</p>
            </div>
            {receipt.discount_amount && receipt.discount_amount > 0 && (
              <div>
                <Label>Sconto</Label>
                <p className="text-sm text-green-600">-€{receipt.discount_amount.toFixed(2)}</p>
              </div>
            )}
          </div>

          <div>
            <Label>Totale Pagato</Label>
            <p className="text-2xl font-bold">€{receipt.total_amount.toFixed(2)}</p>
          </div>

          <Alert variant="default">
            <AlertDescription className="text-xs">
              Questa ricevuta NON è valida ai fini fiscali (IVA/detrazioni).
              Ha valore esclusivamente probatorio della transazione.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleDownloadPDF}
          disabled={!receipt.pdf_url}
        >
          <Download className="mr-2 h-4 w-4" />
          Scarica PDF
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ReceiptCard;
