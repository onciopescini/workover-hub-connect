import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const Onboarding = () => {
  const navigate = useNavigate();
  const { authState, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authState.profile) {
      setFirstName(authState.profile.first_name || '');
      setLastName(authState.profile.last_name || '');
      setRole(authState.profile.role || '');
      setBio(authState.profile.bio || '');
    }
  }, [authState.profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName || !lastName || !role) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        role: role,
        bio: bio,
        onboarding_completed: true,
      });
      toast.success('Onboarding completed!');
      
      // Redirect based on role
      if (role === 'admin') {
        navigate('/admin/users');
      } else if (role === 'host') {
        navigate('/host/dashboard');
      } else {
        navigate('/spaces');
      }
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error(error.message || 'Failed to complete onboarding.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!authState.user) {
    return <p>Not authenticated. Please log in.</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex items-center justify-center">
      <div className="max-w-md w-full p-6 bg-white rounded-md shadow-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Complete Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coworker">Coworker</SelectItem>
                    <SelectItem value="host">Host</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself"
                />
              </div>
              <Button disabled={isLoading} className="w-full">
                {isLoading ? 'Submitting...' : 'Submit'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
