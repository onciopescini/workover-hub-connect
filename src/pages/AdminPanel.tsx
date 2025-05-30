
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isCurrentUserAdmin } from "@/lib/admin-utils";
import { testAdminActionLogging, logAdminSectionView } from "@/lib/admin-test-utils";
import LoadingScreen from "@/components/LoadingScreen";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { AdminSpaceManagement } from "@/components/admin/AdminSpaceManagement";
import { AdminTagManagement } from "@/components/admin/AdminTagManagement";
import { AdminTicketManagement } from "@/components/admin/AdminTicketManagement";
import { AdminActionsLog } from "@/components/admin/AdminActionsLog";
import AdminReportManagement from "@/components/admin/AdminReportManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Shield, Users, Building, Tags, Headphones, FileText, LogOut, Home, Flag, TestTube } from "lucide-react";
import { toast } from "sonner";

const AdminPanel = () => {
  const { authState, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!authState.user) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const adminStatus = await isCurrentUserAdmin();
        if (!adminStatus) {
          navigate("/dashboard", { replace: true });
          return;
        }
        setIsAdmin(true);
        
        // Test del sistema di logging
        const loggingTest = await testAdminActionLogging();
        if (loggingTest) {
          console.log("✅ Admin logging system is working correctly");
        } else {
          console.warn("⚠️ Admin logging system test failed");
        }
      } catch (error) {
        console.error("Error checking admin access:", error);
        navigate("/dashboard", { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [authState.user, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleTabChange = async (value: string) => {
    setActiveTab(value);
    await logAdminSectionView(value);
  };

  const handleTestLogging = async () => {
    const result = await testAdminActionLogging();
    if (result) {
      toast.success("Test log creato con successo! Controlla la sezione Log.");
    } else {
      toast.error("Errore nella creazione del test log");
    }
  };

  if (authState.isLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-red-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">
                Pannello Amministrazione
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Admin: {authState.profile?.first_name} {authState.profile?.last_name}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestLogging}
                className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <TestTube className="w-4 h-4" />
                Test Log
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Utenti
            </TabsTrigger>
            <TabsTrigger value="spaces" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Spazi
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Tags className="w-4 h-4" />
              Tag
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Segnalazioni
            </TabsTrigger>
            <TabsTrigger value="tickets" className="flex items-center gap-2">
              <Headphones className="w-4 h-4" />
              Supporto
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="users">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="spaces">
            <AdminSpaceManagement />
          </TabsContent>

          <TabsContent value="tags">
            <AdminTagManagement />
          </TabsContent>

          <TabsContent value="reports">
            <AdminReportManagement />
          </TabsContent>

          <TabsContent value="tickets">
            <AdminTicketManagement />
          </TabsContent>

          <TabsContent value="logs">
            <AdminActionsLog />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
