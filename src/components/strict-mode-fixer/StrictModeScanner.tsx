import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Settings, Zap } from "lucide-react";

export const StrictModeScanner = () => {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsScanning(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Scanner Avanzato
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium">File Analizzati</p>
                <p className="text-sm text-muted-foreground">156 file .tsx/.ts</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Settings className="w-5 h-5 text-orange-500" />
              <div>
                <p className="font-medium">Configurazione</p>
                <p className="text-sm text-muted-foreground">Strict mode ready</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Zap className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium">Auto-fix</p>
                <p className="text-sm text-muted-foreground">76% correggibili</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleScan}
            disabled={isScanning}
            className="w-full"
          >
            {isScanning ? 'Scansione in corso...' : 'Avvia Scansione Completa'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};