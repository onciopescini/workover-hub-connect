
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
import { CheckCircle, X, Search, Eye, MapPin } from "lucide-react";
import { toast } from "sonner";

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
      
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "published" && space.published) ||
        (filterStatus === "unpublished" && !space.published) ||
        (filterStatus === "pending" && space.pending_approval);

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

  const getStatusColor = (space: AdminSpace) => {
    if (space.pending_approval) return "bg-yellow-100 text-yellow-800";
    if (space.published) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (space: AdminSpace) => {
    if (space.pending_approval) return "In attesa";
    if (space.published) return "Pubblicato";
    return "Non pubblicato";
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento spazi...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestione Spazi</h2>
        <p className="text-gray-600">Modera spazi, approva pubblicazioni e gestisci contenuti</p>
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

      {/* Spaces List */}
      <div className="grid gap-4">
        {filteredSpaces.map((space) => (
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Visualizzati {filteredSpaces.length} di {spaces.length} spazi
      </div>
    </div>
  );
}
