import React from 'react';
import { useSpaceForm } from '@/hooks/useSpaceForm';
import { PublishingOptions } from './PublishingOptions';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { AvailabilityEditor } from "@/components/ui/AvailabilityEditor";
import { PhotoUploader } from "@/components/ui/PhotoUploader";

interface SpaceFormProps {
  initialData?: any;
}

const SpaceForm = ({ initialData }: SpaceFormProps) => {
  const {
    formData,
    availabilityData,
    errors,
    photoFiles,
    photoPreviewUrls,
    isSubmitting,
    uploadingPhotos,
    processingJobs,
    stripeOnboardingStatus,
    setUploadingPhotos,
    setProcessingJobs,
    setPhotoFiles,
    setPhotoPreviewUrls,
    handleInputChange,
    handleAddressChange,
    handleAvailabilityChange,
    handleCheckboxArrayChange,
    handleSubmit,
  } = useSpaceForm({ initialData, isEdit: !!initialData });

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                type="text"
                id="title"
                value={formData['title'] || ""}
                onChange={(e) => handleInputChange("title", e.target.value)}
              />
              {errors['title'] && <p className="text-red-500 text-sm">{errors['title']}</p>}
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={(value) => handleInputChange("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" defaultValue={formData.category} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-red-500 text-sm">{errors.category}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleInputChange("description", e.target.value)}
            />
            {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="address">Address</Label>
            <AddressAutocomplete
              onAddressSelected={(address, coordinates) => handleAddressChange(address, coordinates)}
              defaultValue={formData.address || ""}
            />
            {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max_capacity">Max Capacity</Label>
              <Input
                type="number"
                id="max_capacity"
                value={formData.max_capacity || 1}
                onChange={(e) => handleInputChange("max_capacity", parseInt(e.target.value))}
              />
              {errors.max_capacity && <p className="text-red-500 text-sm">{errors.max_capacity}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price_per_hour">Price per Hour</Label>
              <Input
                type="number"
                id="price_per_hour"
                value={formData.price_per_hour || 0}
                onChange={(e) => handleInputChange("price_per_hour", parseFloat(e.target.value))}
              />
              {errors.price_per_hour && <p className="text-red-500 text-sm">{errors.price_per_hour}</p>}
            </div>
            <div>
              <Label htmlFor="price_per_day">Price per Day</Label>
              <Input
                type="number"
                id="price_per_day"
                value={formData.price_per_day || 0}
                onChange={(e) => handleInputChange("price_per_day", parseFloat(e.target.value))}
              />
              {errors.price_per_day && <p className="text-red-500 text-sm">{errors.price_per_day}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Features</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="wifi" className="flex items-center space-x-2">
                <Checkbox
                  id="wifi"
                  checked={formData.workspace_features?.includes("wifi")}
                  onCheckedChange={(checked) => handleCheckboxArrayChange("workspace_features", "wifi", !!checked)}
                />
                <span>WiFi</span>
              </Label>
            </div>
            <div>
              <Label htmlFor="whiteboard" className="flex items-center space-x-2">
                <Checkbox
                  id="whiteboard"
                  checked={formData.workspace_features?.includes("whiteboard")}
                  onCheckedChange={(checked) => handleCheckboxArrayChange("workspace_features", "whiteboard", !!checked)}
                />
                <span>Whiteboard</span>
              </Label>
            </div>
            <div>
              <Label htmlFor="monitor" className="flex items-center space-x-2">
                <Checkbox
                  id="monitor"
                  checked={formData.workspace_features?.includes("monitor")}
                  onCheckedChange={(checked) => handleCheckboxArrayChange("workspace_features", "monitor", !!checked)}
                />
                <span>Monitor</span>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Environment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="work_environment">Work Environment</Label>
            <Select onValueChange={(value) => handleInputChange("work_environment", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an environment" defaultValue={formData.work_environment} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="controlled">Controlled</SelectItem>
                <SelectItem value="collaborative">Collaborative</SelectItem>
                <SelectItem value="open">Open</SelectItem>
              </SelectContent>
            </Select>
            {errors.work_environment && <p className="text-red-500 text-sm">{errors.work_environment}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <AvailabilityEditor
            availabilityData={availabilityData}
            onAvailabilityChange={handleAvailabilityChange}
          />
          {errors.availability && <p className="text-red-500 text-sm">{errors.availability}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <PhotoUploader
            photoFiles={photoFiles}
            photoPreviewUrls={photoPreviewUrls}
            setPhotoFiles={setPhotoFiles}
            setPhotoPreviewUrls={setPhotoPreviewUrls}
            uploadingPhotos={uploadingPhotos}
            setUploadingPhotos={setUploadingPhotos}
            processingJobs={processingJobs}
            setProcessingJobs={setProcessingJobs}
          />
        </CardContent>
      </Card>
      
      <PublishingOptions
        published={formData.published}
        onInputChange={handleInputChange}
        isSubmitting={isSubmitting}
        stripeOnboardingStatus={stripeOnboardingStatus}
      />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
};

export default SpaceForm;
