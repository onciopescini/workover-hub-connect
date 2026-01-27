import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminUser } from '@/types/admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import LoadingScreen from '@/components/LoadingScreen';
import { Search, UserX, UserCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const AdminUsers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users_view' as unknown as 'profiles')
        .select('*');

      if (error) throw error;
      // AGGRESSIVE FIX: Cast through unknown
      return data as unknown as AdminUser[];
    }
  });

  const handleToggleStatus = async (userId: string, newStatus: 'active' | 'suspended') => {
    setLoadingUserId(userId);
    try {
      const { error } = await supabase.rpc('admin_toggle_user_status', {
        target_user_id: userId,
        new_status: newStatus
      });

      if (error) throw error;

      toast.success(newStatus === 'suspended' ? 'User suspended' : 'User activated');
      refetch();
    } catch (err: any) {
      toast.error('Error updating status: ' + err.message);
    } finally {
      setLoadingUserId(null);
    }
  };

  const filteredUsers = users?.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading users: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-500 mt-2">Manage all registered users.</p>
        </div>
        <div className="text-sm text-gray-500">
          Total Users: <span className="font-bold text-gray-900">{users?.length || 0}</span>
        </div>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by email or name..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Spaces</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className={user.status === 'suspended' ? 'opacity-50' : ''}>
                      <TableCell className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                        <AvatarFallback>
                          {user.first_name?.[0] ?? (user.email?.[0] ?? '?').toUpperCase()}
                        </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </span>
                          <span className="text-sm text-gray-500">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.status === 'suspended' ? (
                          <Badge variant="destructive" className="gap-1">
                            <UserX className="h-3 w-3" /> Suspended
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                            <UserCheck className="h-3 w-3" /> Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {user.booking_count}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {user.space_count}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.status === 'active' ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleToggleStatus(user.id, 'suspended')}
                            disabled={loadingUserId === user.id}
                          >
                            {loadingUserId === user.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="border-green-600 text-green-600 hover:bg-green-50"
                            size="sm"
                            onClick={() => handleToggleStatus(user.id, 'active')}
                            disabled={loadingUserId === user.id}
                          >
                            {loadingUserId === user.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Activate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;
