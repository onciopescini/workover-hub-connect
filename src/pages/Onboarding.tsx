import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Home, Users, Upload, Loader2, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";
import { supabase } from "@/integrations/supabase/client";
import { isValidLinkedInUrl } from "@/lib/auth-utils";

const Onboarding = () => {
  const { authState, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    profilePhoto: null as File | null,
    linkedinUrl: "",
    bio: "",
    networkingEnabled: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Debug logging
  useEffect(() => {
    console.log("🟢 Onboarding component state:", {
      isLoading: authState.isLoading,
      hasUser: !!authState.user,
      hasProfile: !!authState.profile,
      userRole: authState.profile?.role,
      onboardingCompleted: authState.profile?.onboarding_completed,
      currentUserRole: userRole
    });
  }, [authState, userRole]);

  // Handle admin users - they should go directly to admin panel
  useEffect(() => {
    if (!authState.isLoading && authState.user && authState.profile?.role === 'admin') {
      console.log("🟡 Admin detected, redirecting to /admin");
      navigate('/admin', { replace: true });
    }
  }, [authState.isLoading, authState.user, authState.profile?.role, navigate]);

  console.log("🟢 Rendering onboarding form");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (formData.linkedinUrl && !isValidLinkedInUrl(formData.linkedinUrl)) {
      newErrors.linkedinUrl = "Please enter a valid LinkedIn URL";
    }

    if (!userRole) {
      newErrors.role = "Please select a role";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, profilePhoto: file }));
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const uploadProfilePhoto = async (userId: string): Promise<string | null> => {
    if (!formData.profilePhoto) return null;

    try {
      setIsUploading(true);
      const fileExt = formData.profilePhoto.name.split('.').pop();
      const fileName = `${userId}/profile-photo-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload the file
      const { error: uploadError, data } = await supabase.storage
        .from('profile_photos')
        .upload(filePath, formData.profilePhoto, {
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile_photos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!authState.user) {
      setErrors({ submit: "You must be logged in to complete onboarding" });
      return;
    }

    setIsSubmitting(true);

    try {
      let profilePhotoUrl = null;
      
      if (formData.profilePhoto) {
        profilePhotoUrl = await uploadProfilePhoto(authState.user.id);
      }

      // Update the user's profile
      await updateProfile({
        role: userRole as UserRole,
        first_name: formData.firstName,
        last_name: formData.lastName,
        nickname: formData.nickname || null,
        profile_photo_url: profilePhotoUrl,
        linkedin_url: formData.linkedinUrl || null,
        bio: userRole === "coworker" ? formData.bio || null : null,
        networking_enabled: userRole === "coworker" ? formData.networkingEnabled : null,
        onboarding_completed: true,
      });

      // Redirect based on user role
      let destination = '/dashboard';
      switch (userRole) {
        case 'admin':
          destination = '/admin';
          break;
        case 'host':
          destination = '/host/dashboard';
          break;
        case 'coworker':
          destination = '/dashboard';
          break;
        default:
          destination = '/dashboard';
      }
      navigate(destination);
    } catch (error: any) {
      console.error("Onboarding error:", error);
      setErrors({
        submit: error.message || "An error occurred while completing onboarding",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">W</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Workover</span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Tell us about yourself to help us customize your experience</p>
        </div>

        <Card className="shadow-lg border-0 mb-6">
          <CardHeader>
            <CardTitle className="text-xl">1. Choose Your Role</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Select how you'll primarily use Workover. This cannot be changed later.
              </p>
              
              <RadioGroup
                value={userRole || ""}
                onValueChange={(value) => setUserRole(value as "host" | "coworker")}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"
              >
                <div>
                  <RadioGroupItem
                    id="coworker"
                    value="coworker"
                    className="sr-only peer"
                  />
                  <Label
                    htmlFor="coworker"
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      userRole === "coworker"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500"
                    }`}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium mb-1 flex items-center">
                        Coworker
                        {userRole === "coworker" && (
                          <Check className="w-4 h-4 text-blue-500 ml-2" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        I'm looking for spaces to work and want to connect with
                        like-minded professionals
                      </p>
                    </div>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem
                    id="host"
                    value="host"
                    className="sr-only peer"
                  />
                  <Label
                    htmlFor="host"
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      userRole === "host"
                        ? "border-orange-400 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-400"
                    }`}
                  >
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mr-4">
                      <Home className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <div className="font-medium mb-1 flex items-center">
                        Host
                        {userRole === "host" && (
                          <Check className="w-4 h-4 text-orange-500 ml-2" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        I have space to share and want to earn income while
                        building community
                      </p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
              
              {errors.role && (
                <p className="text-sm text-red-500 mt-1">{errors.role}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-xl">2. Personal Details</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md mb-4 text-sm">
                  {errors.submit}
                </div>
              )}
              
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-full md:w-1/3 flex flex-col items-center">
                  <div className="mb-2 text-center">
                    <p className="text-gray-700 font-medium mb-2">Profile Photo</p>
                    <Avatar className="w-28 h-28 mx-auto mb-3 border-2 border-gray-200">
                      {previewUrl ? (
                        <AvatarImage src={previewUrl} alt="Profile preview" />
                      ) : (
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-xl uppercase">
                          {formData.firstName && formData.lastName
                            ? `${formData.firstName[0]}${formData.lastName[0]}`
                            : "?"}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    {isUploading && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                        <div
                          className="bg-blue-500 h-2.5 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                        <p className="text-xs text-gray-500 text-center">{uploadProgress}%</p>
                      </div>
                    )}
                    
                    <label className="cursor-pointer">
                      <div className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isSubmitting || isUploading}
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Recommended: Square, at least 300x300px
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-2/3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.firstName && (
                        <p className="text-sm text-red-500">{errors.firstName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-red-500">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nickname">
                      Nickname <span className="text-gray-400">(Optional)</span>
                    </Label>
                    <Input
                      id="nickname"
                      placeholder="How you'd like to be called"
                      value={formData.nickname}
                      onChange={(e) => handleInputChange("nickname", e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">
                      LinkedIn URL <span className="text-gray-400">(Optional)</span>
                    </Label>
                    <Input
                      id="linkedinUrl"
                      placeholder="https://linkedin.com/in/yourprofile"
                      value={formData.linkedinUrl}
                      onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.linkedinUrl && (
                      <p className="text-sm text-red-500">{errors.linkedinUrl}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Add your LinkedIn profile to help build trust in the community
                    </p>
                  </div>

                  {userRole === "coworker" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="bio">
                          Bio <span className="text-gray-400">(Optional)</span>
                        </Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell the community a bit about yourself..."
                          value={formData.bio}
                          onChange={(e) => handleInputChange("bio", e.target.value)}
                          className="min-h-[100px]"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="networkingEnabled">
                            Enable Networking
                          </Label>
                          <p className="text-sm text-gray-500">
                            Allow other coworkers to connect with you
                          </p>
                        </div>
                        <Switch
                          id="networkingEnabled"
                          checked={formData.networkingEnabled}
                          onCheckedChange={(checked) =>
                            handleInputChange("networkingEnabled", checked)
                          }
                          disabled={isSubmitting}
                        />
                      </div>
                    </>
                  )}

                  {userRole === "host" && (
                    <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                      <h4 className="font-medium text-amber-800 mb-1">Host Setup</h4>
                      <p className="text-sm text-amber-700">
                        After completing your profile, you'll be guided to set up your
                        payment details and create your first space listing.
                      </p>
                    </div>
                  )}

                  <div className="pt-6 flex items-center justify-between">
                    <Badge variant="outline" className="text-gray-500 border-gray-300">
                      {userRole === "host" ? "Host Account" : userRole === "coworker" ? "Coworker Account" : "Select a role"}
                    </Badge>
                    <Button
                      type="submit"
                      className="px-6 bg-blue-500 hover:bg-blue-600"
                      disabled={isSubmitting || isUploading}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Complete Profile"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
