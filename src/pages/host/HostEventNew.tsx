import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from 'lucide-react';
import { DatePicker } from "@/components/ui/date-picker";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

const HostEventNew = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [capacity, setCapacity] = useState<number | undefined>(undefined);
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authState.isAuthenticated || authState.profile?.role !== 'host') {
      navigate('/login');
    }
  }, [authState.isAuthenticated, authState.profile?.role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description || !category || !location || !startDate || !endDate || !capacity || !price) {
      toast.error('Please fill in all fields.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('events')
        .insert([
          {
            host_id: authState.user?.id,
            title,
            description,
            category,
            location,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            capacity,
            price,
          },
        ]);

      if (error) {
        console.error('Error creating event:', error);
        toast.error('Failed to create event. Please try again.');
      } else {
        toast.success('Event created successfully!');
        navigate('/host/events');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={setCategory} defaultValue={category}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conference">Conference</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="networking">Networking</SelectItem>
                  <SelectItem value="seminar">Seminar</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
            <div className="flex space-x-4">
              <div>
                <Label>Start Date</Label>
                <DatePicker
                  onSelect={setStartDate}
                  defaultMonth={startDate}
                  mode="single"
                  locale={it}
                  required
                />
                {startDate && (
                  <p className="text-sm text-gray-500 mt-1">
                    {format(startDate, 'dd/MM/yyyy', { locale: it })}
                  </p>
                )}
              </div>
              <div>
                <Label>End Date</Label>
                <DatePicker
                  onSelect={setEndDate}
                  defaultMonth={endDate}
                  mode="single"
                  locale={it}
                  required
                />
                {endDate && (
                  <p className="text-sm text-gray-500 mt-1">
                    {format(endDate, 'dd/MM/yyyy', { locale: it })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex space-x-4">
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  type="number"
                  id="capacity"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  type="number"
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  required
                />
              </div>
            </div>
            <Button disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Event'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default HostEventNew;
