
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { createSupportTicket } from '@/lib/support-utils';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Pre-fill form for authenticated users
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
        
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          name: profile ? `${profile.first_name} ${profile.last_name}` : ''
        }));
      }
    };

    loadUserData();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    // Generate subject if not provided
    const subject = formData.subject || `Richiesta di contatto da ${formData.name}`;
    
    // Validate subject (min 5 chars)
    if (subject.length < 5) {
      toast.error('L\'oggetto deve contenere almeno 5 caratteri');
      return;
    }

    // Validate message (min 20 chars)
    if (formData.message.length < 20) {
      toast.error('Il messaggio deve contenere almeno 20 caratteri');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Map form type to support ticket category
      const categoryMap: Record<string, 'technical' | 'booking' | 'payment' | 'account' | 'space' | 'feedback' | 'other'> = {
        'general': 'other',
        'support': 'technical',
        'billing': 'payment',
        'partnership': 'other',
        'press': 'other',
        'other': 'other'
      };
      
      const category = categoryMap[formData.type] || 'other';
      
      // Append contact info to message for anonymous users
      const messageWithContact = `${formData.message}\n\n---\nEmail di contatto: ${formData.email}\nNome: ${formData.name}`;
      
      const success = await createSupportTicket({
        subject,
        message: messageWithContact,
        category,
        priority: 'normal'
      });
      
      if (success) {
        toast.success('Messaggio inviato con successo! Ti risponderemo entro 24 ore.');
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
          type: ''
        });

        // Redirect to support page if authenticated
        if (isAuthenticated) {
          setTimeout(() => {
            navigate('/support');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error('Errore nell\'invio del messaggio. Riprova più tardi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Contattaci
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Siamo qui per aiutarti. Inviaci un messaggio e ti risponderemo il prima possibile.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Invia un Messaggio</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Il tuo nome"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="la.tua.email@example.com"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="type">Tipo di Richiesta</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona il tipo di richiesta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Informazioni Generali</SelectItem>
                      <SelectItem value="support">Supporto Tecnico</SelectItem>
                      <SelectItem value="billing">Fatturazione</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="press">Stampa</SelectItem>
                      <SelectItem value="other">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject">Oggetto</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="Oggetto del messaggio"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="message">Messaggio *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder="Scrivi qui il tuo messaggio..."
                    rows={6}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Invio in corso...' : 'Invia Messaggio'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni di Contatto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Mail className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Email</h3>
                    <p className="text-gray-600">info@workover.it</p>
                    <p className="text-sm text-gray-500">Rispondiamo entro 24 ore</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Phone className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Telefono</h3>
                    <p className="text-gray-600">+39 02 1234 5678</p>
                    <p className="text-sm text-gray-500">Lun-Ven, 9:00-18:00</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Indirizzo</h3>
                    <p className="text-gray-600">
                      Via Example 123<br />
                      20121 Milano, Italia
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Orari di Supporto</h3>
                    <p className="text-gray-600">
                      Lunedì - Venerdì: 9:00 - 18:00<br />
                      Sabato: 10:00 - 16:00<br />
                      Domenica: Chiuso
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Altri Modi per Contattarci</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Supporto Tecnico</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Per problemi tecnici urgenti, usa il sistema di supporto integrato nella piattaforma.
                  </p>
                  {isAuthenticated ? (
                    <Button variant="outline" size="sm" onClick={() => navigate('/support')}>
                      Vai al Supporto
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                      Accedi per il Supporto
                    </Button>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">FAQ</h4>
                  <p className="text-gray-600 text-sm mb-2">
                    Consulta le nostre domande frequenti per risposte immediate.
                  </p>
                  <Button variant="outline" size="sm">
                    Visualizza FAQ
                  </Button>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Community</h4>
                  <p className="text-gray-600 text-sm">
                    Unisciti alla nostra community per discutere con altri utenti.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
