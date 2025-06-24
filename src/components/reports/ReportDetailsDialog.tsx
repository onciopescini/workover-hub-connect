import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MessageSquare, User, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ReportDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
}

export function ReportDetailsDialog({ open, onOpenChange, reportId }: ReportDetailsDialogProps) {
  const { authState } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resolution, setResolution] = useState<string>("");
  const [status, setStatus] = useState<string>("open");

  React.useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("reports")
          .select(`
            *,
            profiles (
              id,
              first_name,
              last_name,
              profile_photo_url
            ),
            spaces (
              id,
              title
            ),
            events (
              id,
              title
            )
          `)
          .eq("id", reportId)
          .single();

        if (error) {
          console.error("Error fetching report:", error);
        } else {
          setReport(data);
          setStatus(data.status);
          setResolution(data.resolution || "");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (open && reportId) {
      fetchReport();
    }
  }, [open, reportId]);

  const handleResolveReport = async () => {
    if (!resolution) {
      alert("Please enter a resolution.");
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("reports")
        .update({
          status: "resolved",
          resolution: resolution,
          resolved_by: authState.user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) {
        console.error("Error resolving report:", error);
        alert("Failed to resolve report.");
      } else {
        alert("Report resolved successfully!");
        onOpenChange(false);
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
      <Dialog open={open} onOpenChange={onOpenChange}>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                {report.profiles ? (
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={report.profiles.profile_photo_url || ""} />
                      <AvatarFallback>
                        {getInitials(
                          report.profiles.first_name,
                          report.profiles.last_name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {report.profiles.first_name} {report.profiles.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {report.profiles.id}
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
                {report.space ? (
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span>Spazio: {report.spaces.title}</span>
                  </div>
                ) : null}
                {report.event ? (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Evento: {report.events.title}</span>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Risoluzione</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Inserisci la risoluzione..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                />

                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona lo stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aperto</SelectItem>
                    <SelectItem value="resolved">Risolto</SelectItem>
                    <SelectItem value="pending">In sospeso</SelectItem>
                    <SelectItem value="rejected">Rifiutato</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleResolveReport}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      Caricamento...{" "}
                      <svg
                        className="animate-spin h-5 w-5 ml-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </>
                  ) : (
                    "Risolvi Segnalazione"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
