import { FiscalManagementContainer } from '@/components/admin/fiscal/FiscalManagementContainer';
import { AccessGuard } from '@/components/shared/access/AccessGuard';
import { LoadingSkeleton } from '@/components/shared/access/LoadingSkeleton';

const AdminFiscalPage = () => {
  return (
    <AccessGuard 
      requiredRoles={['admin']}
      loadingFallback={<LoadingSkeleton />}
    >
      <FiscalManagementContainer />
    </AccessGuard>
  );
};

export default AdminFiscalPage;
