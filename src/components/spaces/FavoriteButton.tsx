
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { addToFavorites, isSpaceFavorited } from "@/lib/favorites-utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type FavoriteButtonProps = {
  spaceId: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
  onToggle?: (isFavorite: boolean) => void;
};

const FavoriteButton = ({
  spaceId,
  variant = "outline",
  className = "",
  onToggle
}: FavoriteButtonProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { authState } = useAuth();

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (authState.isAuthenticated && spaceId) {
        const result = await isSpaceFavorited(spaceId);
        setIsFavorite(result);
      }
    };
    
    checkFavoriteStatus();
  }, [spaceId, authState.isAuthenticated]);

  const handleToggleFavorite = async () => {
    if (!authState.isAuthenticated) {
      toast.error("Please log in to save favorites");
      return;
    }

    setIsLoading(true);
    
    if (!isFavorite) {
      const success = await addToFavorites(spaceId);
      if (success) {
        setIsFavorite(true);
        if (onToggle) onToggle(true);
      }
    }
    
    setIsLoading(false);
  };

  return (
    <Button
      variant={variant}
      size="sm"
      className={className}
      disabled={isLoading || isFavorite}
      onClick={handleToggleFavorite}
    >
      <Heart className={`h-4 w-4 mr-1 ${isFavorite ? "fill-current text-red-500" : ""}`} />
      {isFavorite ? "Saved" : "Save"}
    </Button>
  );
};

export default FavoriteButton;
