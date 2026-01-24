import { useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type ProtectedAdminRouteProps = {
  children: ReactNode;
};

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isLoading, isAuthenticated } = useAdminAuth();

  useEffect(() => {
    // Only redirect after loading is complete
    if (!isLoading) {
      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to access the admin panel",
          variant: "destructive",
        });
        navigate('/admin/auth');
      } else if (!isAdmin) {
        toast({
          title: "Access Denied",
          description: "You do not have administrator privileges",
          variant: "destructive",
        });
        navigate('/');
      }
    }
  }, [isAdmin, isLoading, isAuthenticated, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
