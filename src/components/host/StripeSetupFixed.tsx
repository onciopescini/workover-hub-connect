import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Button } from "@/components/ui/button";

interface StripeSetupProps {
  onboardingLink: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function StripeSetupFixed({ onboardingLink, isLoading, onRefresh }: StripeSetupProps) {
  const { authState } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configura i pagamenti</CardTitle>
      </CardHeader>
      <CardContent>
        {onboardingLink ? (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Il tuo account Stripe è quasi pronto! Clicca sul pulsante qui sotto per completare la configurazione e iniziare a ricevere pagamenti.
            </p>
            <Button asChild>
              <a href={onboardingLink} target="_blank" rel="noopener noreferrer">
                Completa la configurazione di Stripe
              </a>
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Non hai ancora configurato il tuo account Stripe. Clicca sul pulsante qui sotto per iniziare.
            </p>
            <Button onClick={handleRefresh} disabled={isLoading || isRefreshing}>
              {isLoading || isRefreshing ? "Caricamento..." : "Configura Stripe"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
