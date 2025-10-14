import { AccessGuard } from '@/components/shared/access/AccessGuard';
import { LoadingSkeleton } from '@/components/shared/access/LoadingSkeleton';
import { FiscalDashboardContainer } from '@/components/host/fiscal/FiscalDashboardContainer';

const HostFiscalPage = () => {
  return (
    <AccessGuard 
      requiredRoles={['host', 'admin']}
      loadingFallback={<LoadingSkeleton />}
    >
      <div className="container mx-auto py-6 px-4">
        <FiscalDashboardContainer />
      </div>
    </AccessGuard>
  );
};

export default HostFiscalPage;
