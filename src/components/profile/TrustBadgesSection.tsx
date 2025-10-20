
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Mail, Phone, CreditCard, CheckCircle, XCircle } from "lucide-react";
import { Profile } from "@/types/auth";
import { useProfileRoleDisplay } from '@/hooks/profile/useProfileRoleDisplay';

interface TrustBadgesSectionProps {
  profile: Profile;
  emailConfirmedAt?: string | null;
}

export function TrustBadgesSection({ profile, emailConfirmedAt }: TrustBadgesSectionProps) {
  const { roleLabel, roleBadgeVariant, isHost } = useProfileRoleDisplay();
  
  const verificationItems = [
    {
      key: 'email',
      label: 'Email Verificata',
      verified: !!emailConfirmedAt,
      icon: Mail,
      color: 'text-green-600'
    },
    {
      key: 'phone',
      label: 'Telefono Inserito',
      verified: !!profile.phone,
      icon: Phone,
      color: 'text-blue-600'
    },
    ...(isHost ? [{
      key: 'stripe',
      label: 'Pagamenti Configurati',
      verified: profile.stripe_connected || false,
      icon: CreditCard,
      color: 'text-purple-600'
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
            <div key={item.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {item.verified ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
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
