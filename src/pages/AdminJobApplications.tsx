import { useState } from "react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, FileText, Mail, Phone, Download, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type JobApplication = {
  id: string;
  job_posting_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cover_letter: string | null;
  resume_path: string;
  status: string;
  created_at: string;
  job_posting: {
    title: string;
    department: string;
  } | null;
};

const AdminJobApplications = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["admin-job-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select(`
          *,
          job_posting:job_postings(title, department)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as JobApplication[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("job_applications")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-job-applications"] });
      toast.success("Application status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  const downloadResume = async (resumePath: string, applicantName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("resumes")
        .download(resumePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${applicantName.replace(/\s+/g, "_")}_resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Resume downloaded");
    } catch (error: any) {
      toast.error("Failed to download resume: " + error.message);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.job_posting?.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "reviewing":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "accepted":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      default:
        return "bg-muted";
    }
  };

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <AdminNavigation />

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Job Applications
            </h1>
            {isLoading ? (
              <Skeleton className="h-5 w-40" />
            ) : (
              <p className="text-muted-foreground">
                {filteredApplications.length} applications
              </p>
            )}
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6 shadow-lg border-primary/10">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search applications..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Applications List */}
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-24 w-full" />
                </Card>
              ))
            ) : filteredApplications.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No applications found</p>
              </Card>
            ) : (
              filteredApplications.map((application) => (
                <Card
                  key={application.id}
                  className="p-6 hover:shadow-xl transition-all border-l-4 border-l-primary/20 hover:border-l-primary"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-1">
                            {application.full_name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {application.job_posting?.title} •{" "}
                            {application.job_posting?.department}
                          </p>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {application.email}
                            </div>
                            {application.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {application.phone}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className={getStatusColor(application.status)}>
                          {application.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Applied {format(new Date(application.created_at), "PPP")}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(application);
                          setDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          downloadResume(
                            application.resume_path,
                            application.full_name
                          )
                        }
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Resume
                      </Button>
                      <Select
                        value={application.status}
                        onValueChange={(value) =>
                          updateStatusMutation.mutate({
                            id: application.id,
                            status: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Application Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Position</h3>
                  <p className="text-sm">
                    {selectedApplication.job_posting?.title} •{" "}
                    {selectedApplication.job_posting?.department}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Applicant Information</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Name:</strong> {selectedApplication.full_name}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedApplication.email}
                    </p>
                    {selectedApplication.phone && (
                      <p>
                        <strong>Phone:</strong> {selectedApplication.phone}
                      </p>
                    )}
                    <p>
                      <strong>Applied:</strong>{" "}
                      {format(new Date(selectedApplication.created_at), "PPP")}
                    </p>
                  </div>
                </div>
                {selectedApplication.cover_letter && (
                  <div>
                    <h3 className="font-semibold mb-2">Cover Letter</h3>
                    <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">
                      {selectedApplication.cover_letter}
                    </div>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() =>
                    downloadResume(
                      selectedApplication.resume_path,
                      selectedApplication.full_name
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Resume
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedAdminRoute>
  );
};

export default AdminJobApplications;
