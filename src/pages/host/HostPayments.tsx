
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, CreditCard, Download, Calendar, ArrowUpRight, ArrowDownLeft } from "lucide-react";

const HostPayments = () => {
  // Placeholder payment data
  const paymentStats = {
    availableBalance: 1250.50,
    pendingPayouts: 340.25,
    thisMonthEarnings: 2100.75,
    lastPayoutDate: "2024-01-10"
  };

  const recentTransactions = [
    {
      id: 1,
      type: "earning",
      description: "Prenotazione Sala Riunioni A",
      amount: 120.00,
      date: "2024-01-15",
      status: "completed",
      customer: "Marco Rossi"
    },
    {
      id: 2,
      type: "payout",
      description: "Payout settimanale",
      amount: -850.00,
      date: "2024-01-10",
      status: "completed",
      customer: null
    },
    {
      id: 3,
      type: "earning",
      description: "Prenotazione Postazione Desk",
      amount: 35.00,
      date: "2024-01-14",
      status: "pending",
      customer: "Sara Bianchi"
    },
    {
      id: 4,
      type: "earning",
      description: "Prenotazione Sala Conferenze",
      amount: 200.00,
      date: "2024-01-13",
      status: "completed",
      customer: "Luca Verde"
    }
  ];

  const upcomingPayouts = [
    {
      id: 1,
      amount: 340.25,
      date: "2024-01-17",
      status: "scheduled"
    },
    {
      id: 2,
      amount: 125.50,
      date: "2024-01-24",
      status: "pending"
    }
  ];

  const getTransactionIcon = (type: string) => {
    return type === "earning" ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownLeft className="h-4 w-4 text-blue-600" />
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completato</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">In attesa</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-800">Programmato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout
      title="Gestione Pagamenti"
      subtitle="Monitora i tuoi guadagni e payout"
    >
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Payment Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Disponibile</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{paymentStats.availableBalance}</div>
              <p className="text-xs text-muted-foreground">
                Pronto per il payout
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payout in Sospeso</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{paymentStats.pendingPayouts}</div>
              <p className="text-xs text-muted-foreground">
                In elaborazione
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Guadagni del Mese</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{paymentStats.thisMonthEarnings}</div>
              <p className="text-xs text-muted-foreground">
                +18% dal mese scorso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ultimo Payout</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paymentStats.lastPayoutDate}</div>
              <p className="text-xs text-muted-foreground">
                Payout settimanale
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
            <CardDescription>Gestisci i tuoi pagamenti e payout</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button className="flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Richiedi Payout
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Scarica Estratto Conto
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Gestisci Metodi di Pagamento
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions">Transazioni</TabsTrigger>
            <TabsTrigger value="payouts">Payout</TabsTrigger>
            <TabsTrigger value="settings">Impostazioni</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transazioni Recenti</CardTitle>
                <CardDescription>Cronologia dei pagamenti ricevuti</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          {transaction.customer && (
                            <p className="text-sm text-gray-600">{transaction.customer}</p>
                          )}
                          <p className="text-xs text-gray-500">{transaction.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.amount > 0 ? "text-green-600" : "text-blue-600"
                        }`}>
                          {transaction.amount > 0 ? "+" : ""}€{Math.abs(transaction.amount)}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payout Programmati</CardTitle>
                  <CardDescription>I tuoi prossimi pagamenti</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingPayouts.map((payout) => (
                      <div key={payout.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Payout automatico</p>
                          <p className="text-sm text-gray-600">{payout.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">€{payout.amount}</p>
                          {getStatusBadge(payout.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Impostazioni Payout</CardTitle>
                  <CardDescription>Configura i tuoi payout automatici</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Payout Automatici</p>
                      <p className="text-sm text-gray-600">Ricevi i tuoi guadagni automaticamente</p>
                    </div>
                    <Button variant="outline">Configura</Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Frequenza Payout</p>
                      <p className="text-sm text-gray-600">Settimanale (ogni martedì)</p>
                    </div>
                    <Button variant="outline">Modifica</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Impostazioni Pagamento</CardTitle>
                <CardDescription>Gestisci i tuoi metodi di pagamento e fatturazione</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Conto Bancario Principale</p>
                      <p className="text-sm text-gray-600">•••• •••• •••• 1234</p>
                    </div>
                    <Button variant="outline">Modifica</Button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Informazioni Fatturazione</p>
                      <p className="text-sm text-gray-600">Configurazione completa</p>
                    </div>
                    <Button variant="outline">Gestisci</Button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Notifiche Pagamento</p>
                      <p className="text-sm text-gray-600">Email e push attive</p>
                    </div>
                    <Button variant="outline">Configura</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default HostPayments;
