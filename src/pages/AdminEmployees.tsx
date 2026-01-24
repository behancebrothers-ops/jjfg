import { useState } from "react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Shield, UserPlus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Employee {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

export default function AdminEmployees() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-admin-users");

      if (error) throw error;

      return data as Employee[];
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('remove-admin-role', {
        body: { userId }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
      toast({
        title: "Success",
        description: "Admin access has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin access. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredEmployees = employees?.filter(emp =>
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <AdminNavigation />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Employee Management
            </h1>
            <p className="text-muted-foreground mt-2">Manage admin team members and permissions</p>
          </div>

          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle>Admin Team</CardTitle>
              <CardDescription>View and manage administrators with access to the admin panel</CardDescription>
              
              <div className="flex gap-2 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredEmployees?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No employees found</div>
              ) : (
                <div className="space-y-3">
                  {filteredEmployees?.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
                          {employee.email.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{employee.full_name || "No Name"}</p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Admin Access?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove admin privileges from {employee.email}. They will no longer have access to the admin panel.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeAdminMutation.mutate(employee.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove Access
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </ProtectedAdminRoute>
  );
}
