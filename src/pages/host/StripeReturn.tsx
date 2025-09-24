import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";

const StripeReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const state = searchParams.get('state');

  useEffect(() => {
    // Refresh profile to get updated Stripe status
    const refreshData = async () => {
      setIsRefreshing(true);
      try {
        await refreshProfile();
        if (state === 'success') {
          toast.success('Onboarding Stripe completato! Puoi ora accettare pagamenti.');
        } else if (state === 'refresh') {
          toast.warning('Onboarding Stripe interrotto. Puoi riprovare quando vuoi.');
        }
      } catch (error) {
        console.error('Failed to refresh profile:', error);
        toast.error('Errore durante l\'aggiornamento dello stato');
      } finally {
        setIsRefreshing(false);
      }
    };

    refreshData();
  }, [state, refreshProfile]);

  const getContent = () => {
    if (state === 'success') {
      return {
        title: 'Onboarding Completato!',
        description: 'Il tuo account Stripe è stato configurato correttamente. Puoi ora accettare pagamenti dai tuoi ospiti.',
        icon: <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />,
        buttonText: 'Vai alla Dashboard',
        buttonAction: () => navigate('/host/dashboard'),
        variant: 'success' as const
      };
    }

    if (state === 'refresh') {
      return {
        title: 'Onboarding Interrotto',
        description: 'L\'onboarding di Stripe è stato interrotto. Non preoccuparti, puoi riprovare in qualsiasi momento dalla tua dashboard.',
        icon: <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />,
        buttonText: 'Riprova Onboarding',
        buttonAction: () => navigate('/host/dashboard'),
        variant: 'warning' as const
      };
    }

    return {
      title: 'Stato Sconosciuto',
      description: 'Si è verificato un errore durante il processo di onboarding. Controlla la tua dashboard per lo stato aggiornato.',
      icon: <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />,
      buttonText: 'Vai alla Dashboard',
      buttonAction: () => navigate('/host/dashboard'),
      variant: 'error' as const
    };
  };

  const content = getContent();

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mb-4">
              {isRefreshing ? (
                <RefreshCw className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
              ) : (
                content.icon
              )}
            </div>
            <CardTitle className="text-xl font-semibold">
              {isRefreshing ? 'Aggiornamento...' : content.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              {isRefreshing ? 'Stiamo aggiornando il tuo stato Stripe...' : content.description}
            </p>
            
            <div className="pt-4">
              <Button 
                onClick={content.buttonAction}
                disabled={isRefreshing}
                className="w-full"
              >
                {isRefreshing ? 'Attendere...' : content.buttonText}
              </Button>
            </div>

            {state === 'refresh' && !isRefreshing && (
              <div className="pt-2">
                <Button 
                  variant="outline"
                  onClick={() => navigate('/profile')}
                  className="w-full"
                >
                  Vai al Profilo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StripeReturn;