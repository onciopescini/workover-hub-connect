
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Space } from "@/types/space";
import { AppLayout } from "@/components/layout/AppLayout";

const SpaceEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [space, setSpace] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [workEnvironment, setWorkEnvironment] = useState('');
  const [pricePerDay, setPricePerDay] = useState(0);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    const fetchSpace = async () => {
      setIsLoading(true);
      try {
        if (!id) {
          console.error("Space ID is missing");
          return;
        }

        const { data, error } = await supabase
          .from('spaces')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error("Error fetching space:", error);
          toast.error("Failed to load space details.");
          return;
        }

        if (data) {
          setSpace(data);
          setTitle(data.title);
          setDescription(data.description);
          setAddress(data.address);
          setCategory(data.category);
          setWorkEnvironment(data.work_environment);
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
      console.error("Space ID is missing");
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
        console.error("Error updating space:", error);
        toast.error("Failed to update space.");
        return;
      }

      toast.success("Space updated successfully!");
      navigate('/spaces/manage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSpace = async () => {
    if (!id) {
      console.error("Space ID is missing");
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting space:", error);
        toast.error("Failed to delete space.");
        return;
      }

      toast.success("Space deleted successfully!");
      navigate('/spaces/manage');
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

  if (isLoading) {
    return (
      <AppLayout title="Edit Space">
        <div className="min-h-screen flex items-center justify-center">
          <Card>
            <CardContent className="p-8">
              Loading space details...
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!space) {
    return (
      <AppLayout title="Edit Space">
        <div className="min-h-screen flex items-center justify-center">
          <Card>
            <CardContent className="p-8">
              Space not found.
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Edit Space">
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Space</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="workEnvironment">Work Environment</Label>
              <Select value={workEnvironment} onValueChange={setWorkEnvironment}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select work environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="silent">Silent</SelectItem>
                  <SelectItem value="controlled">Controlled</SelectItem>
                  <SelectItem value="dynamic">Dynamic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pricePerDay">Price per Day</Label>
              <Input
                id="pricePerDay"
                type="number"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Amenities</Label>
              <ScrollArea className="h-40 w-full rounded-md border">
                <div className="p-4">
                  <div className="grid gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="wifi"
                        checked={amenities.includes('wifi')}
                        onCheckedChange={() => handleAmenityChange('wifi')}
                      />
                      <Label htmlFor="wifi">WiFi</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="coffee"
                        checked={amenities.includes('coffee')}
                        onCheckedChange={() => handleAmenityChange('coffee')}
                      />
                      <Label htmlFor="coffee">Coffee</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="printer"
                        checked={amenities.includes('printer')}
                        onCheckedChange={() => handleAmenityChange('printer')}
                      />
                      <Label htmlFor="printer">Printer</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="meeting_room"
                        checked={amenities.includes('meeting_room')}
                        onCheckedChange={() => handleAmenityChange('meeting_room')}
                      />
                      <Label htmlFor="meeting_room">Meeting Room</Label>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
            <div>
              <Label htmlFor="published">Published</Label>
              <Switch
                id="published"
                checked={published}
                onCheckedChange={(checked) => setPublished(checked)}
              />
            </div>
            <div className="flex justify-between">
              <Button variant="default" onClick={handleUpdateSpace} disabled={isLoading}>
                Update Space
              </Button>
              <Button variant="destructive" onClick={handleDeleteSpace} disabled={isLoading}>
                Delete Space
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SpaceEdit;
