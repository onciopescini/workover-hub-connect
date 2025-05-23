
import { useEffect, useState } from "react";
import { getAllTags, approveTag } from "@/lib/admin-utils";
import { GlobalTag } from "@/types/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Search, Clock } from "lucide-react";
import { toast } from "sonner";

export function AdminTagManagement() {
  const [tags, setTags] = useState<GlobalTag[]>([]);
  const [filteredTags, setFilteredTags] = useState<GlobalTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    filterTags();
  }, [tags, searchTerm, filterCategory, filterStatus]);

  const fetchTags = async () => {
    try {
      const tagsData = await getAllTags();
      setTags(tagsData);
    } catch (error) {
      console.error("Error fetching tags:", error);
      toast.error("Errore nel caricamento dei tag");
    } finally {
      setIsLoading(false);
    }
  };

  const filterTags = () => {
    let filtered = tags.filter(tag => {
      const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "all" || tag.category === filterCategory;
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "approved" && tag.is_approved) ||
        (filterStatus === "pending" && !tag.is_approved) ||
        (filterStatus === "active" && tag.is_active) ||
        (filterStatus === "inactive" && !tag.is_active);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    setFilteredTags(filtered);
  };

  const handleApproveTag = async (tagId: string) => {
    try {
      await approveTag(tagId);
      await fetchTags();
    } catch (error) {
      console.error("Error approving tag:", error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "workspace_feature": return "bg-blue-100 text-blue-800";
      case "amenity": return "bg-green-100 text-green-800";
      case "seating_type": return "bg-purple-100 text-purple-800";
      case "event_type": return "bg-orange-100 text-orange-800";
      case "ideal_guest": return "bg-pink-100 text-pink-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "workspace_feature": return "Caratteristica Workspace";
      case "amenity": return "Servizio";
      case "seating_type": return "Tipo Seduta";
      case "event_type": return "Tipo Evento";
      case "ideal_guest": return "Ospite Ideale";
      default: return category;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento tag...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestione Tag Globali</h2>
        <p className="text-gray-600">Approva, gestisci e organizza i tag della piattaforma</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cerca tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                <SelectItem value="workspace_feature">Caratteristiche Workspace</SelectItem>
                <SelectItem value="amenity">Servizi</SelectItem>
                <SelectItem value="seating_type">Tipi Seduta</SelectItem>
                <SelectItem value="event_type">Tipi Evento</SelectItem>
                <SelectItem value="ideal_guest">Ospiti Ideali</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="approved">Approvati</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="inactive">Inattivi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tags Grid */}
      <div className="grid gap-4">
        {filteredTags.map((tag) => (
          <Card key={tag.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{tag.name}</h3>
                    <Badge className={getCategoryColor(tag.category)}>
                      {getCategoryLabel(tag.category)}
                    </Badge>
                    {tag.is_approved ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Approvato
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        In attesa
                      </Badge>
                    )}
                    {!tag.is_active && (
                      <Badge variant="destructive">
                        Inattivo
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Utilizzi: {tag.usage_count}</p>
                    <p>Creato: {new Date(tag.created_at).toLocaleDateString('it-IT')}</p>
                    {tag.approved_at && (
                      <p>Approvato: {new Date(tag.approved_at).toLocaleDateString('it-IT')}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!tag.is_approved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApproveTag(tag.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approva
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Visualizzati {filteredTags.length} di {tags.length} tag
      </div>
    </div>
  );
}
