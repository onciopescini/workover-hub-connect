import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Download, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { downloadDocumentFromStorage } from "@/utils/documentDownload";
import { toast } from "sonner";

interface InvoiceCardProps {
  invoice: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    total_amount: number;
    base_amount: number;
    vat_amount: number;
    vat_rate: number;
    pdf_file_url: string | null;
    xml_file_url: string | null;
    xml_delivery_status: string | null;
    booking?: {
      booking_date: string;
      space?: {
        title: string;
        host?: {
          first_name: string;
          last_name: string;
          business_name?: string;
          vat_number?: string;
        };
      };
    };
  };
}

const InvoiceCard = ({ invoice }: InvoiceCardProps) => {
  const handleDownloadPDF = async () => {
    if (!invoice.pdf_file_url) {
      toast.error("PDF non disponibile");
      return;
    }

    try {
      await downloadDocumentFromStorage(
        invoice.pdf_file_url,
        `fattura_${invoice.invoice_number}.pdf`
      );
      toast.success("PDF scaricato con successo");
    } catch (error: any) {
      toast.error(error.message || "Errore durante il download");
    }
  };

  const handleDownloadXML = async () => {
    if (!invoice.xml_file_url) {
      toast.error("XML non disponibile");
      return;
    }

    try {
      await downloadDocumentFromStorage(
        invoice.xml_file_url,
        `fattura_${invoice.invoice_number}.xml`
      );
      toast.success("XML scaricato con successo");
    } catch (error: any) {
      toast.error(error.message || "Errore durante il download");
    }
  };

  const host = invoice.booking?.space?.host;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Fattura #{invoice.invoice_number}</CardTitle>
            <CardDescription>
              {invoice.booking?.space?.title || "Spazio"} - {format(parseISO(invoice.invoice_date), "dd MMMM yyyy", { locale: it })}
            </CardDescription>
          </div>
          <Badge className="bg-green-600">Fattura Elettronica</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {host && (
            <div>
              <Label>Emittente (Host P.IVA)</Label>
              <p>{host.business_name || `${host.first_name} ${host.last_name}`}</p>
              {host.vat_number && (
                <p className="text-sm text-muted-foreground">P.IVA: {host.vat_number}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Imponibile</Label>
              <p>€{invoice.base_amount.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <Label>IVA ({invoice.vat_rate}%)</Label>
              <p>€{invoice.vat_amount.toFixed(2)}</p>
            </div>
            <Separator />
            <div className="flex justify-between">
              <Label className="text-lg">Totale</Label>
              <p className="text-2xl font-bold">€{invoice.total_amount.toFixed(2)}</p>
            </div>
          </div>

          {invoice.xml_delivery_status && (
            <Alert variant={invoice.xml_delivery_status === "delivered" ? "default" : "default"}>
              <AlertDescription className="text-xs">
                Stato SDI: {invoice.xml_delivery_status === "delivered" ? "✅ Consegnata" : "⏳ In elaborazione"}
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Documento valido per detrazioni/deduzioni fiscali.
              Conserva questa fattura per dichiarazione dei redditi.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        {invoice.pdf_file_url && (
          <Button variant="outline" className="flex-1" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        )}
        {invoice.xml_file_url && (
          <Button variant="outline" className="flex-1" onClick={handleDownloadXML}>
            <Download className="mr-2 h-4 w-4" />
            XML
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default InvoiceCard;
