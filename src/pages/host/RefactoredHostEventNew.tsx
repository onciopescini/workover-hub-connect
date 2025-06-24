
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { createEvent } from "@/lib/host-event-utils";
import { getHostSpaces } from "@/lib/space-utils";
import LoadingScreen from "@/components/LoadingScreen";
import { EventFormSchema, EventFormData } from "@/schemas/eventSchema";
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

interface Space {
  id: string;
  title: string;
  address: string;
  max_capacity: number;
}

const RefactoredHostEventNew = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);

  const form = useForm<EventFormData>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      space_id: '',
      date: '',
      time: '',
      max_participants: 10,
      image_url: '',
      city: ''
    }
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
      const hostSpaces = await getHostSpaces(authState.user.id);
      setSpaces(hostSpaces);
    } catch (error) {
      console.error("Error loading spaces:", error);
      toast.error("Errore nel caricamento degli spazi");
    }
  };

  const onSubmit = async (data: EventFormData) => {
    setIsLoading(true);
    
    try {
      const eventDate = new Date(`${data.date}T${data.time}`);
      
      const eventData = {
        title: data.title,
        description: data.description || null,
        space_id: data.space_id,
        date: eventDate.toISOString(),
        max_participants: data.max_participants,
        image_url: data.image_url || null,
        city: data.city || null,
        created_by: authState.user!.id
      };

      await createEvent(eventData);
      toast.success("Evento creato con successo!");
      navigate("/host/events");
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Errore nella creazione dell'evento");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSpace = spaces.find(s => s.id === form.watch('space_id'));

  if (authState.isLoading) {
    return <LoadingScreen />;
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo Evento *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Workshop di Design Thinking"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrivi il tuo evento, cosa impareranno i partecipanti..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="space_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spazio *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona uno spazio" />
                        </SelectTrigger>
                      </FormControl>
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
                      <p className="text-sm text-gray-500">
                        Devi avere almeno uno spazio pubblicato per creare eventi.{' '}
                        <Button variant="link" onClick={() => navigate('/create-space')} className="p-0 h-auto">
                          Crea spazio
                        </Button>
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Orario *</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="max_participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partecipanti Massimi</FormLabel>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={selectedSpace?.max_capacity || 100}
                          className="w-32"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                        />
                      </FormControl>
                      {selectedSpace && (
                        <span className="text-sm text-gray-500">
                          (max {selectedSpace.max_capacity} per questo spazio)
                        </span>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Città</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Milano"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Immagine (opzionale)</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/event-image.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RefactoredHostEventNew;
