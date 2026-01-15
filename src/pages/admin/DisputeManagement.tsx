import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import LoadingScreen from "@/components/LoadingScreen";
import { DisputeDetailDialog } from "@/components/admin/DisputeDetailDialog";

export default function DisputeManagement() {
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: disputes, isLoading, refetch } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      // Fetch disputes with related data
      // Explicitly typing the join result might be tricky, so we use 'any' casting for now
      // or rely on inferred types if possible.
      const { data, error } = await supabase
        .from("disputes")
        .select(`
          *,
          profiles:opened_by (
            id,
            first_name,
            last_name,
            email
          ),
          bookings:booking_id (
            id,
            booking_date,
            start_time,
            end_time,
            payments (
              amount,
              payment_status
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Process data to calculate amounts
      return data.map((dispute: any) => {
        const payments = dispute.bookings?.payments || [];
        // Sum successful payments
        const totalAmount = payments.reduce((acc: number, payment: any) => {
          const status = payment.payment_status?.toLowerCase();
          if (status === "succeeded" || status === "paid") {
            return acc + (Number(payment.amount) || 0);
          }
          return acc;
        }, 0);

        return {
          ...dispute,
          amount: totalAmount
        };
      });
    }
  });

  const handleViewDetails = (dispute: any) => {
    setSelectedDispute(dispute);
    setIsDialogOpen(true);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dispute Resolution Center</h2>
          <p className="text-muted-foreground">
            Manage and resolve disputes between Hosts and Guests.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Disputes</CardTitle>
          <CardDescription>
            A list of all dispute cases including their current status and financial details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID/Ref</TableHead>
                  <TableHead>Opened By</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes && disputes.length > 0 ? (
                  disputes.map((dispute: any) => (
                    <TableRow key={dispute.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {dispute.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {dispute.profiles?.first_name} {dispute.profiles?.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {dispute.profiles?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <span className="line-clamp-1 text-sm" title={dispute.reason}>
                          {dispute.reason}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            dispute.status === 'resolved' ? 'default' :
                            dispute.status === 'refunded' ? 'secondary' :
                            'destructive'
                          }
                          className={dispute.status === 'resolved' ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                          {dispute.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(dispute.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {dispute.amount > 0 ? `€${dispute.amount.toFixed(2)}` : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(dispute)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No disputes found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DisputeDetailDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        dispute={selectedDispute}
        onUpdate={refetch}
      />
    </div>
  );
}
