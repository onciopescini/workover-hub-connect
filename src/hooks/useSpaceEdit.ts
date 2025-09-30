
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Space } from "@/types/space";
import { sreLogger } from '@/lib/sre-logger';

type SpaceCategory = 'home' | 'outdoor' | 'professional';
type WorkEnvironment = 'silent' | 'controlled' | 'dynamic';

export const useSpaceEdit = (id: string | undefined) => {
  const navigate = useNavigate();
  const [space, setSpace] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState<SpaceCategory>('home');
  const [workEnvironment, setWorkEnvironment] = useState<WorkEnvironment>('silent');
  const [pricePerDay, setPricePerDay] = useState(0);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [published, setPublished] = useState(false);

  // Type guard functions
  const isValidCategory = (value: any): value is SpaceCategory => {
    return ['home', 'outdoor', 'professional'].includes(value);
  };

  const isValidWorkEnvironment = (value: any): value is WorkEnvironment => {
    return ['silent', 'controlled', 'dynamic'].includes(value);
  };

  useEffect(() => {
    const fetchSpace = async () => {
      setIsLoading(true);
      try {
        if (!id) {
          sreLogger.error("Space ID is missing", {});
          return;
        }

        const { data, error } = await supabase
          .from('spaces')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          sreLogger.error("Error fetching space", { spaceId: id }, error as Error);
          toast.error("Failed to load space details.");
          return;
        }

        if (data) {
          setSpace(data);
          setTitle(data.title);
          setDescription(data.description);
          setAddress(data.address);
          setCategory(isValidCategory(data.category) ? data.category : 'home');
          setWorkEnvironment(isValidWorkEnvironment(data.work_environment) ? data.work_environment : 'silent');
          setPricePerDay(data.price_per_day);
          setAmenities(data.amenities || []);
          setPublished(data.published);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchSpace();
    }
  }, [id]);

  const handleUpdateSpace = async () => {
    if (!id) {
      sreLogger.error("Space ID is missing for update", {});
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('spaces')
        .update({
          title,
          description,
          address,
          category,
          work_environment: workEnvironment,
          price_per_day: pricePerDay,
          amenities,
          published,
        })
        .eq('id', id);

      if (error) {
        sreLogger.error("Error updating space", { spaceId: id }, error as Error);
        toast.error("Failed to update space.");
        return;
      }

      toast.success("Space updated successfully!");
      navigate('/host/spaces');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSpace = async () => {
    if (!id) {
      sreLogger.error("Space ID is missing for delete", {});
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', id);

      if (error) {
        sreLogger.error("Error deleting space", { spaceId: id }, error as Error);
        toast.error("Failed to delete space.");
        return;
      }

      toast.success("Space deleted successfully!");
      navigate('/host/spaces');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmenityChange = (amenity: string) => {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter(a => a !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  };

  return {
    space,
    isLoading,
    title,
    description,
    address,
    category,
    workEnvironment,
    pricePerDay,
    amenities,
    published,
    setTitle,
    setDescription,
    setAddress,
    setCategory,
    setWorkEnvironment,
    setPricePerDay,
    setPublished,
    handleUpdateSpace,
    handleDeleteSpace,
    handleAmenityChange
  };
};
