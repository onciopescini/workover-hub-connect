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
import type { Space } from "@/types/space";
import { CancellationPolicySection } from './CancellationPolicySection';
import type { AvailabilityData } from "@/types/availability";

interface SpaceFormProps {
  initialData?: Space | undefined;
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
    stripeConnected,
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

  const availabilityDataTyped: AvailabilityData = availabilityData;

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
              <Select onValueChange={(value) => handleInputChange("category", value as "home" | "outdoor" | "professional")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" defaultValue={formData['category']} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
              {errors['category'] && <p className="text-red-500 text-sm">{errors['category']}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData['description'] || ""}
              onChange={(e) => handleInputChange("description", e.target.value)}
            />
            {errors['description'] && <p className="text-red-500 text-sm">{errors['description']}</p>}
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
              value={formData['address'] || ""}
              onChange={(address: string, coordinates?: { lat: number; lng: number }) => handleAddressChange(address, coordinates)}
            />
            {errors['address'] && <p className="text-red-500 text-sm">{errors['address']}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="max_capacity">Max Capacity</Label>
              <Input
                type="number"
                id="max_capacity"
                value={formData['max_capacity'] || 1}
                onChange={(e) => handleInputChange("max_capacity", parseInt(e.target.value))}
              />
              {errors['max_capacity'] && <p className="text-red-500 text-sm">{errors['max_capacity']}</p>}
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
                value={formData['price_per_hour'] || 0}
                onChange={(e) => handleInputChange("price_per_hour", parseFloat(e.target.value))}
              />
              {errors['price_per_hour'] && <p className="text-red-500 text-sm">{errors['price_per_hour']}</p>}
            </div>
            <div>
              <Label htmlFor="price_per_day">Price per Day</Label>
              <Input
                type="number"
                id="price_per_day"
                value={formData['price_per_day'] || 0}
                onChange={(e) => handleInputChange("price_per_day", parseFloat(e.target.value))}
              />
              {errors['price_per_day'] && <p className="text-red-500 text-sm">{errors['price_per_day']}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Space Features</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="wifi" className="flex items-center space-x-2">
                <Checkbox
                  id="wifi"
                  checked={Boolean(formData.features?.includes("wifi"))}
                  onCheckedChange={(checked) => handleCheckboxArrayChange("features", "wifi", !!checked)}
                />
                <span>WiFi</span>
              </Label>
            </div>
            <div>
              <Label htmlFor="whiteboard" className="flex items-center space-x-2">
                <Checkbox
                  id="whiteboard"
                  checked={Boolean(formData.features?.includes("whiteboard"))}
                  onCheckedChange={(checked) => handleCheckboxArrayChange("features", "whiteboard", !!checked)}
                />
                <span>Whiteboard</span>
              </Label>
            </div>
            <div>
              <Label htmlFor="monitor" className="flex items-center space-x-2">
                <Checkbox
                  id="monitor"
                  checked={Boolean(formData.features?.includes("monitor"))}
                  onCheckedChange={(checked) => handleCheckboxArrayChange("features", "monitor", !!checked)}
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
            <Select onValueChange={(value) => handleInputChange("work_environment", value as "controlled" | "dynamic" | "silent")}>
              <SelectTrigger>
                <SelectValue placeholder="Select an environment" defaultValue={formData['work_environment']} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="controlled">Controlled</SelectItem>
                <SelectItem value="dynamic">Dynamic</SelectItem>
                <SelectItem value="silent">Silent</SelectItem>
              </SelectContent>
            </Select>
            {errors['work_environment'] && <p className="text-red-500 text-sm">{errors['work_environment']}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <AvailabilityEditor
            availabilityData={availabilityDataTyped}
            onAvailabilityChange={handleAvailabilityChange}
          />
          {errors['availability'] && <p className="text-red-500 text-sm">{errors['availability']}</p>}
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
      
      <Card>
        <CardHeader>
          <CardTitle>Policy e Regole</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <CancellationPolicySection
            cancellationPolicy={(formData['cancellation_policy'] as 'flexible' | 'moderate' | 'strict') || 'moderate'}
            rules={formData['rules'] || ''}
            onInputChange={(field: string, value: unknown) => handleInputChange(field as keyof typeof formData, value as typeof formData[keyof typeof formData])}
            isSubmitting={isSubmitting}
            errors={errors}
          />
        </CardContent>
      </Card>
      
      <PublishingOptions
        published={formData['published'] ?? false}
        onInputChange={(field: string, value: unknown) => handleInputChange(field as keyof typeof formData, value as typeof formData[keyof typeof formData])}
        isSubmitting={isSubmitting}
        stripeOnboardingStatus={stripeOnboardingStatus}
        stripeConnected={stripeConnected}
      />

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
};

export default SpaceForm;
