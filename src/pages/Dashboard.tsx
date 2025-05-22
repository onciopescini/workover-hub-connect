
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Space } from "@/types/space";
import { Booking, BookingWithDetails, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Calendar, MapPin } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

const Dashboard = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loadingCancel, setLoadingCancel] = useState<string | null>(null);

  // Redirect hosts to their dashboard
  useEffect(() => {
    if (authState.profile?.role === "host") {
      navigate("/host/dashboard", { replace: true });
    }
  }, [authState.profile, navigate]);

  // Fetch user's bookings
  useEffect(() => {
    const fetchBookings = async () => {
      if (!authState.user) return;

      try {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select(`
            *,
            space:space_id (
              title,
              address,
              photos
            )
          `)
          .eq("user_id", authState.user.id)
          .order("booking_date", { ascending: true });

        if (bookingsError) throw bookingsError;
        
        setBookings(bookingsData as BookingWithDetails[] || []);

        // Also fetch available spaces for discovery
        const { data: spacesData, error: spacesError } = await supabase
          .from("spaces")
          .select("*")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(6);

        if (spacesError) throw spacesError;
        setSpaces(spacesData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load your bookings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [authState.user]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    setLoadingCancel(bookingId);

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;

      setBookings(bookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: "cancelled" } 
          : booking
      ));
      
      toast.success("Booking cancelled successfully");
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Failed to cancel booking");
    } finally {
      setLoadingCancel(null);
    }
  };

  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  if (authState.profile?.role !== "coworker") {
    return null;
  }

  const activeBookings = bookings.filter(b => b.status !== "cancelled" && new Date(b.booking_date) >= new Date());
  const pastBookings = bookings.filter(b => b.status === "cancelled" || new Date(b.booking_date) < new Date());

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Coworker Dashboard</h1>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">
              Welcome, {authState.profile?.first_name || "User"}
            </span>
          </div>
        </div>

        <Tabs defaultValue="bookings" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="discover">Discover Spaces</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bookings">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold mb-4">Upcoming Bookings</h2>
                {activeBookings.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-gray-500">You have no upcoming bookings</p>
                      <Button 
                        onClick={() => navigate("/")}
                        className="mt-4"
                      >
                        Browse Spaces
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeBookings.map((booking) => (
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
                        <CardContent className="space-y-2 pb-2">
                          <div className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(booking.booking_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-gray-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            {booking.space?.address}
                          </div>
                        </CardContent>
                        <CardFooter className="pt-2">
                          {booking.status === "pending" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={loadingCancel === booking.id}
                              onClick={() => handleCancelBooking(booking.id)}
                              className="w-full"
                            >
                              {loadingCancel === booking.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : null}
                              Cancel Booking
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}

                {pastBookings.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <h2 className="text-xl font-semibold mb-4">Past Bookings</h2>
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
                          <CardContent className="space-y-2 pb-2">
                            <div className="flex items-center text-gray-500">
                              <Calendar className="w-4 h-4 mr-2" />
                              {new Date(booking.booking_date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center text-gray-500">
                              <MapPin className="w-4 h-4 mr-2" />
                              {booking.space?.address}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discover">
            <h2 className="text-xl font-semibold mb-4">Discover Workspaces</h2>
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : spaces.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500">No available spaces found</p>
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
                      <CardTitle className="text-lg">{space.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-gray-600 line-clamp-2">{space.description}</p>
                      <div className="flex items-center mt-2">
                        <Badge variant="secondary" className="mr-2">
                          {space.category}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          Max {space.max_capacity} {space.max_capacity === 1 ? "person" : "people"}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-blue-600 font-medium">
                          ${space.price_per_hour}/hour · ${space.price_per_day}/day
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        onClick={() => navigate(`/spaces/${space.id}`)}
                        className="w-full"
                      >
                        View Details
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
            <div className="mt-6 text-center">
              <Button onClick={() => navigate("/")} variant="outline" size="lg">
                View All Spaces
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
