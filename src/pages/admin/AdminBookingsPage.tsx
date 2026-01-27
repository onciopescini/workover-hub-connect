import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, Filter, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import { AdminBooking } from '@/types/admin';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { mapAdminBookingRecord } from '@/lib/admin-mappers';
import { formatCurrency } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const AdminBookingsPage = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data: bookings, isLoading, error } = useQuery({
    queryKey: ['admin_bookings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_bookings');

      if (error) {
        throw error;
      }

      return (data || [])
        .map((item) => mapAdminBookingRecord(item))
        .filter((item): item is AdminBooking => item !== null);
    },
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">
        <h3 className="text-lg font-bold mb-2">Error Loading Bookings</h3>
        <p>There was a problem fetching the bookings registry. Please try again later.</p>
        <p className="text-sm mt-4 text-gray-500">{String(error)}</p>
      </div>
    );
  }

  // Client-side filtering
  const filteredBookings = bookings?.filter((booking) => {
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (booking.coworker_name?.toLowerCase() || '').includes(searchLower) ||
      (booking.coworker_email?.toLowerCase() || '').includes(searchLower) ||
      (booking.space_name?.toLowerCase() || '').includes(searchLower) ||
      (booking.host_name?.toLowerCase() || '').includes(searchLower) ||
      booking.booking_id.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  }) || [];

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'checked_in':
      case 'served':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'cancelled':
      case 'refunded':
      case 'disputed':
      case 'frozen':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'pending':
      case 'pending_approval':
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  // formatCurrency imported from @/lib/format - use { cents: true } for Stripe amounts

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings Registry</h1>
          <p className="text-gray-500 mt-1">Manage and oversee all platform bookings.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Placeholder for export actions */}
        </div>
      </header>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by name, email, space..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-semibold">
            All Bookings ({filteredBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Coworker</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                      No bookings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => (
                    <TableRow key={booking.booking_id}>
                      {/* Date */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {format(new Date(booking.check_in_date), 'dd MMM yyyy', { locale: it })}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 pl-6">
                          {format(new Date(booking.check_in_date), 'HH:mm')} - {format(new Date(booking.check_out_date), 'HH:mm')}
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 line-clamp-1">
                            {booking.space_name}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            <span>{booking.host_name}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Coworker */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={booking.coworker_avatar_url || ''} />
                            <AvatarFallback>
                              {booking.coworker_name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{booking.coworker_name || 'Unknown User'}</span>
                            <span className="text-xs text-gray-500">{booking.coworker_email}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell>
                        <span className="font-mono font-medium">
                          {formatCurrency(booking.total_price, { cents: true })}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant="secondary" className={`${getStatusBadgeColor(booking.status)} capitalize`}>
                          {booking.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBookingsPage;
