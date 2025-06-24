
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, User, Calendar, MessageSquare } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
  bio?: string;
  location?: string;
  profession?: string;
  created_at: string;
}

interface UserSpace {
  id: string;
  title: string;
  description: string;
  category: string;
  price_per_day: number;
  photos: string[];
  city?: string; // Made optional to handle missing data
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
  };
}

interface PrivateChat {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  created_at: string;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [spaces, setSpaces] = useState<UserSpace[]>([]);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      setProfile(profileData);

      // Fetch user's spaces with safe type handling
      const { data: spacesData, error: spacesError } = await supabase
        .from('spaces')
        .select('*')
        .eq('host_id', userId)
        .eq('published', true);

      if (spacesError) {
        console.error('Error fetching spaces:', spacesError);
      } else {
        // Transform data to match UserSpace interface, adding city as optional
        const transformedSpaces = (spacesData || []).map(space => ({
          ...space,
          city: space.city || undefined // Handle missing city gracefully
        }));
        setSpaces(transformedSpaces);
      }

      // Fetch user's reviews with correct foreign key hints
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey (
            first_name,
            last_name,
            profile_photo_url
          )
        `)
        .eq('reviewee_id', userId);

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
      } else {
        setReviews(reviewsData || []);
      }

    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startPrivateChat = async () => {
    if (!userId) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('private_chats')
        .select('id')
        .or(`and(participant_1_id.eq.${user.user.id},participant_2_id.eq.${userId}),and(participant_1_id.eq.${userId},participant_2_id.eq.${user.user.id})`)
        .maybeSingle();

      if (existingChat) {
        // Redirect to existing chat
        window.location.href = `/messages/private/${existingChat.id}`;
        return;
      }

      // Create new chat with correct column names
      const { data: newChat, error } = await supabase
        .from('private_chats')
        .insert({
          participant_1_id: user.user.id,
          participant_2_id: userId
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating chat:', error);
        return;
      }

      // Redirect to new chat
      window.location.href = `/messages/private/${newChat.id}`;
    } catch (error) {
      console.error('Error starting private chat:', error);
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

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-xl font-bold mb-2">Profilo non trovato</h1>
            <p>L'utente che stai cercando non esiste.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const averageRating = calculateAverageRating();

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                  {profile.profile_photo_url ? (
                    <img 
                      src={profile.profile_photo_url} 
                      alt="Profile" 
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <div>
                  <CardTitle>{profile.first_name} {profile.last_name}</CardTitle>
                  {profile.profession && (
                    <p className="text-gray-600">{profile.profession}</p>
                  )}
                  {profile.location && (
                    <p className="text-sm text-gray-500">{profile.location}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {profile.bio && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Bio</h3>
                  <p className="text-gray-700">{profile.bio}</p>
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Membro da</h3>
                <p className="text-gray-600">
                  {format(new Date(profile.created_at), 'MMMM yyyy', { locale: it })}
                </p>
              </div>

              {reviews.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Valutazione</h3>
                  <div className="flex items-center space-x-2">
                    {renderStars(Math.round(averageRating))}
                    <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
                    <span className="text-gray-500">({reviews.length} recensioni)</span>
                  </div>
                </div>
              )}

              <button
                onClick={startPrivateChat}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Invia Messaggio</span>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* User Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User's Spaces */}
          <Card>
            <CardHeader>
              <CardTitle>Spazi di {profile.first_name}</CardTitle>
            </CardHeader>
            <CardContent>
              {spaces.length === 0 ? (
                <p className="text-gray-600">Questo utente non ha ancora pubblicato spazi.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {spaces.map((space) => (
                    <div key={space.id} className="border rounded-lg p-4">
                      {space.photos && space.photos.length > 0 && (
                        <img 
                          src={space.photos[0]} 
                          alt={space.title}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                      )}
                      <h3 className="font-semibold mb-2">{space.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{space.description}</p>
                      <Badge variant="secondary" className="mb-2">{space.category}</Badge>
                      {space.city && (
                        <p className="text-sm text-gray-500 mb-2">{space.city}</p>
                      )}
                      <p className="font-semibold">€{space.price_per_day}/giorno</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle>Recensioni</CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-gray-600">Nessuna recensione disponibile.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
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
                        <p className="text-sm text-gray-500">
                          da {review.reviewer.first_name} {review.reviewer.last_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
