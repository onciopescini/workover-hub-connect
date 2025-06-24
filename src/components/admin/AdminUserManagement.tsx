
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, UserCheck, UserX, Search, Mail, Calendar, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  phone: string | null;
  city: string | null;
  profession: string | null;
  competencies: string[] | null;
  industries: string[] | null;
  is_suspended: boolean;
  suspension_reason: string | null;
}

const AdminUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { authState } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to fetch users');
        return;
      }

      if (data) {
        const usersWithParsedData = data.map(user => ({
          ...user,
          competencies: user.competencies ? (Array.isArray(user.competencies) ? user.competencies : JSON.parse(user.competencies)) : [],
          industries: user.industries ? (Array.isArray(user.industries) ? user.industries : JSON.parse(user.industries)) : [],
        })) as User[];
        setUsers(usersWithParsedData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  const filteredUsers = users.filter(user => {
    const searchTerm = searchQuery.toLowerCase();
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    return fullName.includes(searchTerm);
  }).filter(user => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return !user.is_suspended;
    if (activeTab === 'inactive') return user.is_suspended;
    return true;
  });

  const handleActivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: false })
        .eq('id', userId);

      if (error) {
        console.error('Error activating user:', error);
        toast.error('Failed to activate user');
        return;
      }

      setUsers(users.map(user =>
        user.id === userId ? { ...user, is_suspended: false } : user
      ));
      toast.success('User activated successfully');
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Failed to activate user');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: true })
        .eq('id', userId);

      if (error) {
        console.error('Error deactivating user:', error);
        toast.error('Failed to deactivate user');
        return;
      }

      setUsers(users.map(user =>
        user.id === userId ? { ...user, is_suspended: true } : user
      ));
      toast.success('User deactivated successfully');
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Failed to deactivate user');
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId);

      if (error) {
        console.error('Error promoting user to admin:', error);
        toast.error('Failed to promote user to admin');
        return;
      }

      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: 'admin' } : user
      ));
      toast.success('User promoted to admin successfully');
    } catch (error) {
      console.error('Error promoting user to admin:', error);
      toast.error('Failed to promote user to admin');
    }
  };

  const handleDemoteFromAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'coworker' })
        .eq('id', userId);

      if (error) {
        console.error('Error demoting user from admin:', error);
        toast.error('Failed to demote user from admin');
        return;
      }

      setUsers(users.map(user =>
        user.id === userId ? { ...user, role: 'coworker' } : user
      ));
      toast.success('User demoted from admin successfully');
    } catch (error) {
      console.error('Error demoting user from admin:', error);
      toast.error('Failed to demote user from admin');
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Gestione Utenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Input
              type="text"
              placeholder="Cerca utenti..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all" onClick={() => setActiveTab('all')}>Tutti</TabsTrigger>
                <TabsTrigger value="active" onClick={() => setActiveTab('active')}>Attivi</TabsTrigger>
                <TabsTrigger value="inactive" onClick={() => setActiveTab('inactive')}>Sospesi</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <UserList
                  users={filteredUsers}
                  onActivateUser={handleActivateUser}
                  onDeactivateUser={handleDeactivateUser}
                  onPromoteToAdmin={handlePromoteToAdmin}
                  onDemoteFromAdmin={handleDemoteFromAdmin}
                  getInitials={getInitials}
                />
              </TabsContent>
              <TabsContent value="active">
                <UserList
                  users={filteredUsers}
                  onActivateUser={handleActivateUser}
                  onDeactivateUser={handleDeactivateUser}
                  onPromoteToAdmin={handlePromoteToAdmin}
                  onDemoteFromAdmin={handleDemoteFromAdmin}
                  getInitials={getInitials}
                />
              </TabsContent>
              <TabsContent value="inactive">
                <UserList
                  users={filteredUsers}
                  onActivateUser={handleActivateUser}
                  onDeactivateUser={handleDeactivateUser}
                  onPromoteToAdmin={handlePromoteToAdmin}
                  onDemoteFromAdmin={handleDemoteFromAdmin}
                  getInitials={getInitials}
                />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface UserListProps {
  users: User[];
  onActivateUser: (userId: string) => void;
  onDeactivateUser: (userId: string) => void;
  onPromoteToAdmin: (userId: string) => void;
  onDemoteFromAdmin: (userId: string) => void;
  getInitials: (firstName: string, lastName: string) => string;
}

const UserList: React.FC<UserListProps> = ({
  users,
  onActivateUser,
  onDeactivateUser,
  onPromoteToAdmin,
  onDemoteFromAdmin,
  getInitials
}) => {
  return (
    <div className="grid gap-4">
      {users.map(user => (
        <Card key={user.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={user.profile_photo_url || undefined} />
                <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-medium">{user.first_name} {user.last_name}</div>
                <div className="text-xs text-gray-500">{user.profession || 'No profession'}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {user.role === 'admin' ? (
                <Badge variant="secondary">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              ) : (
                <Badge variant="outline">
                  <UserCheck className="w-3 h-3 mr-1" />
                  Coworker
                </Badge>
              )}
              {user.is_suspended && (
                <Badge variant="destructive">
                  <UserX className="w-3 h-3 mr-1" />
                  Sospeso
                </Badge>
              )}
            </div>
            <div className="flex space-x-2">
              {user.is_suspended ? (
                <Button size="sm" onClick={() => onActivateUser(user.id)}>
                  Attiva
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => onDeactivateUser(user.id)}>
                  Sospendi
                </Button>
              )}
              {user.role === 'admin' ? (
                <Button variant="ghost" size="sm" onClick={() => onDemoteFromAdmin(user.id)}>
                  Demansiona
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => onPromoteToAdmin(user.id)}>
                  Promuovi
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminUserManagement;
