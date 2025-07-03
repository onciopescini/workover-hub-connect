
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MessageSquare, User, AlertTriangle, CheckCircle, Clock, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportDetailsDialogProps {
  report: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ReportDetailsDialog({ report, isOpen, onClose, onUpdate }: ReportDetailsDialogProps) {
  const { authState } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState<string>(report?.admin_notes || "");
  const [status, setStatus] = useState<string>(report?.status || "open");

  const handleResolveReport = async () => {
    if (!adminNotes) {
      toast.error("Please enter resolution notes.");
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("reports")
        .update({
          status: "resolved",
          admin_notes: adminNotes,
          reviewed_by: authState.user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", report.id);

      if (error) {
        console.error("Error resolving report:", error);
        toast.error("Failed to resolve report.");
      } else {
        toast.success("Report resolved successfully!");
        onUpdate();
        onClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (firstName: string = '', lastName: string = '') => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (!report) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Caricamento...</DialogTitle>
          </DialogHeader>
          <p>Caricamento dettagli segnalazione...</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[825px]">
        <DialogHeader>
          <DialogTitle>Dettagli Segnalazione</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column - Report Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Segnalazione</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>ID: {report.id}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>
                    Creata il:{" "}
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>Motivazione: {report.reason}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  <span>Descrizione: {report.description}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={
                      report.status === "open" ? "secondary" : "outline"
                    }
                  >
                    Stato: {report.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Informazioni Utente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.reporter ? (
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={report.reporter.profile_photo_url || ""} />
                      <AvatarFallback>
                        {getInitials(
                          report.reporter.first_name,
                          report.reporter.last_name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {report.reporter.first_name} {report.reporter.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {report.reporter.id}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>Nessun utente associato</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Resolution and Related Info */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Aggiuntive</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.target_type === 'space' && (
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <span>Spazio segnalato</span>
                  </div>
                )}
                {report.target_type === 'event' && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Evento segnalato</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Risoluzione</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Inserisci le note di risoluzione..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />

                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona lo stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aperto</SelectItem>
                    <SelectItem value="under_review">In revisione</SelectItem>
                    <SelectItem value="resolved">Risolto</SelectItem>
                    <SelectItem value="dismissed">Respinto</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleResolveReport}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Salvando..." : "Risolvi Segnalazione"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
