import { ComplianceMonitoring } from '@/components/admin/compliance/ComplianceMonitoring';
import { AccessGuard } from '@/components/shared/access/AccessGuard';

const AdminCompliancePage = () => {
  return (
    <AccessGuard requiredRoles={['admin']}>
      <div className="container mx-auto py-6 px-4">
        <ComplianceMonitoring />
      </div>
    </AccessGuard>
  );
};

export default AdminCompliancePage;