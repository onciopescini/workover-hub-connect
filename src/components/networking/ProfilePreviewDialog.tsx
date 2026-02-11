import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Briefcase, ExternalLink, Building } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ProfilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  is_host: boolean;
}

export const ProfilePreviewDialog = ({ open, onOpenChange, userId }: ProfilePreviewDialogProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && userId) {
      loadProfile();
    }
  }, [open, userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles_public_view')
        .select('id, first_name, last_name, avatar_url, bio, job_title, linkedin_url, website_url, is_host')
        .eq('id', userId)
        .single();

      if (error || !data || !data.id) throw error ?? new Error('Profile not found');
      setProfile({
        ...data,
        id: data.id,
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        is_host: data.is_host ?? false,
      } as UserProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFullProfile = () => {
    navigate(`/users/${userId}`);
    onOpenChange(false);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Caricamento profilo...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!profile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Profilo non trovato</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Non è stato possibile caricare il profilo.</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Profilo Coworker</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header con foto e nome */}
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>
                <User className="w-10 h-10" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="text-2xl font-bold">
                {profile.first_name} {profile.last_name}
              </h3>
              
              {profile.job_title && (
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Briefcase className="w-4 h-4" />
                  <span>{profile.job_title}</span>
                </div>
              )}
              
              {(profile.linkedin_url || profile.website_url || profile.is_host) && (
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Building className="w-4 h-4" />
                  <span>{profile.is_host ? 'Host' : 'Coworker'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div>
              <h4 className="font-semibold mb-2">Bio</h4>
              <p className="text-muted-foreground">{profile.bio}</p>
            </div>
          )}

          {(profile.linkedin_url || profile.website_url) && (
            <div>
              <h4 className="font-semibold mb-2">Link</h4>
              <div className="flex flex-wrap gap-2">
                {profile.linkedin_url ? <Badge variant="secondary">LinkedIn</Badge> : null}
                {profile.website_url ? <Badge variant="secondary">Website</Badge> : null}
              </div>
            </div>
          )}

          {/* CTA per vedere profilo completo */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Chiudi
            </Button>
            <Button onClick={handleViewFullProfile}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Vedi profilo completo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
