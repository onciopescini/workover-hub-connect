
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UserWaitlists from "@/components/waitlist/UserWaitlists";

const WaitlistsPage = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Le mie liste d'attesa</CardTitle>
          <p className="text-gray-600">
            Gestisci le tue liste d'attesa per spazi ed eventi
          </p>
        </CardHeader>
        <CardContent>
          <UserWaitlists />
        </CardContent>
      </Card>
    </div>
  );
};

export default WaitlistsPage;
