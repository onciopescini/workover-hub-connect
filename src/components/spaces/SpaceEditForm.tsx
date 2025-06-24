
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

type SpaceCategory = 'home' | 'outdoor' | 'professional';
type WorkEnvironment = 'silent' | 'controlled' | 'dynamic';

interface SpaceEditFormProps {
  title: string;
  description: string;
  address: string;
  category: SpaceCategory;
  workEnvironment: WorkEnvironment;
  pricePerDay: number;
  amenities: string[];
  published: boolean;
  isLoading: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onCategoryChange: (value: SpaceCategory) => void;
  onWorkEnvironmentChange: (value: WorkEnvironment) => void;
  onPricePerDayChange: (value: number) => void;
  onAmenityChange: (amenity: string) => void;
  onPublishedChange: (checked: boolean) => void;
}

export const SpaceEditForm = ({
  title,
  description,
  address,
  category,
  workEnvironment,
  pricePerDay,
  amenities,
  published,
  isLoading,
  onTitleChange,
  onDescriptionChange,
  onAddressChange,
  onCategoryChange,
  onWorkEnvironmentChange,
  onPricePerDayChange,
  onAmenityChange,
  onPublishedChange
}: SpaceEditFormProps) => {
  return (
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
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            type="text"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={onCategoryChange}>
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
          <Select value={workEnvironment} onValueChange={onWorkEnvironmentChange}>
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
            onChange={(e) => onPricePerDayChange(Number(e.target.value))}
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
                    onCheckedChange={() => onAmenityChange('wifi')}
                  />
                  <Label htmlFor="wifi">WiFi</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="coffee"
                    checked={amenities.includes('coffee')}
                    onCheckedChange={() => onAmenityChange('coffee')}
                  />
                  <Label htmlFor="coffee">Coffee</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="printer"
                    checked={amenities.includes('printer')}
                    onCheckedChange={() => onAmenityChange('printer')}
                  />
                  <Label htmlFor="printer">Printer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="meeting_room"
                    checked={amenities.includes('meeting_room')}
                    onCheckedChange={() => onAmenityChange('meeting_room')}
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
            onCheckedChange={onPublishedChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};
