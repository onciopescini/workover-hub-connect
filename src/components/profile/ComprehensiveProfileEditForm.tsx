
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { toast } from "sonner";
import { 
  User, 
  Briefcase, 
  Globe, 
  Linkedin, 
  Instagram, 
  Twitter, 
  Facebook, 
  Youtube, 
  Github,
  MapPin,
  Award,
  Heart,
  Save,
  Camera,
  Phone,
  Mail,
  CreditCard
} from "lucide-react";

const ComprehensiveProfileEditForm = () => {
  const { authState, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Basic Info
    first_name: authState.profile?.first_name || '',
    last_name: authState.profile?.last_name || '',
    nickname: authState.profile?.nickname || '',
    profile_photo_url: authState.profile?.profile_photo_url || '',
    phone: authState.profile?.phone || '',
    bio: authState.profile?.bio || '',
    location: authState.profile?.location || '',
    
    // Professional Info
    job_title: authState.profile?.job_title || '',
    profession: authState.profile?.profession || '',
    job_type: authState.profile?.job_type || '',
    work_style: authState.profile?.work_style || '',
    skills: authState.profile?.skills || '',
    interests: authState.profile?.interests || '',
    
    // Social Links
    website: authState.profile?.website || '',
    linkedin_url: authState.profile?.linkedin_url || '',
    twitter_url: authState.profile?.twitter_url || '',
    instagram_url: authState.profile?.instagram_url || '',
    facebook_url: authState.profile?.facebook_url || '',
    youtube_url: authState.profile?.youtube_url || '',
    github_url: authState.profile?.github_url || '',
    
    // Settings
    networking_enabled: authState.profile?.networking_enabled ?? true,
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile(formData);
      toast.success("Profilo aggiornato con successo");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Errore nell'aggiornamento del profilo");
    } finally {
      setIsLoading(false);
    }
  };

  const getUserInitials = () => {
    const firstInitial = formData.first_name?.charAt(0) || '';
    const lastInitial = formData.last_name?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'U';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Profile Photo */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={formData.profile_photo_url} />
              <AvatarFallback className="text-xl">{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">
                {formData.first_name} {formData.last_name}
              </CardTitle>
              <p className="text-gray-600">{formData.job_title || 'Completa il tuo profilo'}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Base
            </TabsTrigger>
            <TabsTrigger value="professional" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Professionale
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Social
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Impostazioni
            </TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informazioni di Base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Nome *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Cognome *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nickname">Nickname</Label>
                  <Input
                    id="nickname"
                    value={formData.nickname}
                    onChange={(e) => handleInputChange('nickname', e.target.value)}
                    placeholder="Nome che vuoi mostrare pubblicamente"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile_photo_url">URL Foto Profilo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="profile_photo_url"
                      value={formData.profile_photo_url}
                      onChange={(e) => handleInputChange('profile_photo_url', e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                    />
                    <Button type="button" variant="outline" size="icon">
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefono</Label>
                    <div className="flex">
                      <Phone className="h-5 w-5 text-gray-400 mt-2.5 mr-2" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+39 123 456 7890"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Località</Label>
                    <div className="flex">
                      <MapPin className="h-5 w-5 text-gray-400 mt-2.5 mr-2" />
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="Milano, Italia"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Biografia</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={4}
                    placeholder="Racconta qualcosa di te..."
                  />
                  <p className="text-sm text-gray-500">{formData.bio?.length || 0}/500 caratteri</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Professional Information Tab */}
          <TabsContent value="professional">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Informazioni Professionali
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Titolo di Lavoro</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) => handleInputChange('job_title', e.target.value)}
                      placeholder="es. Software Developer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profession">Professione</Label>
                    <Input
                      id="profession"
                      value={formData.profession}
                      onChange={(e) => handleInputChange('profession', e.target.value)}
                      placeholder="es. Ingegnere"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="job_type">Tipo di Lavoro</Label>
                    <Select value={formData.job_type} onValueChange={(value) => handleInputChange('job_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="contract">Contratto</SelectItem>
                        <SelectItem value="intern">Stage</SelectItem>
                        <SelectItem value="unemployed">In cerca di lavoro</SelectItem>
                        <SelectItem value="student">Studente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="work_style">Stile di Lavoro</Label>
                    <Select value={formData.work_style} onValueChange={(value) => handleInputChange('work_style', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona stile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remoto</SelectItem>
                        <SelectItem value="hybrid">Ibrido</SelectItem>
                        <SelectItem value="office">In Ufficio</SelectItem>
                        <SelectItem value="nomad">Nomade Digitale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skills">Competenze</Label>
                  <Textarea
                    id="skills"
                    value={formData.skills}
                    onChange={(e) => handleInputChange('skills', e.target.value)}
                    rows={3}
                    placeholder="Separa le competenze con virgole: JavaScript, React, Node.js..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interests">Interessi</Label>
                  <Textarea
                    id="interests"
                    value={formData.interests}
                    onChange={(e) => handleInputChange('interests', e.target.value)}
                    rows={3}
                    placeholder="I tuoi interessi e hobby..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social Links Tab */}
          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Collegamenti Social
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Sito Web
                    </Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://tuosito.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </Label>
                    <Input
                      id="linkedin_url"
                      value={formData.linkedin_url}
                      onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/in/tuoprofilo"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="twitter_url" className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" />
                        Twitter
                      </Label>
                      <Input
                        id="twitter_url"
                        value={formData.twitter_url}
                        onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                        placeholder="https://twitter.com/tuousername"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram_url" className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </Label>
                      <Input
                        id="instagram_url"
                        value={formData.instagram_url}
                        onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                        placeholder="https://instagram.com/tuousername"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="facebook_url" className="flex items-center gap-2">
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </Label>
                      <Input
                        id="facebook_url"
                        value={formData.facebook_url}
                        onChange={(e) => handleInputChange('facebook_url', e.target.value)}
                        placeholder="https://facebook.com/tuoprofilo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="youtube_url" className="flex items-center gap-2">
                        <Youtube className="h-4 w-4" />
                        YouTube
                      </Label>
                      <Input
                        id="youtube_url"
                        value={formData.youtube_url}
                        onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                        placeholder="https://youtube.com/c/tuocanale"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="github_url" className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      GitHub
                    </Label>
                    <Input
                      id="github_url"
                      value={formData.github_url}
                      onChange={(e) => handleInputChange('github_url', e.target.value)}
                      placeholder="https://github.com/tuousername"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Impostazioni Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Networking Abilitato</h3>
                    <p className="text-sm text-gray-600">
                      Permetti ad altri utenti di trovarti e connettersi con te
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={formData.networking_enabled ? "default" : "outline"}
                    onClick={() => handleInputChange('networking_enabled', !formData.networking_enabled)}
                  >
                    {formData.networking_enabled ? 'Abilitato' : 'Disabilitato'}
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Email Verificata</span>
                    <Badge variant="secondary">Verificato</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{authState.user?.email}</p>
                </div>

                {authState.profile?.role === 'host' && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Stripe Connect</span>
                      <Badge variant={authState.profile.stripe_connected ? "default" : "outline"}>
                        {authState.profile.stripe_connected ? 'Configurato' : 'Non Configurato'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {authState.profile.stripe_connected 
                        ? 'I pagamenti sono configurati correttamente'
                        : 'Configura Stripe per ricevere pagamenti'
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Save className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salva Modifiche
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default ComprehensiveProfileEditForm;
