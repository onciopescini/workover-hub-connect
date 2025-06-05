
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Cookie, Settings, X, Shield, BarChart, Target, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { COOKIE_CATEGORIES, applyConsentSettings } from "@/lib/gdpr-utils";
import type { CookieConsent, CookieCategory } from "@/types/gdpr";

export const CookieConsentManager = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
    timestamp: Date.now(),
    version: '2.0.0'
  });

  useEffect(() => {
    checkConsentStatus();
  }, []);

  const checkConsentStatus = () => {
    const stored = localStorage.getItem('workover_cookie_consent');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConsent(parsed);
        applyConsentSettings((category: string) => parsed[category] || false);
      } catch (error) {
        console.error('Error parsing stored consent:', error);
        setIsVisible(true);
      }
    } else {
      setIsVisible(true);
    }
  };

  const saveConsent = async (newConsent: Partial<CookieConsent>, method: 'banner' | 'settings' | 'withdrawal' = 'banner') => {
    const updatedConsent = {
      ...consent,
      ...newConsent,
      timestamp: Date.now(),
      version: '2.0.0'
    };

    // Save to localStorage
    localStorage.setItem('workover_cookie_consent', JSON.stringify(updatedConsent));
    setConsent(updatedConsent);

    // Apply consent settings to third-party services
    applyConsentSettings((category: string) => updatedConsent[category as keyof CookieConsent] || false);

    // Log consent to database
    try {
      const { data: user } = await supabase.auth.getUser();
      const sessionId = crypto.randomUUID();
      
      await supabase
        .from('cookie_consent_log')
        .insert({
          user_id: user.user?.id || null,
          session_id: sessionId,
          consent_version: '2.0.0',
          necessary_consent: updatedConsent.necessary,
          analytics_consent: updatedConsent.analytics,
          marketing_consent: updatedConsent.marketing,
          preferences_consent: updatedConsent.preferences,
          consent_method: method,
          user_agent: navigator.userAgent
        });
    } catch (error) {
      console.error('Error logging consent:', error);
    }

    setIsVisible(false);
    toast.success("Preferenze cookie salvate");
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    });
  };

  const rejectOptional = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    });
  };

  const saveCustomPreferences = () => {
    saveConsent(consent, 'settings');
    setShowDetails(false);
  };

  const withdrawConsent = async () => {
    const withdrawnConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };

    // Log withdrawal
    try {
      const { data: user } = await supabase.auth.getUser();
      await supabase
        .from('cookie_consent_log')
        .insert({
          user_id: user.user?.id || null,
          session_id: crypto.randomUUID(),
          consent_version: '2.0.0',
          necessary_consent: true,
          analytics_consent: false,
          marketing_consent: false,
          preferences_consent: false,
          consent_method: 'withdrawal',
          user_agent: navigator.userAgent,
          withdrawn_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging consent withdrawal:', error);
    }

    saveConsent(withdrawnConsent, 'withdrawal');
    toast.success("Consenso ritirato - Solo cookie necessari attivi");
  };

  const getCategoryIcon = (categoryId: string) => {
    const icons = {
      necessary: Shield,
      analytics: BarChart,
      marketing: Target,
      preferences: Palette
    };
    const IconComponent = icons[categoryId as keyof typeof icons] || Shield;
    return <IconComponent className="h-4 w-4" />;
  };

  if (!isVisible) {
    return (
      <>
        {/* Settings trigger button */}
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 left-4 z-50 bg-white border shadow-md"
          onClick={() => setShowDetails(true)}
        >
          <Cookie className="h-4 w-4 mr-2" />
          Cookie
        </Button>

        {/* Detailed settings dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Gestione Preferenze Cookie
              </DialogTitle>
              <DialogDescription>
                Gestisci le tue preferenze per i cookie. Puoi modificare queste impostazioni in qualsiasi momento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {COOKIE_CATEGORIES.map((category: CookieCategory) => (
                <Card key={category.id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category.id)}
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        {category.required && (
                          <Badge variant="secondary" className="text-xs">Obbligatorio</Badge>
                        )}
                      </div>
                      <Switch
                        checked={consent[category.id]}
                        onCheckedChange={(checked) => 
                          setConsent({ ...consent, [category.id]: checked })
                        }
                        disabled={category.required}
                      />
                    </div>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <details className="text-sm text-gray-600">
                      <summary className="cursor-pointer hover:text-gray-800">
                        Cookie utilizzati ({category.cookies.length})
                      </summary>
                      <ul className="mt-2 space-y-1 ml-4">
                        {category.cookies.map((cookie) => (
                          <li key={cookie} className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">
                            {cookie}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={acceptAll} className="flex-1">
                Accetta Tutti
              </Button>
              <Button onClick={saveCustomPreferences} variant="outline" className="flex-1">
                Salva Preferenze
              </Button>
              <Button onClick={withdrawConsent} variant="destructive" className="flex-1">
                Ritira Consenso
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t shadow-lg">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex items-start gap-4">
          <Cookie className="h-6 w-6 mt-1 text-blue-600 flex-shrink-0" />
          
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">Rispettiamo la tua privacy</h3>
            <p className="text-sm text-gray-600 mb-4">
              Utilizziamo cookie per migliorare la tua esperienza, analizzare il traffico e personalizzare i contenuti. 
              Scegli quali cookie accettare o gestisci le tue preferenze nel dettaglio.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <Button onClick={acceptAll}>
                Accetta Tutti
              </Button>
              <Button onClick={rejectOptional} variant="outline">
                Solo Necessari
              </Button>
              <Button onClick={() => setShowDetails(true)} variant="ghost">
                <Settings className="h-4 w-4 mr-2" />
                Personalizza
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Detailed settings dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Personalizza Preferenze Cookie
            </DialogTitle>
            <DialogDescription>
              Scegli quali tipi di cookie desideri accettare. I cookie necessari sono sempre attivi per garantire il funzionamento del sito.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {COOKIE_CATEGORIES.map((category: CookieCategory) => (
              <Card key={category.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category.id)}
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      {category.required && (
                        <Badge variant="secondary" className="text-xs">Obbligatorio</Badge>
                      )}
                    </div>
                    <Switch
                      checked={consent[category.id]}
                      onCheckedChange={(checked) => 
                        setConsent({ ...consent, [category.id]: checked })
                      }
                      disabled={category.required}
                    />
                  </div>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <details className="text-sm text-gray-600">
                    <summary className="cursor-pointer hover:text-gray-800">
                      Cookie utilizzati ({category.cookies.length})
                    </summary>
                    <ul className="mt-2 space-y-1 ml-4">
                      {category.cookies.map((cookie) => (
                        <li key={cookie} className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">
                          {cookie}
                        </li>
                      ))}
                    </ul>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={acceptAll} className="flex-1">
              Accetta Tutti
            </Button>
            <Button onClick={saveCustomPreferences} variant="outline" className="flex-1">
              Salva Preferenze
            </Button>
            <Button onClick={rejectOptional} variant="destructive" className="flex-1">
              Solo Necessari
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
