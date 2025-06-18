
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Save, Upload, Loader2 } from 'lucide-react';
import { ProfileEditFormSchema, ProfileEditFormData } from '@/schemas/profileSchema';

export const RefactoredProfileEditForm = () => {
  const { authState, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  const form = useForm<ProfileEditFormData>({
    resolver: zodResolver(ProfileEditFormSchema),
    defaultValues: {
      first_name: authState.profile?.first_name || '',
      last_name: authState.profile?.last_name || '',
      nickname: authState.profile?.nickname || '',
      job_title: authState.profile?.job_title || '',
      job_type: authState.profile?.job_type || '',
      work_style: authState.profile?.work_style || '',
      bio: authState.profile?.bio || '',
      location: authState.profile?.location || '',
      skills: authState.profile?.skills || '',
      interests: authState.profile?.interests || '',
      linkedin_url: authState.profile?.linkedin_url || '',
      website: authState.profile?.website || '',
      networking_enabled: authState.profile?.networking_enabled || false,
    }
  });

  // Watch form values for avatar initials
  const firstName = form.watch('first_name');
  const lastName = form.watch('last_name');

  const getUserInitials = () => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const formatLinkedInUrl = (input: string): string => {
    if (!input.trim()) return '';
    
    // Remove any trailing slash
    input = input.trim().replace(/\/$/, '');
    
    // If user just entered a username (no URL), format it properly
    if (!input.includes('linkedin.com') && !input.includes('http')) {
      return `https://linkedin.com/in/${input}`;
    }
    
    // If missing protocol, add it
    if (input.includes('linkedin.com') && !input.startsWith('http')) {
      return `https://${input}`;
    }
    
    // Ensure it's https (not http)
    if (input.startsWith('http://linkedin.com')) {
      return input.replace('http://', 'https://');
    }
    
    return input;
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !authState.user) return;

    setUploading(true);
    try {
      console.log('Starting photo upload for user:', authState.user.id);
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Il file è troppo grande. Dimensione massima: 5MB');
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo di file non supportato. Usa JPG, PNG, WebP o GIF');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${authState.user.id}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new photo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_photo_url: data.publicUrl })
        .eq('id', authState.user.id);

      if (updateError) {
        throw updateError;
      }

      toast.success('Foto profilo aggiornata con successo');
      
      // Refresh the profile data
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || 'Errore nel caricamento della foto');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProfileEditFormData) => {
    if (!authState.user) return;

    try {
      // Format LinkedIn URL if provided
      const formattedData = {
        ...data,
        linkedin_url: data.linkedin_url ? formatLinkedInUrl(data.linkedin_url) : ''
      };

      const { error } = await supabase
        .from('profiles')
        .update(formattedData)
        .eq('id', authState.user.id);

      if (error) {
        throw error;
      }

      toast.success('Profilo aggiornato con successo');
      
      // Refresh the profile data
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Errore nell\'aggiornamento del profilo');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Modifica Profilo</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Photo Upload Section */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage 
                  src={authState.profile?.profile_photo_url || ""} 
                  enableWebP={true}
                  priority={true}
                  fallbackSrc="/placeholder.svg"
                />
                <AvatarFallback className="text-xl">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    className="cursor-pointer"
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploading ? 'Caricamento...' : 'Cambia Foto'}
                    </span>
                  </Button>
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG, WebP o GIF. Max 5MB.
                </p>
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cognome *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="@nickname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Job Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informazioni Professionali</h3>
              
              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo di Lavoro</FormLabel>
                    <FormControl>
                      <Input placeholder="es. Software Developer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="job_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo di Lavoro</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="freelance">Freelance</SelectItem>
                          <SelectItem value="employee">Dipendente</SelectItem>
                          <SelectItem value="entrepreneur">Imprenditore</SelectItem>
                          <SelectItem value="student">Studente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="work_style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stile di Lavoro</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="focused">Concentrato</SelectItem>
                          <SelectItem value="collaborative">Collaborativo</SelectItem>
                          <SelectItem value="flexible">Flessibile</SelectItem>
                          <SelectItem value="social">Sociale</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informazioni Personali</h3>
              
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biografia</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Raccontaci di te..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Località</FormLabel>
                    <FormControl>
                      <Input placeholder="es. Milano, Italia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competenze</FormLabel>
                    <FormControl>
                      <Input placeholder="es. JavaScript, React, Node.js" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interessi</FormLabel>
                    <FormControl>
                      <Input placeholder="es. Tecnologia, Design, Marketing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Link Social</h3>
              
              <FormField
                control={form.control}
                name="linkedin_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://linkedin.com/in/nomeutente" 
                        {...field}
                        onBlur={(e) => {
                          if (e.target.value) {
                            const formatted = formatLinkedInUrl(e.target.value);
                            field.onChange(formatted);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sito Web</FormLabel>
                    <FormControl>
                      <Input placeholder="https://tuosito.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Networking Settings */}
            <FormField
              control={form.control}
              name="networking_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Networking Abilitato</FormLabel>
                    <p className="text-sm text-gray-500">
                      Permetti ad altri utenti di connettersi con te
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {form.formState.isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
