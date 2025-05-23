import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";
import { supabase } from "@/integrations/supabase/client";
import { isValidLinkedInUrl } from "@/lib/auth-utils";
import { Loader2, Upload, X, Users, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Onboarding = () => {
  const { authState, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    profilePhoto: null as File | null,
    linkedinUrl: "",
    bio: "",
    networkingEnabled: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // If user already selected a role during signup, use that
  useEffect(() => {
    if (authState.profile?.role) {
      setUserRole(authState.profile.role as UserRole);
    }
  }, [authState.profile]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!userRole) {
      newErrors.role = "Please select your role";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (formData.linkedinUrl && !isValidLinkedInUrl(formData.linkedinUrl)) {
      newErrors.linkedinUrl = "Please enter a valid LinkedIn URL";
    }

    if (userRole === "coworker" && formData.bio && formData.bio.length > 500) {
      newErrors.bio = "Bio must be 500 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, profilePhoto: "File size must be less than 5MB" }));
        return;
      }

      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, profilePhoto: "Please select an image file" }));
        return;
      }

      setFormData(prev => ({ ...prev, profilePhoto: file }));
      setErrors(prev => ({ ...prev, profilePhoto: "" }));

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, profilePhoto: null }));
    setPreviewUrl(null);
    setErrors(prev => ({ ...prev, profilePhoto: "" }));
  };

  const uploadProfilePhoto = async (userId: string): Promise<string | null> => {
    if (!formData.profilePhoto) return null;

    try {
      const fileExt = formData.profilePhoto.name.split('.').pop();
      const fileName = `${userId}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, formData.profilePhoto, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw new Error('Failed to upload profile photo');
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

      // Centralized redirect logic will handle the routing
      toast({
        title: "Welcome!",
        description: "Your profile has been set up successfully.",
      });
      
    } catch (error: any) {
      console.error("Onboarding error:", error);
      setErrors({
        submit: error.message || "An error occurred while completing onboarding",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Complete Your Profile
            </CardTitle>
            <CardDescription>
              Let's set up your account to get you started
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              {!userRole && (
                <div className="space-y-4">
                  <Label className="text-base font-medium">I am a...</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setUserRole("coworker")}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <Users className="w-6 h-6 text-blue-600" />
                        <div>
                          <div className="font-medium">Coworker</div>
                          <div className="text-sm text-gray-500">
                            Looking for spaces to work
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUserRole("host")}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <Building className="w-6 h-6 text-green-600" />
                        <div>
                          <div className="font-medium">Host</div>
                          <div className="text-sm text-gray-500">
                            Offering spaces to others
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                  {errors.role && (
                    <p className="text-red-600 text-sm">{errors.role}</p>
                  )}
                </div>
              )}

              {userRole && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800">
                    Great! You're signing up as a{" "}
                    <span className="font-semibold">{userRole}</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setUserRole(null)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Change role
                  </button>
                </div>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    placeholder="Your first name"
                  />
                  {errors.firstName && (
                    <p className="text-red-600 text-sm">{errors.firstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    placeholder="Your last name"
                  />
                  {errors.lastName && (
                    <p className="text-red-600 text-sm">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname (Optional)</Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nickname: e.target.value }))
                  }
                  placeholder="How would you like to be called?"
                />
              </div>

              {/* Profile Photo */}
              <div className="space-y-2">
                <Label>Profile Photo (Optional)</Label>
                <div className="flex items-center space-x-4">
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Profile preview"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <label htmlFor="profilePhoto" className="cursor-pointer">
                      <div className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Choose Photo
                      </div>
                      <input
                        id="profilePhoto"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Max 5MB, JPG/PNG
                    </p>
                  </div>
                </div>
                {errors.profilePhoto && (
                  <p className="text-red-600 text-sm">{errors.profilePhoto}</p>
                )}
              </div>

              {/* LinkedIn URL */}
              <div className="space-y-2">
                <Label htmlFor="linkedinUrl">LinkedIn URL (Optional)</Label>
                <Input
                  id="linkedinUrl"
                  value={formData.linkedinUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, linkedinUrl: e.target.value }))
                  }
                  placeholder="https://linkedin.com/in/yourprofile"
                />
                {errors.linkedinUrl && (
                  <p className="text-red-600 text-sm">{errors.linkedinUrl}</p>
                )}
              </div>

              {/* Coworker-specific fields */}
              {userRole === "coworker" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio (Optional)</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, bio: e.target.value }))
                      }
                      placeholder="Tell us about yourself..."
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500">
                      {formData.bio.length}/500 characters
                    </p>
                    {errors.bio && (
                      <p className="text-red-600 text-sm">{errors.bio}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="networking"
                      checked={formData.networkingEnabled}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          networkingEnabled: !!checked,
                        }))
                      }
                    />
                    <Label htmlFor="networking" className="text-sm">
                      Enable networking features (connect with other coworkers)
                    </Label>
                  </div>
                </>
              )}

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{errors.submit}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !userRole}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up your profile...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
