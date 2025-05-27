
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentFiltersProps {
  timeRange: string;
  filter: string;
  onTimeRangeChange: (value: string) => void;
  onFilterChange: (value: string) => void;
}

export function PaymentFilters({ 
  timeRange, 
  filter, 
  onTimeRangeChange, 
  onFilterChange 
}: PaymentFiltersProps) {
  return (
    <div className="flex gap-3">
      <Select value={timeRange} onValueChange={onTimeRangeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Periodo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Ultimi 7 giorni</SelectItem>
          <SelectItem value="30">Ultimi 30 giorni</SelectItem>
          <SelectItem value="90">Ultimi 3 mesi</SelectItem>
          <SelectItem value="365">Ultimo anno</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Stato" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tutti</SelectItem>
          <SelectItem value="completed">Completati</SelectItem>
          <SelectItem value="pending">In sospeso</SelectItem>
          <SelectItem value="failed">Falliti</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
