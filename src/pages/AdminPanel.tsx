
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";

const AdminPanel = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the new admin dashboard
    navigate("/admin", { replace: true });
  }, [navigate]);

  return <LoadingScreen />;
};

export default AdminPanel;
