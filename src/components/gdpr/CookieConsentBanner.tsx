
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Cookie, Settings, Shield, BarChart3, Target, Palette } from 'lucide-react';
import { useConsent } from '@/hooks/useConsent';
import { COOKIE_CATEGORIES, applyConsentSettings, blockCookiesWithoutConsent } from '@/lib/gdpr-utils';
import type { CookieConsent } from '@/types/gdpr';
import { cn } from '@/lib/utils';

interface CookieConsentBannerProps {
  className?: string;
}

export function CookieConsentBanner({ className }: CookieConsentBannerProps) {
  const { shouldShowBanner, handleConsent, hasConsent } = useConsent();
  const [showCustomize, setShowCustomize] = useState(false);
  const [customConsent, setCustomConsent] = useState<Partial<CookieConsent>>({
    analytics: false,
    marketing: false,
    preferences: false
  });

  // Apply consent settings when component mounts or consent changes
  useEffect(() => {
    if (shouldShowBanner) {
      // Block all non-essential cookies initially
      blockCookiesWithoutConsent(() => false);
    } else {
      // Apply current consent settings
      applyConsentSettings(hasConsent);
    }
  }, [shouldShowBanner, hasConsent]);

  const handleAcceptAll = () => {
    handleConsent('accept-all');
    applyConsentSettings(() => true);
  };

  const handleRejectAll = () => {
    handleConsent('reject-all');
    applyConsentSettings((category) => category === 'necessary');
  };

  const handleCustomize = () => {
    setShowCustomize(true);
  };

  const handleSavePreferences = () => {
    handleConsent('save-preferences', customConsent);
    setShowCustomize(false);
    applyConsentSettings((category) => {
      if (category === 'necessary') return true;
      return customConsent[category as keyof typeof customConsent] || false;
    });
  };

  const toggleCustomConsent = (category: keyof typeof customConsent, value: boolean) => {
    setCustomConsent(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'necessary':
        return <Shield className="h-5 w-5" />;
      case 'analytics':
        return <BarChart3 className="h-5 w-5" />;
      case 'marketing':
        return <Target className="h-5 w-5" />;
      case 'preferences':
        return <Palette className="h-5 w-5" />;
      default:
        return <Cookie className="h-5 w-5" />;
    }
  };

  if (!shouldShowBanner) {
    return null;
  }

  return (
    <>
      {/* Main Cookie Banner */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg",
        className
      )}>
        <Card className="max-w-6xl mx-auto">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Cookie className="h-6 w-6 text-indigo-600 mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">
                    Rispettiamo la tua privacy
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Utilizziamo cookie per migliorare la tua esperienza, analizzare l'utilizzo del sito 
                    e fornire contenuti personalizzati. Puoi accettare tutti i cookie, personalizzare 
                    le tue preferenze o rifiutarli tutti.
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>Leggi la nostra</span>
                    <a 
                      href="/privacy-policy" 
                      className="text-indigo-600 hover:text-indigo-800 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </a>
                    <span>per maggiori informazioni.</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectAll}
                  className="text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  Rifiuta Tutti
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCustomize}
                  className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Personalizza
                </Button>
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Accetta Tutti
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customization Dialog */}
      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Personalizza le Preferenze dei Cookie
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Puoi scegliere quali tipi di cookie accettare. I cookie necessari sono sempre abilitati 
              per garantire il corretto funzionamento del sito.
            </p>

            <div className="space-y-4">
              {COOKIE_CATEGORIES.map((category) => (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category.id)}
                      <h4 className="font-medium text-gray-900">{category.name}</h4>
                      {category.required && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          Necessario
                        </span>
                      )}
                    </div>
                    <Switch
                      checked={category.required || customConsent[category.id] || false}
                      onCheckedChange={(checked) => !category.required && toggleCustomConsent(category.id, checked)}
                      disabled={category.required}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-600 ml-7">
                    {category.description}
                  </p>
                  
                  <div className="ml-7">
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer hover:text-gray-700">
                        Visualizza cookie utilizzati
                      </summary>
                      <div className="mt-2 space-y-1">
                        {category.cookies.map((cookie) => (
                          <div key={cookie} className="bg-gray-50 px-2 py-1 rounded text-xs">
                            {cookie}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                  
                  {category.id !== COOKIE_CATEGORIES[COOKIE_CATEGORIES.length - 1].id && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCustomize(false)}
              >
                Annulla
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRejectAll}
                  className="text-gray-600"
                >
                  Rifiuta Tutti
                </Button>
                <Button
                  onClick={handleSavePreferences}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Salva Preferenze
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
