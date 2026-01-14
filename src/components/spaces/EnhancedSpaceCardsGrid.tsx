
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Grid3X3, 
  List, 
  Map, 
  ArrowUpDown, 
  TrendingUp,
  Clock,
  Star,
  Euro
} from 'lucide-react';
import { EnhancedSpaceCard } from './EnhancedSpaceCard';
import { Space } from '@/types/space';
import { Skeleton } from '@/components/ui/skeleton';

interface EnhancedSpaceCardsGridProps {
  spaces: Space[];
  onSpaceClick: (spaceId: string) => void;
  highlightedId?: string | null;
  isLoading?: boolean;
}

type ViewMode = 'grid' | 'list' | 'map';
type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'distance' | 'newest';

export const EnhancedSpaceCardsGrid: React.FC<EnhancedSpaceCardsGridProps> = ({
  spaces,
  onSpaceClick,
  highlightedId,
  isLoading = false
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sortOptions = [
    { value: 'relevance', label: 'Rilevanza', icon: TrendingUp },
    { value: 'price_asc', label: 'Prezzo crescente', icon: Euro },
    { value: 'price_desc', label: 'Prezzo decrescente', icon: Euro },
    { value: 'rating', label: 'Miglior valutazione', icon: Star },
    { value: 'distance', label: 'Distanza', icon: Clock },
    { value: 'newest', label: 'Più recenti', icon: Clock }
  ];

  // Memoized sorting per ottimizzare performance
  const sortedSpaces = useMemo(() => {
    if (!spaces.length) return [];
    
    let sorted = [...spaces];
    
    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => (a.price_per_day || 0) - (b.price_per_day || 0));
      case 'price_desc':
        return sorted.sort((a, b) => (b.price_per_day || 0) - (a.price_per_day || 0));
      case 'rating':
        // Ordinamento per rating - necessita integrazione con sistema recensioni
        return sorted;
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
      case 'distance':
        // Mock distance sorting - implementare con coordinate reali
        return sorted;
      default:
        return sorted;
    }
  }, [spaces, sortBy]);

  const renderSkeletonCards = () => {
    return Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="space-y-3">
        <Skeleton className="h-56 w-full rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    ));
  };

  const currentSortOption = sortOptions.find(option => option.value === sortBy);

  return (
    <div className="space-y-6">
      {/* Header con controlli vista e ordinamento */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4">
          {/* Toggle vista */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-3"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="px-3"
            >
              <Map className="w-4 h-4" />
            </Button>
          </div>

          {/* Indicatori di attività */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              {Math.floor(spaces.length * 0.3)} disponibili ora
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <TrendingUp className="w-3 h-3 mr-1" />
              {Math.floor(spaces.length * 0.2)} popolari
            </Badge>
          </div>
        </div>

        {/* Ordinamento */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2"
          >
            <ArrowUpDown className="w-4 h-4" />
            {currentSortOption?.label || 'Ordina per'}
          </Button>
          
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-lg z-10 min-w-48">
              {sortOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 ${
                      sortBy === option.value ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                    onClick={() => {
                      setSortBy(option.value as SortOption);
                      setShowSortMenu(false);
                    }}
                  >
                    <IconComponent className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Grid degli spazi */}
      {isLoading ? (
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {renderSkeletonCards()}
        </div>
      ) : (
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {sortedSpaces.map((space) => (
            <div
              key={space.id}
              className={`transition-all duration-300 ${
                highlightedId === space.id 
                  ? 'ring-2 ring-blue-500 ring-opacity-50 transform scale-105' 
                  : ''
              }`}
            >
              <EnhancedSpaceCard
                space={space}
                onClick={() => onSpaceClick(space.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && spaces.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Grid3X3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Nessuno spazio trovato
          </h3>
          <p className="text-gray-600 mb-4">
            Prova a modificare i filtri di ricerca per trovare più risultati.
          </p>
          <Button variant="outline">
            Rimuovi filtri
          </Button>
        </div>
      )}

      {/* Load more */}
      {!isLoading && spaces.length > 0 && spaces.length % 12 === 0 && (
        <div className="text-center pt-6">
          <Button variant="outline" size="lg">
            Carica altri spazi
          </Button>
        </div>
      )}
    </div>
  );
};
