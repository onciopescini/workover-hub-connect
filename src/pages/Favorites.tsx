import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Link } from 'react-router-dom';
import { getFavoriteSpaces } from '@/lib/favorites-utils';

const Favorites = () => {
  const { authState } = useAuth();
  const [favoriteSpaces, setFavoriteSpaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFavoriteSpaces = async () => {
      if (authState.isAuthenticated) {
        setIsLoading(true);
        const spaces = await getFavoriteSpaces();
        setFavoriteSpaces(spaces);
        setIsLoading(false);
      } else {
        setFavoriteSpaces([]);
        setIsLoading(false);
      }
    };

    loadFavoriteSpaces();
  }, [authState.isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <CardTitle className="text-lg font-semibold">Loading...</CardTitle>
            <p>Fetching your favorite spaces.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <CardTitle className="text-lg font-semibold">Please log in</CardTitle>
            <p>You need to log in to see your favorite spaces.</p>
            <Button asChild>
              <Link to="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Your Favorite Spaces</CardTitle>
        </CardHeader>
        <CardContent>
          {favoriteSpaces.length === 0 ? (
            <p>You have not saved any spaces as favorites yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteSpaces.map((space) => (
                <Card key={space.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{space.title}</h3>
                        <p className="text-sm text-gray-500">{space.city}, {space.country}</p>
                      </div>
                      <Heart className="text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Favorites;
