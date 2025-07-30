
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Code, Users, Shield, Zap, HelpCircle } from "lucide-react";

export const NetworkingDocumentation = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const apiExamples = {
    connections: `// Inviare una richiesta di connessione
const { data, error } = await supabase
  .from('connections')
  .insert({
    sender_id: currentUserId,
    receiver_id: targetUserId,
    status: 'pending'
  });`,
    
    suggestions: `// Ottenere suggerimenti di connessione
const { data, error } = await supabase
  .from('connection_suggestions')
  .select(\`
    *,
    suggested_user:profiles (*)
  \`)
  .eq('user_id', currentUserId)
  .order('score', { ascending: false });`,
  
    access: `// Verificare accesso al profilo
const result = await checkProfileAccess(profileId);
if (result.has_access) {
  // Utente può vedere il profilo
}`
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Documentazione Sistema Networking
        </h2>
        <Badge variant="outline">v1.0.0</Badge>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="api">API Reference</TabsTrigger>
          <TabsTrigger value="security">Sicurezza</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sistema di Networking Professionale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Il sistema di networking di Workover permette agli utenti di connettersi 
                  in modo sicuro e professionale, con controlli granulari di accesso e privacy.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4" />
                      Connessioni
                    </h3>
                    <p className="text-sm text-gray-600">
                      Sistema di richieste di connessione con approvazione, gestione stato 
                      e scadenza automatica.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4" />
                      Suggerimenti
                    </h3>
                    <p className="text-sm text-gray-600">
                      Algoritmo intelligente per suggerimenti basati su spazi condivisi, 
                      e interessi comuni.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4" />
                      Privacy
                    </h3>
                    <p className="text-sm text-gray-600">
                      Controlli granulari di accesso ai profili con livelli di visibilità 
                      differenziati.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold flex items-center gap-2 mb-2">
                      <Code className="w-4 h-4" />
                      API Ready
                    </h3>
                    <p className="text-sm text-gray-600">
                      API complete con TypeScript, validazione e error handling robusto.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Reference */}
        <TabsContent value="api">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Riferimenti API</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(apiExamples).map(([key, code]) => (
                  <div key={key} className="space-y-2">
                    <h3 className="font-semibold capitalize">{key}</h3>
                    <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{code}</code>
                    </pre>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Sicurezza e Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Controllo Accessi</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li>RLS (Row Level Security) su tutte le tabelle</li>
                      <li>Funzione database `check_profile_access` per controlli granulari</li>
                      <li>Validazione server-side di tutti i permessi</li>
                      <li>Type guards per validazione dati in TypeScript</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Livelli di Privacy</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li><strong>Full:</strong> Accesso completo (proprio profilo, connessioni accettate)</li>
                      <li><strong>Limited:</strong> Accesso limitato (suggerimenti, contesti condivisi)</li>
                      <li><strong>None:</strong> Nessun accesso (utenti non autorizzati)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Protezioni Implementate</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li>Rate limiting per richieste di connessione</li>
                      <li>Scadenza automatica richieste pending</li>
                      <li>Filtro networking_enabled per rispettare preferenze utente</li>
                      <li>Validazione input e sanitizzazione dati</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Ottimizzazioni Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Database</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li>Indici ottimizzati su user_id, status, created_at</li>
                      <li>Query con select specifici per ridurre payload</li>
                      <li>Paginazione per grandi dataset</li>
                      <li>Cache delle relazioni con join efficienti</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Frontend</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li>Lazy loading di componenti networking</li>
                      <li>Memoizzazione di hook e componenti</li>
                      <li>Debouncing per ricerche e filtri</li>
                      <li>Ottimizzazioni React Query per cache</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Metriche Target</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li>Tempo risposta API: &lt; 200ms</li>
                      <li>Caricamento iniziale: &lt; 500ms</li>
                      <li>Time to Interactive: &lt; 1s</li>
                      <li>Core Web Vitals: tutti green</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Domande Frequenti
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  {
                    q: "Come funziona il sistema di suggerimenti?",
                    a: "I suggerimenti sono basati su spazi condivisi e interessi comuni. L'algoritmo calcola un punteggio di compatibilità per ogni utente."
                  },
                  {
                    q: "Chi può vedere il mio profilo?",
                    a: "Dipende dalle tue impostazioni di privacy e dal tipo di relazione: connessioni accettate vedono tutto, utenti con contesti condivisi vedono informazioni limitate."
                  },
                  {
                    q: "Come posso disabilitare il networking?",
                    a: "Vai nelle impostazioni profilo e disabilita 'networking_enabled'. Non apparirai più nei suggerimenti e non potrai inviare/ricevere richieste."
                  },
                  {
                    q: "Quanto durano le richieste pending?",
                    a: "Le richieste di connessione scadono automaticamente dopo 7 giorni se non vengono accettate o rifiutate."
                  },
                  {
                    q: "Posso annullare una richiesta inviata?",
                    a: "Sì, puoi sempre annullare richieste che hai inviato finché sono in stato 'pending'."
                  }
                ].map((faq, index) => (
                  <div key={index} className="border-b pb-4">
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-sm text-gray-600">{faq.a}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
