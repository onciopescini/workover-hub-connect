
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserFavorites, removeFromFavorites } from "@/lib/favorites-utils";
import { FavoriteSpace } from "@/lib/favorites-utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Favorites = () => {
  const { authState } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const loadFavorites = async () => {
      setLoading(true);
      const data = await getUserFavorites();
      setFavorites(data);
      setLoading(false);
    };
    
    loadFavorites();
  }, []);

  const handleRemoveFavorite = async (favoriteId: string) => {
    setRemovingId(favoriteId);
    const success = await removeFromFavorites(favoriteId);
    if (success) {
      setFavorites(favorites.filter(fav => fav.favorite_id !== favoriteId));
    }
    setRemovingId(null);
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Please log in to view your favorites</h1>
          <Link to="/login">
            <Button>Log In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Favorites</h1>
        
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-medium text-gray-500 mb-2">No favorites yet</h2>
            <p className="text-gray-400 mb-6">Spaces you favorite will appear here</p>
            <Link to="/">
              <Button>Browse Spaces</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((space) => (
              <Card key={space.favorite_id} className="overflow-hidden h-full flex flex-col">
                <div
                  className="h-48 bg-gray-200 bg-center bg-cover"
                  style={{
                    backgroundImage: space.photos && space.photos.length > 0
                      ? `url(${space.photos[0]})`
                      : "url(/placeholder.svg)",
                  }}
                />
                <CardContent className="pt-4 flex-grow">
                  <div className="flex justify-between items-start">
                    <h2 className="text-xl font-semibold mb-2">{space.title}</h2>
                    <Badge variant="secondary" className="ml-2">
                      ${space.price_per_hour}/hour
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">{space.description}</p>
                  <div className="flex items-center text-gray-500 text-sm mb-3">
                    <MapPin className="w-4 h-4 mr-1" />
                    {space.address}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="outline" className="bg-blue-50">
                      {space.category}
                    </Badge>
                    <Badge variant="outline" className="bg-purple-50">
                      {space.work_environment}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-3 flex justify-between">
                  <Link to={`/spaces/${space.id}`}>
                    <Button variant="secondary">View Details</Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    onClick={() => handleRemoveFavorite(space.favorite_id)}
                    disabled={removingId === space.favorite_id}
                  >
                    {removingId === space.favorite_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Heart className="h-4 w-4 mr-1 fill-current" /> Remove
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
