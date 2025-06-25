
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { ProfessionalPaymentHub } from '@/components/payments/ProfessionalPaymentHub';

export const PaymentsTabContent: React.FC = () => {
  return (
    <TabsContent value="payments" className="space-y-6">
      <ProfessionalPaymentHub />
    </TabsContent>
  );
};
