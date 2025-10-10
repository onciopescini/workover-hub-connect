import React from 'react';
import { Navigate } from 'react-router-dom';
import { useModeratorCheck } from '@/hooks/admin/useModeratorCheck';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ModeratorRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean; // If true, requires admin role specifically
}

/**
 * Route protection component for admin/moderator pages
 * - requireAdmin=false (default): Allows both admin and moderator
 * - requireAdmin=true: Allows only admin
 */
export const ModeratorRoute: React.FC<ModeratorRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { isAdmin, isModerator, canModerate, isLoading } = useModeratorCheck();
  const navigate = useNavigate();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <Shield className="w-6 h-6 animate-pulse text-primary" />
              <p className="text-muted-foreground">Verifica permessi...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user needs admin role specifically
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Accesso Negato
              </h2>
              <p className="text-gray-600">
                Questa pagina è accessibile solo agli amministratori.
              </p>
              <Button 
                onClick={() => navigate('/admin')}
                variant="default"
              >
                Torna alla Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user has any moderation privileges
  if (!canModerate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Accesso Negato
              </h2>
              <p className="text-gray-600">
                Non hai i permessi necessari per accedere al pannello di amministrazione.
              </p>
              <Button 
                onClick={() => navigate('/')}
                variant="default"
              >
                Torna alla Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has required permissions
  return <>{children}</>;
};
