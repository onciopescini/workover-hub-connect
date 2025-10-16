import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { useGDPRRequests } from '@/hooks/useGDPRRequests';

export const GDPRExportButton = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { startInstantExport } = useGDPRRequests();
  
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      await startInstantExport(
        () => {
          toast.success('Export dati completato! Il download inizierà a breve.');
        },
        (error) => {
          toast.error(error || 'Errore durante l\'export dei dati');
        }
      );
    } catch (error) {
      toast.error('Errore durante l\'export dei dati');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="p-4 border rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <Download className="h-4 w-4" />
        <h3 className="font-medium">Esporta i tuoi dati</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Richiedi una copia di tutti i tuoi dati personali (GDPR Art. 20)
      </p>
      <Button 
        variant="outline" 
        className="w-full"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? 'Esportazione in corso...' : 'Richiedi Export Dati'}
      </Button>
    </div>
  );
};
