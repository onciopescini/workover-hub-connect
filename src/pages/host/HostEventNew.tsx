
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';

interface Space {
  id: string;
  title: string;
  address: string;
  max_capacity: number;
}

const HostEventNew = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    space_id: '',
    date: '',
    time: '',
    max_participants: 10,
    image_url: '',
    city: ''
  });

  useEffect(() => {
    if (authState.profile?.role !== "host") {
      navigate("/dashboard", { replace: true });
      return;
    }
    
    loadSpaces();
  }, [authState.profile, navigate]);

  const loadSpaces = async () => {
    if (!authState.user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('id, title, address, max_capacity')
        .eq('host_id', authState.user.id)
        .eq('published', true);

      if (error) {
        console.error("Error loading spaces:", error);
        toast.error("Errore nel caricamento degli spazi");
        return;
      }

      setSpaces(data || []);
    } catch (error) {
      console.error("Error loading spaces:", error);
      toast.error("Errore nel caricamento degli spazi");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.space_id || !formData.date || !formData.time) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    setIsLoading(true);
    
    try {
      const eventDate = new Date(`${formData.date}T${formData.time}`);
      
      const { error } = await supabase
        .from('events')
        .insert({
          title: formData.title,
          description: formData.description || null,
          space_id: formData.space_id,
          date: eventDate.toISOString(),
          max_participants: formData.max_participants,
          image_url: formData.image_url || null,
          city: formData.city || null,
          created_by: authState.user!.id
        });

      if (error) {
        console.error("Error creating event:", error);
        toast.error("Errore nella creazione dell'evento");
        return;
      }

      toast.success("Evento creato con successo!");
      navigate("/host/events");
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Errore nella creazione dell'evento");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const selectedSpace = spaces.find(s => s.id === formData.space_id);

  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (authState.profile?.role !== "host") {
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-2xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/host/events')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna agli eventi
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Crea Nuovo Evento</h1>
        <p className="text-gray-600">Organizza un workshop, networking o evento speciale</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dettagli Evento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Titolo Evento *</Label>
              <Input
                id="title"
                placeholder="Workshop di Design Thinking"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                placeholder="Descrivi il tuo evento, cosa impareranno i partecipanti..."
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="space_id">Spazio *</Label>
              <Select value={formData.space_id} onValueChange={(value) => handleInputChange('space_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona uno spazio" />
                </SelectTrigger>
                <SelectContent>
                  {spaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{space.title} - {space.address}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {spaces.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Devi avere almeno uno spazio pubblicato per creare eventi.{' '}
                  <Button variant="link" onClick={() => navigate('/create-space')} className="p-0 h-auto">
                    Crea spazio
                  </Button>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="time">Orario *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="max_participants">Partecipanti Massimi</Label>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <Input
                  id="max_participants"
                  type="number"
                  min={1}
                  max={selectedSpace?.max_capacity || 100}
                  className="w-32"
                  value={formData.max_participants}
                  onChange={(e) => handleInputChange('max_participants', parseInt(e.target.value) || 10)}
                />
                {selectedSpace && (
                  <span className="text-sm text-gray-500">
                    (max {selectedSpace.max_capacity} per questo spazio)
                  </span>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="city">Città</Label>
              <Input
                id="city"
                placeholder="Milano"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="image_url">URL Immagine (opzionale)</Label>
              <Input
                id="image_url"
                type="url"
                placeholder="https://example.com/event-image.jpg"
                value={formData.image_url}
                onChange={(e) => handleInputChange('image_url', e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/host/events')}
                disabled={isLoading}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isLoading || spaces.length === 0}>
                {isLoading ? "Creazione..." : "Crea Evento"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default HostEventNew;
