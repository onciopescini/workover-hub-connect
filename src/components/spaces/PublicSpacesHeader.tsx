/**
 * Public Spaces Header Component
 * 
 * Extracted from PublicSpaces.tsx - displays title, description and stats
 */
import { Card, CardContent } from '@/components/ui/card';

interface PublicSpacesHeaderProps {
  spacesCount?: number;
}

export const PublicSpacesHeader = ({ spacesCount }: PublicSpacesHeaderProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Trova il tuo spazio di lavoro ideale
        </h1>
        <p className="text-muted-foreground mb-4">
          Scopri spazi di coworking, uffici privati e sale riunioni nella tua città
        </p>
        {spacesCount !== undefined && (
          <div className="text-sm text-muted-foreground">
            {spacesCount > 0 
              ? `${spacesCount} spazi disponibili • ` 
              : 'Nessuno spazio trovato • '
            }
            Aggiornato {new Date().toLocaleTimeString('it-IT')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};