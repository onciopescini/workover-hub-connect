import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, User, Calendar, MessageSquare, Globe, ExternalLink, MapPin, Briefcase, Lightbulb, Heart, Users, Handshake, Building, FileText } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from "@/integrations/supabase/client";
import { createOrGetPrivateChat } from "@/lib/networking-utils";
import { useProfileAccess } from "@/hooks/useProfileAccess";
import { ProfileAccessDenied } from "@/components/profile/ProfileAccessDenied";
import { ProfileAccessBadge } from "@/components/profile/ProfileAccessBadge";
import { toast } from "sonner";
import { isCompleteProfile } from "@/types/strict-type-guards";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
  bio?: string;
  location?: string;
  profession?: string;
  job_title?: string;
  website?: string;
  linkedin_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  github_url?: string;
  skills?: string;
  interests?: string;
  competencies?: string[];
  industries?: string[];
  collaboration_availability?: string;
  collaboration_types?: string[];
  preferred_work_mode?: string;
  collaboration_description?: string;
  created_at: string;
}

interface UserSpace {
  id: string;
  title: string;
  description: string;
  category: string;
  price_per_day: number;
  photos: string[];
  address: string;
}

interface UserReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  } | undefined;
}

const UserProfileView = () => {
  const { userId } = useParams<{ userId: string }>();
  const { 
    profile, 
    accessResult, 
    visibilityLevel, 
    isLoading, 
    hasAccess, 
    canViewFullProfile 
  } = useProfileAccess({ 
    userId: userId || '', 
    autoFetch: true 
  });

  const [spaces, setSpaces] = useState<UserSpace[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (userId && hasAccess && profile) {
      fetchUserSpacesAndReviews();
    }
  }, [userId, hasAccess, profile]);

  const fetchUserSpacesAndReviews = async () => {
    if (!userId || !hasAccess) return;
    
    try {
      // Fetch spaces solo se ha accesso completo
      if (canViewFullProfile) {
        const { data: spacesData, error: spacesError } = await supabase
          .from('spaces')
          .select('*')
          .eq('host_id', userId)
          .eq('published', true);

        if (spacesError) {
          console.error('Error fetching spaces:', spacesError);
        } else {
          setSpaces(spacesData || []);
        }

        // Fetch booking reviews - reviews received by the user
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('booking_reviews')
          .select('*')
          .eq('target_id', userId)
          .eq('is_visible', true);

        if (reviewsError) {
          console.error('Error fetching booking reviews:', reviewsError);
        } else if (reviewsData && reviewsData.length > 0) {
          const authorIds = reviewsData.map(r => r.author_id);
          const { data: authorProfiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, profile_photo_url')
            .in('id', authorIds);

          const profilesMap = new Map((authorProfiles || []).map(p => [p.id, p]));
          
          const reviewsWithProfiles = reviewsData.map(review => ({
            ...review,
            reviewer: profilesMap.get(review.author_id) || null
          }));
          
          setReviews(reviewsWithProfiles.map(review => ({
            ...review,
            comment: review.content ?? '', // booking_reviews uses 'content' instead of 'comment'
            created_at: review.created_at ?? '',
            reviewer: review.reviewer ? {
              first_name: review.reviewer.first_name,
              last_name: review.reviewer.last_name,
              profile_photo_url: review.reviewer.profile_photo_url ?? ''
            } : undefined
          })));
        }
      }
    } catch (error) {
      console.error('Error in fetchUserSpacesAndReviews:', error);
    }
  };

  const startPrivateChat = async () => {
    if (!userId || startingChat) return;

    setStartingChat(true);
    try {
      const chatId = await createOrGetPrivateChat(userId);
      if (chatId) {
        window.location.href = `/messages/private/${chatId}`;
      } else {
        toast.error("Impossibile avviare la chat");
      }
    } catch (error) {
      console.error('Error starting private chat:', error);
      toast.error("Errore nell'avvio della chat");
    } finally {
      setStartingChat(false);
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "text-yellow-400 fill-current"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Gestione accesso negato con componente dedicato
  if (!hasAccess && accessResult) {
    const profileName = profile ? `${profile['first_name']} ${profile['last_name']}` : '';
    return <ProfileAccessDenied accessResult={accessResult} profileName={profileName} />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-xl font-bold mb-2">Profilo non disponibile</h1>
            <p>Non è possibile caricare i dati del profilo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const averageRating = calculateAverageRating();

  const renderSocialLinks = () => {
    if (visibilityLevel !== 'full') return null;

    const socialLinks = [
      { url: profile['website'], icon: Globe, label: 'Website' },
      { url: profile['linkedin_url'], icon: ExternalLink, label: 'LinkedIn' },
      { url: profile['twitter_url'], icon: ExternalLink, label: 'Twitter' },
      { url: profile['instagram_url'], icon: ExternalLink, label: 'Instagram' },
      { url: profile['facebook_url'], icon: ExternalLink, label: 'Facebook' },
      { url: profile['youtube_url'], icon: ExternalLink, label: 'YouTube' },
      { url: profile['github_url'], icon: ExternalLink, label: 'GitHub' },
    ].filter(link => link.url);

    if (socialLinks.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Collegamenti</h3>
        <div className="space-y-2">
          {socialLinks.map((link, index) => {
            const IconComponent = link.icon;
            return (
              <a
                key={index}
                href={link.url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
              >
                <IconComponent className="w-4 h-4" />
                <span>{link.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      {/* Badge di accesso */}
      {accessResult && (
        <div className="mb-4">
          <ProfileAccessBadge 
            accessReason={accessResult.access_reason}
            visibilityLevel={visibilityLevel}
          />
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8 p-6 bg-gradient-to-r from-background to-muted/30 rounded-xl border-2 border-muted/50">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center ring-4 ring-primary/20 shadow-lg">
            {profile['profile_photo_url'] ? (
              <img 
                src={String(profile['profile_photo_url'])} 
                alt="Profile" 
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-primary-foreground" />
            )}
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                {String(profile['first_name'])} {String(profile['last_name'])}
              </h1>
              {(typeof profile['collaboration_availability'] === 'string' && profile['collaboration_availability'] !== 'not_available') && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  profile['collaboration_availability'] === 'available' 
                    ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30' 
                    : profile['collaboration_availability'] === 'busy'
                    ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30'
                    : 'bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    profile['collaboration_availability'] === 'available' ? 'bg-green-500' 
                    : profile['collaboration_availability'] === 'busy' ? 'bg-yellow-500'
                    : 'bg-red-500'
                  }`} />
                  {profile['collaboration_availability'] === 'available' ? 'Disponibile' : 
                   profile['collaboration_availability'] === 'busy' ? 'Occupato' : 'Non disponibile'}
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {(typeof profile['job_title'] === 'string' && profile['job_title']) && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="font-medium">{profile['job_title']}</span>
                </div>
              )}
              {(typeof profile['profession'] === 'string' && profile['profession']) && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="font-medium">{profile['profession']}</span>
                </div>
              )}
              {(typeof profile['location'] === 'string' && profile['location']) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{profile['location']}</span>
                </div>
              )}
              {reviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {renderStars(Math.round(calculateAverageRating()))}
                  </div>
                  <span className="font-medium">{calculateAverageRating().toFixed(1)}</span>
                  <span className="text-sm">({reviews.length} recensioni)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="mb-8 flex justify-start">
          <Button 
            onClick={startPrivateChat}
            disabled={startingChat}
            size="lg"
            className="min-w-[200px] h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            {startingChat ? 'Avvio chat...' : 'Invia Messaggio'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Bio and Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-2 border-muted/50">
            <CardContent className="p-6">
              {typeof profile['bio'] === 'string' && profile['bio'] && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Informazioni
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{profile['bio']}</p>
                </div>
              )}

              {/* Mostra dettagli aggiuntivi solo con accesso completo */}
              {canViewFullProfile && (
                <>
                  {typeof profile['skills'] === 'string' && profile['skills'] && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        Competenze
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile['skills'].split(',').map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-2 bg-gradient-to-r from-primary/20 to-primary/10 text-primary rounded-lg text-sm font-medium border border-primary/20 hover:border-primary/40 transition-all duration-200"
                          >
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {typeof profile['interests'] === 'string' && profile['interests'] && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Heart className="h-5 w-5 text-destructive" />
                        Interessi
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile['interests'].split(',').map((interest, index) => (
                          <span
                            key={index}
                            className="px-3 py-2 bg-gradient-to-r from-secondary/80 to-secondary/60 text-secondary-foreground rounded-full text-sm font-medium border border-secondary/30 hover:border-secondary/60 transition-all duration-200 hover:scale-105"
                          >
                            {interest.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(profile['competencies']) && profile['competencies'].length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">Competenze Tecniche</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {profile['competencies'].map((comp, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg border border-blue-500/20 text-sm font-medium"
                          >
                            {String(comp)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(profile['industries']) && profile['industries'].length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3">Settori</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile['industries'].map((industry, index) => (
                          <Badge 
                            key={index} 
                            variant="outline"
                            className="px-3 py-1 border-2 hover:bg-muted/50 transition-colors"
                          >
                            {String(industry)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {renderSocialLinks()}

                  {/* Enhanced Collaboration Section */}
                  {(profile['collaboration_availability'] && profile['collaboration_availability'] !== 'not_available') && (
                    <div className="mb-6 p-4 bg-gradient-to-br from-background to-muted/20 rounded-xl border-2 border-muted/50">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Disponibilità Collaborazioni
                      </h3>
                      <div className="space-y-4">
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 ${
                          profile['collaboration_availability'] === 'available' 
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30' 
                            : profile['collaboration_availability'] === 'busy'
                            ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
                            : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30'
                        }`}>
                          <div className={`w-3 h-3 rounded-full ${
                            profile['collaboration_availability'] === 'available' ? 'bg-green-500' 
                            : profile['collaboration_availability'] === 'busy' ? 'bg-yellow-500'
                            : 'bg-red-500'
                          }`} />
                          <span className="font-bold text-sm">
                            {profile['collaboration_availability'] === 'available' ? '🟢 Disponibile per nuovi progetti' :
                             profile['collaboration_availability'] === 'busy' ? '🟡 Occupato ma valuto proposte' : '🔴 Non Disponibile'}
                          </span>
                        </div>
                        
                        {Array.isArray(profile['collaboration_types']) && profile['collaboration_types'].length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Handshake className="h-4 w-4" />
                              Tipi di collaborazione:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(profile['collaboration_types'] as string[]).map((type, index) => (
                                <div
                                  key={index}
                                  className="px-3 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg border border-blue-500/20 text-xs font-medium"
                                >
                                  {type}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {typeof profile['preferred_work_mode'] === 'string' && profile['preferred_work_mode'] && (
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              Modalità preferita:
                            </p>
                            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
                              (profile['preferred_work_mode'] === 'remote' || profile['preferred_work_mode'] === 'remoto') ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30' :
                              (profile['preferred_work_mode'] === 'hybrid' || profile['preferred_work_mode'] === 'ibrido') ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30' :
                              (profile['preferred_work_mode'] === 'office' || profile['preferred_work_mode'] === 'presenza' || profile['preferred_work_mode'] === 'in_presenza') ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30' :
                              (profile['preferred_work_mode'] === 'flessibile' || profile['preferred_work_mode'] === 'flexible') ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30' :
                              'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30'
                            }`}>
                              <span className="font-medium text-sm">
                                {(profile['preferred_work_mode'] === 'remote' || profile['preferred_work_mode'] === 'remoto') ? '🏠 Remoto' : 
                                 (profile['preferred_work_mode'] === 'hybrid' || profile['preferred_work_mode'] === 'ibrido') ? '🔄 Ibrido' : 
                                 (profile['preferred_work_mode'] === 'office' || profile['preferred_work_mode'] === 'presenza' || profile['preferred_work_mode'] === 'in_presenza') ? '🏢 In presenza' :
                                 (profile['preferred_work_mode'] === 'flessibile' || profile['preferred_work_mode'] === 'flexible') ? '🧩 Flessibile' : String(profile['preferred_work_mode'])}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {typeof profile['collaboration_description'] === 'string' && profile['collaboration_description'] && (
                          <div>
                            <p className="text-sm font-medium mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Note:
                            </p>
                            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg italic">
                              "{profile['collaboration_description']}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-muted-foreground/20">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Membro da
                    </h3>
                    <p className="text-muted-foreground font-medium">
                      {format(new Date(String(profile['created_at'])), 'MMMM yyyy', { locale: it })}
                    </p>
                  </div>

                  {reviews.length > 0 && (
                    <div className="mb-6 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        Valutazione
                      </h3>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          {renderStars(Math.round(averageRating))}
                        </div>
                        <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{averageRating.toFixed(1)}</span>
                        <span className="text-muted-foreground font-medium">({reviews.length} recensioni)</span>
                      </div>
                    </div>
                  )}
                </>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Right Column - Extended Content */}
        {canViewFullProfile && (
          <div className="lg:col-span-2 space-y-6">
            {/* User's Spaces */}
            <Card className="border-2 border-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Spazi di {String(profile['first_name'])}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {spaces.length === 0 ? (
                  <p className="text-muted-foreground">Questo utente non ha ancora pubblicato spazi.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {spaces.map((space) => (
                      <div key={space.id} className="border-2 border-muted/50 rounded-xl p-4 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                        {space.photos && space.photos.length > 0 && (
                          <img 
                            src={space.photos[0]} 
                            alt={space.title}
                            className="w-full h-32 object-cover rounded-lg mb-3"
                          />
                        )}
                        <h3 className="font-semibold mb-2">{space.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{space.description}</p>
                        <div className="flex justify-between items-center mb-2">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">{space.category}</Badge>
                          <p className="font-bold text-green-600 dark:text-green-400">€{space.price_per_day}/giorno</p>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {space.address}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Recensioni ({reviews.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-gray-600">Nessuna recensione disponibile.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.slice(0, 5).map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {renderStars(review.rating)}
                            <span className="text-sm text-gray-500">
                              {format(new Date(review.created_at), 'dd MMM yyyy', { locale: it })}
                            </span>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-700 mb-2">{review.comment}</p>
                        )}
                        {review.reviewer && (
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                              {review.reviewer.profile_photo_url ? (
                                <img 
                                  src={review.reviewer.profile_photo_url} 
                                  alt="Reviewer" 
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-3 h-3 text-gray-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {review.reviewer.first_name} {review.reviewer.last_name}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                    {reviews.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        ... e altre {reviews.length - 5} recensioni
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileView;
