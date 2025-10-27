/**
 * Admin Actions Log Filters Component
 * 
 * Separated from AdminActionsLog.tsx for better component organization
 */
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { ACTION_TYPES } from "@/types/admin";

interface AdminActionsFiltersProps {
  searchTerm: string;
  filterActionType: string;
  filterTargetType: string;
  dateRange: '7d' | '30d' | 'all';
  filterAdminId: string;
  filterIpAddress: string;
  onSearchChange: (term: string) => void;
  onActionTypeChange: (type: string) => void;
  onTargetTypeChange: (type: string) => void;
  onDateRangeChange: (range: '7d' | '30d' | 'all') => void;
  onAdminIdChange: (id: string) => void;
  onIpAddressChange: (ip: string) => void;
}

export function AdminActionsFilters({
  searchTerm,
  filterActionType,
  filterTargetType,
  dateRange,
  filterAdminId,
  filterIpAddress,
  onSearchChange,
  onActionTypeChange,
  onTargetTypeChange,
  onDateRangeChange,
  onAdminIdChange,
  onIpAddressChange
}: AdminActionsFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Cerca per descrizione..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterActionType} onValueChange={onActionTypeChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tipo Azione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le azioni</SelectItem>
              {Object.entries(ACTION_TYPES).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterTargetType} onValueChange={onTargetTypeChange}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="user">Utente</SelectItem>
              <SelectItem value="space">Spazio</SelectItem>
              <SelectItem value="tag">Tag</SelectItem>
              <SelectItem value="ticket">Ticket</SelectItem>
              <SelectItem value="report">Report</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced filters row */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={dateRange} onValueChange={(val) => onDateRangeChange(val as '7d' | '30d' | 'all')}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutto il periodo</SelectItem>
              <SelectItem value="7d">Ultimi 7 giorni</SelectItem>
              <SelectItem value="30d">Ultimi 30 giorni</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1">
            <Input
              placeholder="Filtra per IP address..."
              value={filterIpAddress}
              onChange={(e) => onIpAddressChange(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}