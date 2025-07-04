import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Upload, AlertCircle, CheckCircle, Euro } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";

const EU_COUNTRIES = [
  { code: "IT", name: "Italia" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Germania" },
  { code: "ES", name: "Spagna" },
  { code: "NL", name: "Paesi Bassi" },
  { code: "BE", name: "Belgio" },
  { code: "AT", name: "Austria" },
  { code: "PT", name: "Portogallo" },
  { code: "IE", name: "Irlanda" },
  { code: "LU", name: "Lussemburgo" },
  { code: "FI", name: "Finlandia" },
  { code: "GR", name: "Grecia" },
  { code: "CY", name: "Cipro" },
  { code: "EE", name: "Estonia" },
  { code: "LV", name: "Lettonia" },
  { code: "LT", name: "Lituania" },
  { code: "MT", name: "Malta" },
  { code: "SK", name: "Slovacchia" },
  { code: "SI", name: "Slovenia" },
  { code: "HR", name: "Croazia" },
  { code: "BG", name: "Bulgaria" },
  { code: "RO", name: "Romania" },
  { code: "PL", name: "Polonia" },
  { code: "CZ", name: "Repubblica Ceca" },
  { code: "HU", name: "Ungheria" },
  { code: "DK", name: "Danimarca" },
  { code: "SE", name: "Svezia" }
];

export const TaxInformationSection = () => {
  const { error } = useLogger({ context: 'TaxInformationSection' });
  const { authState, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [taxCountry, setTaxCountry] = useState(authState.profile?.tax_country || "");
  const [vatNumber, setVatNumber] = useState(authState.profile?.vat_number || "");
  const [taxId, setTaxId] = useState(authState.profile?.tax_id || "");

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        tax_country: taxCountry,
        vat_number: vatNumber || null,
        tax_id: taxId || null
      });

      toast.success("Informazioni fiscali aggiornate con successo");
    } catch (updateError) {
      error("Error updating tax information", updateError as Error, { 
        operation: 'update_tax_info',
        taxCountry,
        hasVatNumber: !!vatNumber,
        hasTaxId: !!taxId
      });
      toast.error("Errore nell'aggiornamento delle informazioni fiscali");
    } finally {
      setIsLoading(false);
    }
  };

  const isHost = authState.profile?.role === 'host';

  if (!isHost) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Euro className="h-5 w-5 mr-2" />
          Informazioni Fiscali (DAC7)
        </CardTitle>
        <CardDescription>
          Informazioni richieste per la conformità fiscale EU (DAC7)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">
                Conformità DAC7 - Direttiva EU
              </p>
              <p className="text-blue-800">
                Se superi €2.000 di reddito e 25 transazioni all'anno, 
                Workover dovrà comunicare i tuoi dati alle autorità fiscali.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="taxCountry">Paese di Residenza Fiscale *</Label>
            <Select value={taxCountry} onValueChange={setTaxCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona paese" />
              </SelectTrigger>
              <SelectContent>
                {EU_COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxId">Codice Fiscale / Tax ID</Label>
            <Input
              id="taxId"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="Es: RSSMRA85M01H501Z"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vatNumber">Partita IVA (opzionale)</Label>
          <Input
            id="vatNumber"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            placeholder="Es: IT01234567890"
          />
          <p className="text-xs text-gray-600">
            Inserisci la tua Partita IVA se sei un'azienda o libero professionista
          </p>
        </div>

        <Separator />

        <Button 
          onClick={handleSave} 
          disabled={isLoading || !taxCountry}
          className="w-full"
        >
          {isLoading ? "Salvando..." : "Salva Informazioni Fiscali"}
        </Button>

        <div className="text-xs text-gray-500">
          <p className="mb-2">
            <strong>Nota sulla Privacy:</strong> Queste informazioni sono utilizzate 
            esclusivamente per la conformità fiscale EU (DAC7) e non saranno condivise 
            con terze parti eccetto le autorità fiscali quando richiesto dalla legge.
          </p>
          <p>
            Per ulteriori informazioni, consulta la nostra{" "}
            <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
