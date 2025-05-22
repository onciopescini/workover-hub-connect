
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Layout } from "lucide-react";

const HostDashboard = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  // Redirect coworkers to their dashboard
  useEffect(() => {
    if (authState.profile?.role === "coworker") {
      navigate("/dashboard", { replace: true });
    }
  }, [authState.profile, navigate]);

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
              <CardTitle>Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View and manage your upcoming and past bookings</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" disabled>
                Coming Soon
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

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-medium mb-4">Your Host Dashboard</h2>
          <p className="text-gray-600">Welcome to WorkOver! This is your host dashboard. Get started by adding your first workspace.</p>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
