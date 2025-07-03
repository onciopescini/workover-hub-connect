
import { useEffect, useState } from "react";
import { getAllSpaces, moderateSpace } from "@/lib/admin-utils";
import { AdminSpace } from "@/types/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CheckCircle, X, Search, Eye, MapPin, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AdminSpaceRevisionDialog } from "./AdminSpaceRevisionDialog";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useLogger } from "@/hooks/useLogger";

export function AdminSpaceManagement() {
  const [spaces, setSpaces] = useState<AdminSpace[]>([]);
  const [filteredSpaces, setFilteredSpaces] = useState<AdminSpace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  // Rejection dialog state
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Space view dialog state
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<AdminSpace | null>(null);

  // Revision dialog state
  const [revisionDialog, setRevisionDialog] = useState(false);
  const [revisionSpace, setRevisionSpace] = useState<AdminSpace | null>(null);

  useEffect(() => {
    fetchSpaces();
  }, []);

  useEffect(() => {
    filterSpaces();
  }, [spaces, searchTerm, filterStatus, filterCategory]);

  const fetchSpaces = async () => {
    try {
      const spacesData = await getAllSpaces();
      setSpaces(spacesData);
    } catch (error) {
      console.error("Error fetching spaces:", error);
      toast.error("Errore nel caricamento degli spazi");
    } finally {
      setIsLoading(false);
    }
  };

  const filterSpaces = () => {
    let filtered = spaces.filter(space => {
      const matchesSearch = 
        space.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        space.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (filterStatus === "suspended") {
        matchesStatus = !!space.is_suspended;
      } else if (filterStatus === "pending_revision") {
        matchesStatus = !!space.is_suspended && !!space.revision_requested;
      } else if (filterStatus === "all") {
        matchesStatus = true;
      } else {
        matchesStatus = filterStatus === "all" || 
          (filterStatus === "published" && space.published) ||
          (filterStatus === "unpublished" && !space.published) ||
          (filterStatus === "pending" && space.pending_approval);
      }

      const matchesCategory = filterCategory === "all" || space.category === filterCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    setFilteredSpaces(filtered);
  };

  const handleApproveSpace = async (spaceId: string) => {
    try {
      await moderateSpace(spaceId, true);
      await fetchSpaces();
    } catch (error) {
      console.error("Error approving space:", error);
    }
  };

  const handleRejectSpace = async () => {
    if (!selectedSpaceId || !rejectionReason) {
      toast.error("Inserisci il motivo del rifiuto");
      return;
    }

    try {
      await moderateSpace(selectedSpaceId, false, rejectionReason);
      await fetchSpaces();
      setRejectionDialog(false);
      setRejectionReason("");
      setSelectedSpaceId("");
    } catch (error) {
      console.error("Error rejecting space:", error);
    }
  };

  const handleViewSpace = (space: AdminSpace) => {
    setSelectedSpace(space);
    setViewDialog(true);
  };

  const handleRevisionRequest = (space: AdminSpace) => {
    setRevisionSpace(space);
    setRevisionDialog(true);
  };

  const getStatusColor = (space: AdminSpace) => {
    if (space.is_suspended) return "bg-red-100 text-red-800";
    if (space.pending_approval) return "bg-yellow-100 text-yellow-800";
    if (space.published) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (space: AdminSpace) => {
    if (space.is_suspended) return "Sospeso";
    if (space.pending_approval) return "In attesa";
    if (space.published) return "Pubblicato";
    return "Non pubblicato";
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento spazi...</div>;
  }

  // Conteggio per tipi di spazi
  const suspendedCount = spaces.filter(space => space.is_suspended).length;
  const pendingRevisionCount = spaces.filter(space => space.is_suspended && space.revision_requested).length;
  const pendingApprovalCount = spaces.filter(space => space.pending_approval).length;
  const publishedCount = spaces.filter(space => space.published && !space.is_suspended).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestione Spazi</h2>
        <p className="text-gray-600">Modera spazi, approva pubblicazioni e gestisci contenuti</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={pendingRevisionCount > 0 ? "border-blue-300" : ""}>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">{pendingRevisionCount}</div>
            <div className="text-sm text-gray-600">Revisioni Richieste</div>
          </CardContent>
        </Card>
        <Card className={suspendedCount > 0 ? "border-red-300" : ""}>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-red-600">{suspendedCount}</div>
            <div className="text-sm text-gray-600">Spazi Sospesi</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-yellow-600">{pendingApprovalCount}</div>
            <div className="text-sm text-gray-600">In Attesa Approvazione</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
            <div className="text-sm text-gray-600">Pubblicati</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cerca per titolo o indirizzo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="published">Pubblicati</SelectItem>
                <SelectItem value="unpublished">Non pubblicati</SelectItem>
                <SelectItem value="suspended">Sospesi</SelectItem>
                <SelectItem value="pending_revision">Revisioni Richieste</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="office">Ufficio</SelectItem>
                <SelectItem value="meeting_room">Sala Riunioni</SelectItem>
                <SelectItem value="coworking">Coworking</SelectItem>
                <SelectItem value="event_space">Spazio Eventi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pending Revision Spaces */}
      {pendingRevisionCount > 0 && filterStatus === "all" && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-blue-700">Spazi in Attesa di Revisione</h3>
          <div className="space-y-3">
            {spaces
              .filter(space => space.is_suspended && space.revision_requested)
              .map((space) => (
                <Card key={space.id} className="border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{space.title}</h3>
                          <Badge className="bg-blue-100 text-blue-800">
                            Revisione Richiesta
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {space.address}
                          </div>
                          <p>Sospeso il: {new Date(space.suspended_at || '').toLocaleDateString('it-IT')}</p>
                          <p className="text-red-600">
                            <strong>Motivo sospensione:</strong> {space.suspension_reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleRevisionRequest(space)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Gestisci Revisione
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Suspended Spaces */}
      {suspendedCount > 0 && filterStatus === "all" && !filterStatus.includes("pending_revision") && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-red-700">Spazi Sospesi</h3>
          <div className="space-y-3">
            {spaces
              .filter(space => space.is_suspended && !space.revision_requested)
              .map((space) => (
                <Card key={space.id} className="border-red-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{space.title}</h3>
                          <Badge className="bg-red-100 text-red-800">
                            Sospeso
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {space.address}
                          </div>
                          <p>Sospeso il: {new Date(space.suspended_at || '').toLocaleDateString('it-IT')}</p>
                          <p className="text-red-600">
                            <strong>Motivo sospensione:</strong> {space.suspension_reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewSpace(space)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizza
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Spaces List - Regular listing for filtered views */}
      <div className="grid gap-4">
        {filteredSpaces
          .filter(space => {
            // Se stiamo visualizzando categorie specifiche, mostriamo tutti
            if (filterStatus !== "all") return true;
            // Altrimenti, nei risultati generici escludiamo quelli sospesi e in revisione che abbiamo già mostrato sopra
            return !space.is_suspended;
          })
          .map((space) => (
            <Card key={space.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{space.title}</h3>
                      <Badge className={getStatusColor(space)}>
                        {getStatusText(space)}
                      </Badge>
                      <Badge variant="secondary">
                        {space.category}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {space.address}
                      </div>
                      <p>Creato: {new Date(space.created_at).toLocaleDateString('it-IT')}</p>
                      <p>Prezzo: €{space.price_per_hour}/ora · €{space.price_per_day}/giorno</p>
                      <p>Capacità: {space.max_capacity} persone</p>
                      {space.rejection_reason && (
                        <p className="text-red-600">
                          <strong>Motivo rifiuto:</strong> {space.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewSpace(space)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Visualizza
                    </Button>

                    {space.pending_approval && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproveSpace(space.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approva
                        </Button>

                        <Dialog open={rejectionDialog} onOpenChange={setRejectionDialog}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSpaceId(space.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Rifiuta
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Rifiuta Spazio</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="rejection-reason">Motivo del rifiuto</Label>
                                <Textarea
                                  id="rejection-reason"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Spiega perché questo spazio viene rifiutato..."
                                  rows={4}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setRejectionDialog(false)}>
                                Annulla
                              </Button>
                              <Button variant="destructive" onClick={handleRejectSpace}>
                                Rifiuta Spazio
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Space View Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSpace?.title}</DialogTitle>
          </DialogHeader>
          {selectedSpace && (
            <div className="space-y-6">
              {/* Photos */}
              {selectedSpace.photos && selectedSpace.photos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedSpace.photos.slice(0, 6).map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`${selectedSpace.title} ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Dettagli Spazio</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Categoria:</strong> {selectedSpace.category}</p>
                    <p><strong>Capacità:</strong> {selectedSpace.max_capacity} persone</p>
                    <p><strong>Prezzo orario:</strong> €{selectedSpace.price_per_hour}</p>
                    <p><strong>Prezzo giornaliero:</strong> €{selectedSpace.price_per_day}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Stato</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Pubblicato:</strong> {selectedSpace.published ? "Sì" : "No"}</p>
                    <p><strong>In attesa approvazione:</strong> {selectedSpace.pending_approval ? "Sì" : "No"}</p>
                    <p><strong>Sospeso:</strong> {selectedSpace.is_suspended ? "Sì" : "No"}</p>
                    {selectedSpace.is_suspended && (
                      <p><strong>Motivo sospensione:</strong> {selectedSpace.suspension_reason}</p>
                    )}
                    <p><strong>Creato:</strong> {new Date(selectedSpace.created_at).toLocaleDateString('it-IT')}</p>
                    <p><strong>Aggiornato:</strong> {new Date(selectedSpace.updated_at).toLocaleDateString('it-IT')}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-semibold mb-2">Descrizione</h4>
                <p className="text-gray-600">{selectedSpace.description}</p>
              </div>

              {/* Address */}
              <div>
                <h4 className="font-semibold mb-2">Indirizzo</h4>
                <p className="text-gray-600">{selectedSpace.address}</p>
              </div>

              {/* Rejection reason if any */}
              {selectedSpace.rejection_reason && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-600">Motivo Rifiuto</h4>
                  <p className="text-red-600 bg-red-50 p-3 rounded-lg">{selectedSpace.rejection_reason}</p>
                </div>
              )}

              {/* Suspension info if any */}
              {selectedSpace.is_suspended && (
                <div>
                  <h4 className="font-semibold mb-2 text-red-600">Informazioni Sospensione</h4>
                  <div className="bg-red-50 p-3 rounded-lg space-y-2">
                    <p className="text-red-600"><strong>Motivo:</strong> {selectedSpace.suspension_reason}</p>
                    <p className="text-red-600"><strong>Data:</strong> {new Date(selectedSpace.suspended_at || '').toLocaleDateString('it-IT')}</p>
                    {selectedSpace.revision_requested && (
                      <div className="mt-2">
                        <p className="text-blue-600"><strong>Revisione richiesta dall'host</strong></p>
                        <p className="text-blue-600"><strong>Note:</strong> {selectedSpace.revision_notes}</p>
                        <Button
                          className="mt-2 bg-blue-600 hover:bg-blue-700"
                          onClick={() => {
                            setViewDialog(false);
                            setTimeout(() => handleRevisionRequest(selectedSpace), 300);
                          }}
                        >
                          Gestisci Revisione
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Space Revision Dialog */}
      {revisionSpace && (
        <AdminSpaceRevisionDialog
          spaceId={revisionSpace.id}
          spaceTitle={revisionSpace.title}
          hostRevisionNotes={revisionSpace.revision_notes || ''}
          isOpen={revisionDialog}
          onClose={() => setRevisionDialog(false)}
          onUpdate={() => {
            setRevisionDialog(false);
            fetchSpaces();
          }}
        />
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Visualizzati {filteredSpaces.length} di {spaces.length} spazi
      </div>
    </div>
  );
}
