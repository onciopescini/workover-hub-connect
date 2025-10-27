import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface LegalDocument {
  id: string;
  document_type: 'tos' | 'privacy_policy';
  version: string;
  content: string;
  effective_date: string;
  created_at: string;
}

const LegalHistory = () => {
  const { document_type } = useParams<{ document_type: 'tos' | 'privacy_policy' }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<LegalDocument | null>(null);

  const documentTitle = document_type === 'tos' 
    ? 'Termini di Servizio' 
    : 'Privacy Policy';

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!document_type) return;

      try {
        const { data, error } = await supabase
          .from('legal_documents_versions')
          .select('*')
          .eq('document_type', document_type)
          .order('effective_date', { ascending: false });

        if (error) {
          console.error('Error fetching documents:', error);
        } else {
          setDocuments((data || []) as LegalDocument[]);
          if (data && data.length > 0) {
            setSelectedVersion(data[0] as LegalDocument); // Select latest version by default
          }
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [document_type]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <p className="text-center">Caricamento...</p>
      </div>
    );
  }

  if (!document_type || (document_type !== 'tos' && document_type !== 'privacy_policy')) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        <p className="text-center text-destructive">Tipo di documento non valido</p>
        <div className="text-center mt-4">
          <Button onClick={() => navigate('/')}>Torna alla Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Indietro
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Storico Versioni</h1>
        <p className="text-muted-foreground">{documentTitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar - Version list */}
        <div className="md:col-span-1 space-y-2">
          <h2 className="font-semibold mb-4">Versioni Disponibili</h2>
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedVersion(doc)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                selectedVersion?.id === doc.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Versione {doc.version}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(doc.effective_date), 'dd MMMM yyyy', { locale: it })}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Main content - Document viewer */}
        <div className="md:col-span-2">
          {selectedVersion ? (
            <div className="bg-card border rounded-lg p-6">
              <div className="mb-6 pb-6 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold">
                    {documentTitle} - Versione {selectedVersion.version}
                  </h2>
                  {documents[0]?.id === selectedVersion.id && (
                    <span className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-full">
                      Versione Corrente
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Efficace dal:{' '}
                  {format(new Date(selectedVersion.effective_date), 'dd MMMM yyyy', { locale: it })}
                </p>
              </div>

              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap">{selectedVersion.content}</div>
              </div>
            </div>
          ) : (
            <div className="bg-card border rounded-lg p-6 text-center text-muted-foreground">
              Seleziona una versione per visualizzare il documento
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalHistory;
