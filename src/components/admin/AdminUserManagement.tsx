import { useEffect, useState } from "react";
import { getAllUsers, suspendUser, reactivateUser, createWarning, getUserWarnings } from "@/lib/admin-utils";
import { AdminProfile, AdminWarning, WARNING_TYPES, WARNING_SEVERITY } from "@/types/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Ban, CheckCircle, Search, UserX, MessageSquare, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function AdminUserManagement() {
  const { authState } = useAuth();
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Warning dialog state
  const [warningDialog, setWarningDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [warningForm, setWarningForm] = useState({
    warning_type: "behavior",
    title: "",
    message: "",
    severity: "medium"
  });

  // Warnings view dialog state
  const [warningsDialog, setWarningsDialog] = useState(false);
  const [userWarnings, setUserWarnings] = useState<AdminWarning[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterRole, filterStatus]);

  const fetchUsers = async () => {
    console.log("AdminUserManagement: Starting to fetch users...");
    setIsLoading(true);
    try {
      const usersData = await getAllUsers();
      console.log("AdminUserManagement: Received users:", usersData.length, "users");
      console.log("AdminUserManagement: Users data:", usersData);
      setUsers(usersData);
    } catch (error) {
      console.error("AdminUserManagement: Error fetching users:", error);
      toast.error("Errore nel caricamento degli utenti");
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    console.log("AdminUserManagement: Filtering users...");
    console.log("AdminUserManagement: Search term:", searchTerm);
    console.log("AdminUserManagement: Filter role:", filterRole);
    console.log("AdminUserManagement: Filter status:", filterStatus);
    console.log("AdminUserManagement: Total users to filter:", users.length);
    
    let filtered = users.filter(user => {
      const matchesSearch = 
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === "all" || user.role === filterRole;
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "suspended" && user.is_suspended) ||
        (filterStatus === "active" && !user.is_suspended);

      console.log(`User ${user.first_name} ${user.last_name}:`, {
        matchesSearch,
        matchesRole,
        matchesStatus,
        role: user.role,
        suspended: user.is_suspended
      });

      return matchesSearch && matchesRole && matchesStatus;
    });

    console.log("AdminUserManagement: Filtered users:", filtered.length, "users");
    setFilteredUsers(filtered);
  };

  const handleSuspendUser = async (userId: string) => {
    const reason = prompt("Inserisci il motivo della sospensione:");
    if (!reason) return;

    try {
      await suspendUser(userId, reason);
      await fetchUsers();
    } catch (error) {
      console.error("Error suspending user:", error);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await reactivateUser(userId);
      await fetchUsers();
    } catch (error) {
      console.error("Error reactivating user:", error);
    }
  };

  const handleSendWarning = async () => {
    if (!selectedUserId || !warningForm.title || !warningForm.message) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    try {
      await createWarning({
        user_id: selectedUserId,
        admin_id: authState.user!.id,
        warning_type: warningForm.warning_type as keyof typeof WARNING_TYPES,
        title: warningForm.title,
        message: warningForm.message,
        severity: warningForm.severity as keyof typeof WARNING_SEVERITY,
        is_active: true
      });

      setWarningDialog(false);
      setWarningForm({
        warning_type: "behavior",
        title: "",
        message: "",
        severity: "medium"
      });
      setSelectedUserId("");
    } catch (error) {
      console.error("Error sending warning:", error);
    }
  };

  const handleViewWarnings = async (userId: string) => {
    try {
      const warnings = await getUserWarnings(userId);
      setUserWarnings(warnings);
      setWarningsDialog(true);
    } catch (error) {
      console.error("Error fetching user warnings:", error);
      toast.error("Errore nel caricamento dei warning");
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800";
      case "host": return "bg-blue-100 text-blue-800";
      case "coworker": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento utenti...</div>;
  }

  console.log("AdminUserManagement: Rendering with users:", users.length, "filtered:", filteredUsers.length);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestione Utenti</h2>
        <p className="text-gray-600">Gestisci utenti, sospensioni e warning</p>
        <p className="text-sm text-gray-500">Totale utenti: {users.length} | Filtrati: {filteredUsers.length}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cerca per nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Ruolo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i ruoli</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="host">Host</SelectItem>
                <SelectItem value="coworker">Coworker</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="suspended">Sospesi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      {users.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600">⚠️ Nessun utente trovato nel database</p>
            <p className="text-sm text-gray-500 mt-2">
              Verifica che ci siano utenti registrati nel sistema
            </p>
          </CardContent>
        </Card>
      )}

      {users.length > 0 && filteredUsers.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-orange-600">⚠️ Nessun utente corrisponde ai filtri applicati</p>
            <p className="text-sm text-gray-500 mt-2">
              Prova a modificare i filtri di ricerca
            </p>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {user.first_name} {user.last_name}
                    </h3>
                    <Badge className={getRoleColor(user.role)}>
                      {user.role}
                    </Badge>
                    {user.is_suspended && (
                      <Badge variant="destructive">
                        Sospeso
                      </Badge>
                    )}
                    {user.stripe_connected && (
                      <Badge variant="secondary">
                        Stripe Connesso
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Registrato: {new Date(user.created_at).toLocaleDateString('it-IT')}</p>
                    {user.is_suspended && user.suspension_reason && (
                      <p className="text-red-600">
                        <strong>Motivo sospensione:</strong> {user.suspension_reason}
                      </p>
                    )}
                    {user.admin_notes && (
                      <p className="text-blue-600">
                        <strong>Note admin:</strong> {user.admin_notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewWarnings(user.id)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Warning
                  </Button>

                  <Dialog open={warningDialog} onOpenChange={setWarningDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Invia Warning
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invia Warning a {user.first_name} {user.last_name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="warning-type">Tipo Warning</Label>
                          <Select value={warningForm.warning_type} onValueChange={(value) => 
                            setWarningForm(prev => ({ ...prev, warning_type: value }))
                          }>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(WARNING_TYPES).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="severity">Gravità</Label>
                          <Select value={warningForm.severity} onValueChange={(value) => 
                            setWarningForm(prev => ({ ...prev, severity: value }))
                          }>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(WARNING_SEVERITY).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="title">Titolo</Label>
                          <Input
                            id="title"
                            value={warningForm.title}
                            onChange={(e) => setWarningForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Titolo del warning"
                          />
                        </div>
                        <div>
                          <Label htmlFor="message">Messaggio</Label>
                          <Textarea
                            id="message"
                            value={warningForm.message}
                            onChange={(e) => setWarningForm(prev => ({ ...prev, message: e.target.value }))}
                            placeholder="Descrizione dettagliata del problema"
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setWarningDialog(false)}>
                          Annulla
                        </Button>
                        <Button onClick={handleSendWarning}>
                          Invia Warning
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {user.is_suspended ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReactivateUser(user.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Riattiva
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuspendUser(user.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Sospendi
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Warnings View Dialog */}
      <Dialog open={warningsDialog} onOpenChange={setWarningsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Warning Utente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {userWarnings.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nessun warning trovato</p>
            ) : (
              userWarnings.map((warning) => (
                <Card key={warning.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{warning.title}</h4>
                      <div className="flex gap-2">
                        <Badge className={getSeverityColor(warning.severity)}>
                          {WARNING_SEVERITY[warning.severity as keyof typeof WARNING_SEVERITY]}
                        </Badge>
                        <Badge variant="outline">
                          {WARNING_TYPES[warning.warning_type as keyof typeof WARNING_TYPES]}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-2">{warning.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(warning.created_at).toLocaleString('it-IT')}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Visualizzati {filteredUsers.length} di {users.length} utenti
      </div>
    </div>
  );
}
