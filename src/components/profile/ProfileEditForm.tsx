
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Upload, AlertCircle, Loader2 } from 'lucide-react';

export const ProfileEditForm = () => {
  const { authState, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkedinError, setLinkedinError] = useState('');
  
  // Helper function to parse interests from string to array
  const parseInterests = (interests: string | null): string => {
    if (!interests || interests.trim() === '') return '';
    return interests;
  };

  const [formData, setFormData] = useState({
    first_name: authState.profile?.first_name || '',
    last_name: authState.profile?.last_name || '',
    nickname: authState.profile?.nickname || '',
    job_title: authState.profile?.job_title || '',
    job_type: authState.profile?.job_type || '',
    work_style: authState.profile?.work_style || '',
    bio: authState.profile?.bio || '',
    location: authState.profile?.location || '',
    skills: authState.profile?.skills || '',
    interests: parseInterests(authState.profile?.interests),
    linkedin_url: authState.profile?.linkedin_url || '',
    website: authState.profile?.website || '',
  });

  const validateLinkedInUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid
    
    // More flexible LinkedIn URL validation that matches database constraint
    const linkedinRegex = /^https:\/\/(www\.)?linkedin\.com\/(in|pub|profile)\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+$/i;
    return linkedinRegex.test(url);
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear LinkedIn error when user starts typing
    if (field === 'linkedin_url') {
      setLinkedinError('');
    }
  };

  const handleLinkedInBlur = (value: string) => {
    if (value.trim()) {
      const formattedUrl = formatLinkedInUrl(value);
      setFormData(prev => ({ ...prev, linkedin_url: formattedUrl }));
      
      if (!validateLinkedInUrl(formattedUrl)) {
        setLinkedinError('Inserisci un URL LinkedIn valido (es: https://linkedin.com/in/nomeutente)');
      }
    }
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

      console.log('Uploading file to path:', fileName);

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully');

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('Public URL:', data.publicUrl);

      // Update profile with new photo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_photo_url: data.publicUrl })
        .eq('id', authState.user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      console.log('Profile updated successfully');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authState.user) return;

    // Validate LinkedIn URL before submitting
    if (formData.linkedin_url && !validateLinkedInUrl(formData.linkedin_url)) {
      setLinkedinError('Inserisci un URL LinkedIn valido prima di salvare');
      return;
    }

    setLoading(true);
    try {
      console.log('Saving profile data:', formData);

      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', authState.user.id);

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      console.log('Profile saved successfully');
      toast.success('Profilo aggiornato con successo');
      
      // Refresh the profile data
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Errore nell\'aggiornamento del profilo');
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    const firstName = formData.first_name || "";
    const lastName = formData.last_name || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Modifica Profilo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={authState.profile?.profile_photo_url || ""} />
              <AvatarFallback className="text-xl">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="photo-upload" className="cursor-pointer">
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
              </Label>
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
            <div>
              <Label htmlFor="first_name">Nome *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Cognome *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => handleInputChange('nickname', e.target.value)}
              placeholder="@nickname"
            />
          </div>

          {/* Job Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informazioni Professionali</h3>
            
            <div>
              <Label htmlFor="job_title">Titolo di Lavoro</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                placeholder="es. Frontend Developer, Marketing Manager..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="job_type">Tipo di Lavoro</Label>
                <Select
                  value={formData.job_type}
                  onValueChange={(value) => handleInputChange('job_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aziendale">Aziendale</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="studente">Studente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="work_style">Stile di Lavoro</Label>
                <Select
                  value={formData.work_style}
                  onValueChange={(value) => handleInputChange('work_style', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona stile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="silenzioso">Silenzioso</SelectItem>
                    <SelectItem value="collaborativo">Collaborativo</SelectItem>
                    <SelectItem value="flessibile">Flessibile</SelectItem>
                    <SelectItem value="strutturato">Strutturato</SelectItem>
                    <SelectItem value="creativo">Creativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Raccontaci di te..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="location">Posizione</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Città, Paese"
            />
          </div>

          {/* Role-specific fields */}
          {authState.profile?.role === 'coworker' && (
            <>
              <div>
                <Label htmlFor="skills">Competenze</Label>
                <Textarea
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => handleInputChange('skills', e.target.value)}
                  placeholder="Le tue competenze professionali..."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="interests">Interessi</Label>
                <Textarea
                  id="interests"
                  value={formData.interests}
                  onChange={(e) => handleInputChange('interests', e.target.value)}
                  placeholder="I tuoi interessi separati da virgole..."
                  rows={2}
                />
              </div>
            </>
          )}

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Collegamenti Social</h3>
            <div>
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input
                id="linkedin_url"
                value={formData.linkedin_url}
                onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                onBlur={(e) => handleLinkedInBlur(e.target.value)}
                placeholder="nomeutente oppure https://linkedin.com/in/nomeutente"
                type="text"
                className={linkedinError ? 'border-red-500' : ''}
              />
              {linkedinError && (
                <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {linkedinError}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Puoi inserire solo il nome utente (es: "nomeutente") o l'URL completo
              </p>
            </div>
            <div>
              <Label htmlFor="website">Sito Web</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://tuosito.com"
                type="url"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading || !!linkedinError} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
