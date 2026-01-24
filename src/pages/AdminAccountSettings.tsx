import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { EmailTwoFactorSetup } from "@/components/EmailTwoFactorSetup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Shield } from "lucide-react";

export default function AdminAccountSettings() {
  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <AdminNavigation />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              Account Settings
            </h1>
            <p className="text-muted-foreground mt-2">Manage your admin account security and preferences</p>
          </div>

          <div className="space-y-6">
            <Card className="border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security to your admin account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmailTwoFactorSetup />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </ProtectedAdminRoute>
  );
}
