
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
import { Save, Upload } from 'lucide-react';

export const ProfileEditForm = () => {
  const { authState } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    interests: authState.profile?.interests || '',
    linkedin_url: authState.profile?.linkedin_url || '',
    website: authState.profile?.website || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !authState.user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${authState.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_photo_url: data.publicUrl })
        .eq('id', authState.user.id);

      if (updateError) throw updateError;

      toast.success('Foto profilo aggiornata con successo');
      window.location.reload();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Errore nel caricamento della foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authState.user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', authState.user.id);

      if (error) throw error;

      toast.success('Profilo aggiornato con successo');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Errore nell\'aggiornamento del profilo');
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
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Caricamento...' : 'Cambia Foto'}
                  </span>
                </Button>
              </Label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
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
                  placeholder="I tuoi interessi..."
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
                placeholder="https://linkedin.com/in/username"
                type="url"
              />
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

          <Button type="submit" disabled={loading} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
