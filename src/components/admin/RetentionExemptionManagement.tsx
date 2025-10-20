
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, ShieldOff, Search, UserCheck, Users, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

interface ProfileWithExemption {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  data_retention_exempt: boolean;
  created_at: string;
  last_login_at: string;
  is_suspended: boolean;
}

export const RetentionExemptionManagement = () => {
  const [profiles, setProfiles] = useState<ProfileWithExemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyExempt, setShowOnlyExempt] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, data_retention_exempt, created_at, last_login_at, is_suspended')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch roles for each profile
      const profilesWithRoles = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);
          
          const primaryRole = rolesData?.[0]?.role || 'user';
          return { ...profile, role: primaryRole };
        })
      );
      
      setProfiles(profilesWithRoles as ProfileWithExemption[]);
    } catch (error) {
      sreLogger.error('Error fetching profiles', {}, error as Error);
      toast.error("Errore nel caricamento dei profili");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExemption = async (profileId: string, currentExempt: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ data_retention_exempt: !currentExempt })
        .eq('id', profileId);

      if (error) throw error;

      // Log admin action
      const { data: currentUser } = await supabase.auth.getUser();
      if (currentUser.user) {
        await supabase.from('admin_actions_log').insert({
          admin_id: currentUser.user.id,
          action_type: !currentExempt ? 'retention_exempt_granted' : 'retention_exempt_revoked',
          target_type: 'user',
          target_id: profileId,
          description: `Data retention exemption ${!currentExempt ? 'granted' : 'revoked'} for user`
        });
      }

      toast.success(!currentExempt ? "Esenzione concessa" : "Esenzione revocata");
      fetchProfiles();
    } catch (error) {
      sreLogger.error('Error toggling exemption', { profileId, currentExempt }, error as Error);
      toast.error("Errore nell'aggiornamento dell'esenzione");
    }
  };

  const getExemptionBadge = (isExempt: boolean) => {
    return isExempt 
      ? <Badge className="bg-green-100 text-green-800">Esente</Badge>
      : <Badge className="bg-gray-100 text-gray-800">Standard</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      admin: "bg-purple-100 text-purple-800",
      host: "bg-blue-100 text-blue-800",
      coworker: "bg-gray-100 text-gray-800"
    };
    
    return (
      <Badge className={roleColors[role as keyof typeof roleColors] || "bg-gray-100 text-gray-800"}>
        {role}
      </Badge>
    );
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = searchTerm === "" || 
      `${profile.first_name} ${profile.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesExemption = !showOnlyExempt || profile.data_retention_exempt;
    
    return matchesSearch && matchesExemption;
  });

  const exemptCount = profiles.filter(p => p.data_retention_exempt).length;
  const totalActiveProfiles = profiles.filter(p => !p.is_suspended).length;

  if (isLoading) {
    return <div className="text-center py-8">Caricamento gestione esenzioni...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profili Totali</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles.length}</div>
            <p className="text-xs text-muted-foreground">
              {profiles.filter(p => p.is_suspended).length} sospesi
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profili Esenti</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{exemptCount}</div>
            <p className="text-xs text-muted-foreground">
              {((exemptCount / profiles.length) * 100).toFixed(1)}% del totale
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profili Standard</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles.length - exemptCount}</div>
            <p className="text-xs text-muted-foreground">
              Soggetti a retention automatica
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profili Attivi</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveProfiles}</div>
            <p className="text-xs text-muted-foreground">
              Non sospesi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Exemption Management */}
      <Card>
        <CardHeader>
          <CardTitle>Gestione Esenzioni Data Retention</CardTitle>
          <CardDescription>
            Gestisci le esenzioni dalla cancellazione automatica dei dati per conservazione legale
          </CardDescription>
          
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Cerca per nome o ID utente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={showOnlyExempt}
                onCheckedChange={setShowOnlyExempt}
              />
              <span className="text-sm">Solo profili esenti</span>
            </div>
            
            <Button variant="outline" onClick={fetchProfiles}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Aggiorna
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utente</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Stato Esenzione</TableHead>
                  <TableHead>Ultimo Login</TableHead>
                  <TableHead>Data Creazione</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm ? "Nessun profilo trovato per la ricerca" : "Nessun profilo trovato"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {profile.first_name} {profile.last_name}
                          </div>
                          <div className="text-sm text-gray-500 font-mono">
                            {profile.id.substring(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(profile.role)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getExemptionBadge(profile.data_retention_exempt)}
                          {profile.data_retention_exempt && (
                            <Shield className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {profile.last_login_at 
                          ? new Date(profile.last_login_at).toLocaleDateString('it-IT')
                          : 'Mai'
                        }
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(profile.created_at).toLocaleDateString('it-IT')}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant={profile.data_retention_exempt ? "destructive" : "default"}
                              size="sm"
                            >
                              {profile.data_retention_exempt ? (
                                <>
                                  <ShieldOff className="h-4 w-4 mr-2" />
                                  Revoca Esenzione
                                </>
                              ) : (
                                <>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Concedi Esenzione
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {profile.data_retention_exempt ? "Revoca Esenzione" : "Concedi Esenzione"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {profile.data_retention_exempt ? (
                                  <>
                                    Sei sicuro di voler revocare l'esenzione dalla cancellazione automatica per{" "}
                                    <strong>{profile.first_name} {profile.last_name}</strong>?<br/><br/>
                                    L'utente tornerà ad essere soggetto alle politiche di retention automatica.
                                  </>
                                ) : (
                                  <>
                                    Sei sicuro di voler concedere l'esenzione dalla cancellazione automatica per{" "}
                                    <strong>{profile.first_name} {profile.last_name}</strong>?<br/><br/>
                                    I dati dell'utente verranno conservati indefinitamente e non saranno soggetti 
                                    alla cancellazione automatica.
                                  </>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => toggleExemption(profile.id, profile.data_retention_exempt)}
                                className={profile.data_retention_exempt ? "bg-red-600 hover:bg-red-700" : ""}
                              >
                                {profile.data_retention_exempt ? "Revoca Esenzione" : "Concedi Esenzione"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
