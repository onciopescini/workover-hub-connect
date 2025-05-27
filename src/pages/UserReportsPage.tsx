
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserReports from "@/components/reports/UserReports";

const UserReportsPage = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Le mie segnalazioni</CardTitle>
          <p className="text-gray-600">
            Visualizza lo stato delle segnalazioni che hai inviato
          </p>
        </CardHeader>
        <CardContent>
          <UserReports />
        </CardContent>
      </Card>
    </div>
  );
};

export default UserReportsPage;
