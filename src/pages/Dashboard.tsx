import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";

const Dashboard = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authState.isLoading && authState.profile) {
      // Unified routing logic - all coworkers go to /app/spaces
      if (authState.profile.role === "coworker") {
        navigate("/app/spaces", { replace: true });
      }
      // Keep host and admin on their respective dashboards
      else if (authState.profile.role === "host") {
        navigate("/host/dashboard", { replace: true });
      }
      else if (authState.profile.role === "admin") {
        navigate("/admin", { replace: true });
      }
    }
  }, [authState.isLoading, authState.profile, navigate]);

  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  return <LoadingScreen />;
};

export default Dashboard;
