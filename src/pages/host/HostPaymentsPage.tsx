import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { HostPaymentsDashboard } from '@/components/host/payments/HostPaymentsDashboard';

const HostPaymentsPage = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">I Miei Pagamenti</h1>
        <p className="text-muted-foreground mt-2">
          Gestisci e monitora tutti i pagamenti ricevuti dalle tue prenotazioni
        </p>
      </div>
      <HostPaymentsDashboard />
    </div>
  );
};

export default HostPaymentsPage;
