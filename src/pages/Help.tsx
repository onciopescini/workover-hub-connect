
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, MessageCircle, Book, Phone } from 'lucide-react';

const Help = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Centro Assistenza
        </h1>
        <p className="text-gray-600">
          Trova le risposte alle tue domande o contattaci per supporto
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/faq')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              Domande Frequenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Consulta le risposte alle domande più comuni sulla piattaforma
            </p>
            <Button variant="outline">Visualizza FAQ</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/support')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Supporto Tecnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Hai un problema tecnico? Contatta il nostro team di supporto
            </p>
            <Button variant="outline">Contatta Supporto</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-purple-600" />
              Guide e Tutorial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Impara a utilizzare al meglio tutte le funzionalità di Workover
            </p>
            <Button variant="outline">Visualizza Guide</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/contact')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-orange-600" />
              Contattaci
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Hai bisogno di assistenza personalizzata? Siamo qui per aiutarti
            </p>
            <Button variant="outline">Contattaci</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Help;
