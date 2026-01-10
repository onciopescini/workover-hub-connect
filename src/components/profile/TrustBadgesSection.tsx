
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Mail, Phone, CreditCard, CheckCircle, XCircle, Send } from "lucide-react";
import { Profile } from "@/types/auth";
import { useProfileRoleDisplay } from '@/hooks/profile/useProfileRoleDisplay';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrustBadgesSectionProps {
  profile: Profile;
  email?: string | null | undefined;
  emailConfirmedAt?: string | null;
  phoneConfirmedAt?: string | null;
}

export function TrustBadgesSection({ profile, email, emailConfirmedAt, phoneConfirmedAt }: TrustBadgesSectionProps) {
  const { roleLabel, roleBadgeVariant, isHost } = useProfileRoleDisplay();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    const targetEmail = email;

    if (!targetEmail) {
      toast.error("Email non trovata");
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (error) throw error;

      toast.success("Email inviata con successo!");
      setResendCooldown(60);
    } catch (error: any) {
      console.error("Error resending verification email:", error);
      toast.error(error.message || "Errore durante l'invio dell'email");
    } finally {
      setIsResending(false);
    }
  };

  const verificationItems = [
    {
      key: 'email',
      label: 'Email',
      verified: !!emailConfirmedAt,
      icon: Mail,
      color: 'text-green-600',
      action: !emailConfirmedAt ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleResendEmail}
          disabled={resendCooldown > 0 || isResending}
          className="ml-2 h-7 text-xs"
        >
          {isResending ? (
            "Invio in corso..."
          ) : resendCooldown > 0 ? (
            `Attendi ${resendCooldown}s`
          ) : (
            <>
              <Send className="w-3 h-3 mr-1" />
              Invia di nuovo
            </>
          )}
        </Button>
      ) : null
    },
    {
      key: 'phone',
      label: 'Telefono',
      verified: !!phoneConfirmedAt,
      icon: Phone,
      color: 'text-blue-600',
      action: null
    },
    ...(isHost ? [{
      key: 'stripe',
      label: 'Pagamenti',
      verified: profile.stripe_connected || false,
      icon: CreditCard,
      color: 'text-purple-600',
      action: null
    }] : [])
  ];

  const trustScore = verificationItems.filter(item => item.verified).length;
  const maxScore = verificationItems.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Fiducia & Verifica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trust Score */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {trustScore}/{maxScore}
          </div>
          <p className="text-sm text-gray-600">Punteggio Fiducia</p>
          <Badge 
            variant={trustScore === maxScore ? "default" : trustScore >= 2 ? "secondary" : "outline"}
            className="mt-2"
          >
            {trustScore === maxScore ? "Verificato" : trustScore >= 2 ? "Buono" : "Base"}
          </Badge>
        </div>

        {/* Verification Items */}
        <div className="space-y-3">
          {verificationItems.map((item) => (
            <div key={item.key} className="flex flex-col gap-2 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {item.verified ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verificato
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                    <XCircle className="w-3 h-3 mr-1" />
                    Non Verificato
                  </Badge>
                )}
              </div>

              {/* Action Button for Unverified Items (like Email) */}
              {!item.verified && item.action && (
                <div className="flex justify-end pt-1">
                  {item.action}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Role Badge */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Ruolo Piattaforma</span>
            <Badge variant={roleBadgeVariant}>
              {roleLabel}
            </Badge>
          </div>
        </div>

        {/* Member Since */}
        <div className="pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Membro dal</span>
            <span className="text-sm text-gray-900">
              {new Date(profile.created_at).toLocaleDateString('it-IT', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
