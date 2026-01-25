import { useState } from "react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Eye, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReturnRequest {
  id: string;
  order_id: string;
  user_id: string | null;
  reason: string;
  status: string | null;
  notes: string | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
  order?: {
    order_number: string;
    total: number;
    profile?: {
      email: string | null;
      full_name: string | null;
    } | null;
  } | null;
}

const AdminReturns = () => {
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  // Fetch all return requests from the returns table
  const { data: returns, isLoading } = useQuery({
    queryKey: ["admin-returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("returns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with order and profile data
      const enrichedData = await Promise.all(
        (data || []).map(async (returnRequest) => {
          const { data: order } = await supabase
            .from("orders")
            .select("order_number, total, user_id")
            .eq("id", returnRequest.order_id)
            .maybeSingle();

          let profile = null;
          if (order?.user_id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("id", order.user_id)
              .maybeSingle();
            profile = profileData;
          }

          return { 
            ...returnRequest, 
            order: order ? { ...order, profile } : null 
          } as ReturnRequest;
        })
      );

      return enrichedData;
    },
  });

  // Update return status mutation
  const updateReturnMutation = useMutation({
    mutationFn: async ({
      returnId,
      status,
      notes,
      refund,
    }: {
      returnId: string;
      status: string;
      notes: string;
      refund: string;
    }) => {
      const updateData: Record<string, unknown> = {
        status,
        notes,
        updated_at: new Date().toISOString(),
      };

      if (refund) {
        updateData.refund_amount = parseFloat(refund);
      }

      const { error } = await supabase
        .from("returns")
        .update(updateData)
        .eq("id", returnId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-returns"] });
      toast.success("Return request updated successfully");
      setReturnDialogOpen(false);
      setAdminNotes("");
      setRefundAmount("");
    },
    onError: (error) => {
      console.error("Error updating return:", error);
      toast.error("Failed to update return request");
    },
  });

  const handleViewReturn = (returnRequest: ReturnRequest) => {
    setSelectedReturn(returnRequest);
    setAdminNotes(returnRequest.notes || "");
    setRefundAmount(returnRequest.refund_amount?.toString() || "");
    setReturnDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedReturn) return;
    updateReturnMutation.mutate({
      returnId: selectedReturn.id,
      status: "approved",
      notes: adminNotes,
      refund: refundAmount,
    });
  };

  const handleReject = () => {
    if (!selectedReturn) return;
    updateReturnMutation.mutate({
      returnId: selectedReturn.id,
      status: "rejected",
      notes: adminNotes,
      refund: "",
    });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "approved":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      case "completed":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  // Filter returns by status
  const filteredReturns = returns?.filter((ret) => {
    if (statusFilter === "all") return true;
    return ret.status === statusFilter;
  });

  const statusCounts = {
    all: returns?.length || 0,
    pending: returns?.filter((r) => r.status === "pending").length || 0,
    approved: returns?.filter((r) => r.status === "approved").length || 0,
    rejected: returns?.filter((r) => r.status === "rejected").length || 0,
    completed: returns?.filter((r) => r.status === "completed").length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Returns Management</h1>
          <p className="text-muted-foreground">Review and process customer return requests</p>
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-8">
          <TabsList>
            <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({statusCounts.pending})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({statusCounts.approved})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({statusCounts.rejected})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({statusCounts.completed})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Return Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : filteredReturns && filteredReturns.length > 0 ? (
              <div className="space-y-4">
                {filteredReturns.map((returnRequest) => (
                  <div
                    key={returnRequest.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">
                            Order #{returnRequest.order?.order_number || 'N/A'}
                          </h3>
                          <Badge className={getStatusColor(returnRequest.status)}>
                            {returnRequest.status || 'pending'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Customer: {returnRequest.order?.profile?.full_name || "N/A"} ({returnRequest.order?.profile?.email || 'N/A'})
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReturn(returnRequest)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Reason:</p>
                        <p className="text-sm text-muted-foreground">{returnRequest.reason}</p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          Requested: {format(new Date(returnRequest.created_at), "PPp")}
                        </p>
                        {returnRequest.refund_amount && (
                          <p className="font-semibold">
                            Refund: ${returnRequest.refund_amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No return requests found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Return Details Dialog */}
        <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Return Request</DialogTitle>
            </DialogHeader>

            {selectedReturn && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Order Number</p>
                      <p className="font-medium">#{selectedReturn.order?.order_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">
                        {selectedReturn.order?.profile?.full_name || "N/A"}
                      </p>
                      <p className="text-sm">{selectedReturn.order?.profile?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Order Total</p>
                      <p className="font-medium">
                        ${(selectedReturn.order?.total || 0).toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Return Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge className={getStatusColor(selectedReturn.status)}>
                        {selectedReturn.status || 'pending'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reason</p>
                      <p className="font-medium">{selectedReturn.reason}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Requested Date</p>
                      <p className="font-medium">
                        {format(new Date(selectedReturn.created_at), "PPp")}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Refund Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Enter refund amount"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Admin Notes
                    </label>
                    <Textarea
                      placeholder="Add notes about this return..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={4}
                    />
                  </div>

                  {selectedReturn.status === "pending" && (
                    <div className="flex gap-3">
                      <Button
                        className="flex-1"
                        variant="default"
                        onClick={handleApprove}
                        disabled={updateReturnMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve Return
                      </Button>
                      <Button
                        className="flex-1"
                        variant="destructive"
                        onClick={handleReject}
                        disabled={updateReturnMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject Return
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminReturns;