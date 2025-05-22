
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PlusCircle, Layout, Calendar, CheckCircle, XCircle, Loader2, MapPin, User } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import { Space } from "@/types/space";
import { BookingWithDetails, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from "@/types/booking";

const HostDashboard = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [processingBooking, setProcessingBooking] = useState<string | null>(null);

  // Redirect coworkers to their dashboard
  useEffect(() => {
    if (authState.profile?.role === "coworker") {
      navigate("/dashboard", { replace: true });
    }
  }, [authState.profile, navigate]);

  // Fetch host data
  useEffect(() => {
    const fetchHostData = async () => {
      if (!authState.user) return;

      try {
        // Fetch host spaces
        const { data: spacesData, error: spacesError } = await supabase
          .from("spaces")
          .select("*")
          .eq("host_id", authState.user.id)
          .order("created_at", { ascending: false });

        if (spacesError) throw spacesError;
        setSpaces(spacesData || []);

        // Fetch bookings for those spaces
        if (spacesData && spacesData.length > 0) {
          const spaceIds = spacesData.map(space => space.id);
          
          const { data: bookingsData, error: bookingsError } = await supabase
            .from("bookings")
            .select(`
              *,
              space:space_id (
                title,
                address,
                photos
              ),
              coworker:user_id (
                first_name,
                last_name,
                profile_photo_url
              )
            `)
            .in("space_id", spaceIds)
            .order("booking_date", { ascending: true });

          if (bookingsError) throw bookingsError;
          setBookings(bookingsData as BookingWithDetails[] || []);
        }
      } catch (error) {
        console.error("Error fetching host data:", error);
        toast.error("Failed to load your dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHostData();
  }, [authState.user]);

  const handleBookingAction = async (bookingId: string, action: 'confirmed' | 'cancelled') => {
    setProcessingBooking(bookingId);

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: action })
        .eq("id", bookingId);

      if (error) throw error;

      setBookings(bookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: action } 
          : booking
      ));
      
      toast.success(`Booking ${action === 'confirmed' ? 'confirmed' : 'rejected'} successfully`);
    } catch (error) {
      console.error(`Error ${action} booking:`, error);
      toast.error(`Failed to ${action === 'confirmed' ? 'confirm' : 'reject'} booking`);
    } finally {
      setProcessingBooking(null);
    }
  };

  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  if (authState.profile?.role !== "host") {
    return null;
  }

  const pendingBookings = bookings.filter(b => b.status === "pending");
  const upcomingBookings = bookings.filter(b => 
    b.status === "confirmed" && new Date(b.booking_date) >= new Date()
  );
  const pastBookings = bookings.filter(b => 
    b.status === "cancelled" || (b.status === "confirmed" && new Date(b.booking_date) < new Date())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Host Dashboard</h1>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">
              Welcome, {authState.profile?.first_name || "User"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Your Spaces</span>
                <Layout className="w-5 h-5 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Manage your workspace listings and availability</p>
              <div className="mt-2">
                <span className="text-2xl font-bold">{spaces.length}</span>
                <span className="text-gray-600 ml-2">workspace{spaces.length !== 1 ? 's' : ''}</span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => navigate("/spaces/manage")}
              >
                Manage Spaces
              </Button>
              <Button
                onClick={() => navigate("/spaces/new")}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Space
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Bookings</span>
                <Calendar className="w-5 h-5 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View and manage your upcoming and past bookings</p>
              <div className="mt-2">
                <span className="text-2xl font-bold">{pendingBookings.length}</span>
                <span className="text-gray-600 ml-2">pending request{pendingBookings.length !== 1 ? 's' : ''}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => document.getElementById('bookings-tab')?.click()} 
                variant="outline" 
                className="w-full"
              >
                Manage Bookings
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle>Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Track your income and payment history</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </CardFooter>
          </Card>
        </div>

        <Tabs defaultValue="spaces">
          <TabsList className="mb-4">
            <TabsTrigger value="spaces">My Spaces</TabsTrigger>
            <TabsTrigger value="bookings" id="bookings-tab">Bookings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="spaces">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : spaces.length === 0 ? (
              <Card className="bg-white border-dashed border-2 border-gray-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <h2 className="text-xl font-medium text-gray-600 mb-2">No Spaces Yet</h2>
                  <p className="text-gray-500 text-center mb-6">
                    Create your first space to start hosting coworkers
                  </p>
                  <Button
                    onClick={() => navigate("/spaces/new")}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create Your First Space
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spaces.map((space) => (
                  <Card key={space.id} className="overflow-hidden">
                    <div
                      className="h-40 bg-gray-200 bg-center bg-cover"
                      style={{
                        backgroundImage: space.photos && space.photos.length > 0
                          ? `url(${space.photos[0]})`
                          : "url(/placeholder.svg)",
                      }}
                    />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <CardTitle className="text-lg">{space.title}</CardTitle>
                        <Badge variant={space.published ? "default" : "secondary"}>
                          {space.published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-gray-600 line-clamp-2">{space.description}</p>
                      <div className="mt-2 flex justify-between">
                        <span className="text-blue-600 font-medium">
                          ${space.price_per_hour}/hour
                        </span>
                        <span className="text-gray-600">
                          Max {space.max_capacity} {space.max_capacity === 1 ? "person" : "people"}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        onClick={() => navigate(`/spaces/${space.id}/edit`)}
                        className="w-full"
                        variant="outline"
                      >
                        Manage
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
            <div className="mt-6 text-center">
              <Button 
                onClick={() => navigate("/spaces/manage")}
                variant="outline" 
                size="lg"
              >
                View All Spaces
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div>
                {pendingBookings.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Pending Requests</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pendingBookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden border-yellow-200">
                          <div
                            className="h-40 bg-gray-200 bg-center bg-cover"
                            style={{
                              backgroundImage: booking.space?.photos && booking.space?.photos.length > 0
                                ? `url(${booking.space.photos[0]})`
                                : "url(/placeholder.svg)",
                            }}
                          />
                          <CardHeader className="pb-2">
                            <div className="flex justify-between">
                              <CardTitle className="text-lg">{booking.space?.title}</CardTitle>
                              <Badge className={BOOKING_STATUS_COLORS[booking.status]}>
                                {BOOKING_STATUS_LABELS[booking.status]}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 pb-2">
                            <div className="flex items-center text-gray-600">
                              <Calendar className="w-4 h-4 mr-2" />
                              {new Date(booking.booking_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-gray-600">
                              <MapPin className="w-4 h-4 mr-2" />
                              {booking.space?.address}
                            </div>
                            <div className="flex items-center text-gray-600">
                              <User className="w-4 h-4 mr-2" />
                              {booking.coworker?.first_name} {booking.coworker?.last_name}
                            </div>
                          </CardContent>
                          <CardFooter className="flex justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 mr-2"
                              disabled={!!processingBooking}
                              onClick={() => handleBookingAction(booking.id, 'cancelled')}
                            >
                              {processingBooking === booking.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4 mr-2" />
                              )}
                              Decline
                            </Button>
                            <Button
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              size="sm"
                              disabled={!!processingBooking}
                              onClick={() => handleBookingAction(booking.id, 'confirmed')}
                            >
                              {processingBooking === booking.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              )}
                              Confirm
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <h2 className="text-xl font-semibold mb-4">Upcoming Bookings</h2>
                {upcomingBookings.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-gray-500">You have no upcoming confirmed bookings</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {upcomingBookings.map((booking) => (
                      <Card key={booking.id} className="overflow-hidden">
                        <div
                          className="h-40 bg-gray-200 bg-center bg-cover"
                          style={{
                            backgroundImage: booking.space?.photos && booking.space?.photos.length > 0
                              ? `url(${booking.space.photos[0]})`
                              : "url(/placeholder.svg)",
                          }}
                        />
                        <CardHeader className="pb-2">
                          <div className="flex justify-between">
                            <CardTitle className="text-lg">{booking.space?.title}</CardTitle>
                            <Badge className={BOOKING_STATUS_COLORS[booking.status]}>
                              {BOOKING_STATUS_LABELS[booking.status]}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(booking.booking_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            {booking.space?.address}
                          </div>
                          <div className="flex items-center text-gray-600">
                            <User className="w-4 h-4 mr-2" />
                            {booking.coworker?.first_name} {booking.coworker?.last_name}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {pastBookings.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 mt-8">Past Bookings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pastBookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden bg-gray-50">
                          <div
                            className="h-40 bg-gray-200 bg-center bg-cover opacity-70"
                            style={{
                              backgroundImage: booking.space?.photos && booking.space?.photos.length > 0
                                ? `url(${booking.space.photos[0]})`
                                : "url(/placeholder.svg)",
                            }}
                          />
                          <CardHeader className="pb-2">
                            <div className="flex justify-between">
                              <CardTitle className="text-lg text-gray-600">{booking.space?.title}</CardTitle>
                              <Badge className={BOOKING_STATUS_COLORS[booking.status]}>
                                {BOOKING_STATUS_LABELS[booking.status]}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center text-gray-500">
                              <Calendar className="w-4 h-4 mr-2" />
                              {new Date(booking.booking_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-gray-500">
                              <MapPin className="w-4 h-4 mr-2" />
                              {booking.space?.address}
                            </div>
                            <div className="flex items-center text-gray-500">
                              <User className="w-4 h-4 mr-2" />
                              {booking.coworker?.first_name} {booking.coworker?.last_name}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HostDashboard;
