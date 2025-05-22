
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  // Redirect hosts to their dashboard
  useEffect(() => {
    if (authState.profile?.role === "host") {
      navigate("/host/dashboard", { replace: true });
    }
  }, [authState.profile, navigate]);

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

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-medium mb-4">Your Coworker Dashboard</h2>
          <p className="text-gray-600">Welcome to WorkOver! This is your coworker dashboard.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
