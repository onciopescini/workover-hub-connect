import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KycHostCard } from "./KycHostCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type KycStatus = 'pending' | 'approved' | 'rejected' | 'all';

export const KycManagementContainer = () => {
  const [activeTab, setActiveTab] = useState<KycStatus>('pending');

  const { data: hosts, isLoading, refetch } = useQuery({
    queryKey: ['admin-kyc-hosts', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'host');

      if (activeTab === 'pending') {
        query = query.is('kyc_verified', null);
      } else if (activeTab === 'approved') {
        query = query.eq('kyc_verified', true);
      } else if (activeTab === 'rejected') {
        query = query.eq('kyc_verified', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">Caricamento host...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Verifica KYC Host
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as KycStatus)}>
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">In Attesa</TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">Approvati</TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1">Rifiutati</TabsTrigger>
            <TabsTrigger value="all" className="flex-1">Tutti</TabsTrigger>
          </TabsList>
        </Tabs>

        {!hosts || hosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessun host trovato in questa categoria
          </div>
        ) : (
          <div className="space-y-4">
            {hosts.map((host) => (
              <KycHostCard
                key={host.id}
                host={host}
                onUpdate={handleRefresh}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
