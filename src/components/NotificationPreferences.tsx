import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, Package, Truck, CheckCircle, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface NotificationPrefs {
  id: string;
  user_id: string;
  order_confirmation: boolean;
  order_shipped: boolean;
  order_delivered: boolean;
  marketing_emails: boolean;
}

export const NotificationPreferences = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<Partial<NotificationPrefs>>({
    order_confirmation: true,
    order_shipped: true,
    order_delivered: true,
    marketing_emails: true,
  });

  // Fetch current preferences
  const { isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newPrefs, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            order_confirmation: true,
            order_shipped: true,
            order_delivered: true,
            marketing_emails: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newPrefs);
        return newPrefs;
      }

      setPreferences(data);
      return data;
    },
  });

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: async (newPrefs: Partial<NotificationPrefs>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("notification_preferences")
        .update(newPrefs)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update preferences.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof NotificationPrefs, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
  };

  const handleSave = () => {
    updateMutation.mutate(preferences);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Loading your notification preferences...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Choose which email notifications you want to receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Updates */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-3">Order Updates</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Get notified about your order status changes
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="order-confirmation" className="text-sm font-medium">
                    Order Confirmation
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive confirmation when your order is placed
                  </p>
                </div>
              </div>
              <Switch
                id="order-confirmation"
                checked={preferences.order_confirmation}
                onCheckedChange={(checked) => handleToggle("order_confirmation", checked)}
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="order-shipped" className="text-sm font-medium">
                    Shipping Updates
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when your order ships with tracking details
                  </p>
                </div>
              </div>
              <Switch
                id="order-shipped"
                checked={preferences.order_shipped}
                onCheckedChange={(checked) => handleToggle("order_shipped", checked)}
              />
            </div>

            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="order-delivered" className="text-sm font-medium">
                    Delivery Confirmation
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Know when your order has been delivered
                  </p>
                </div>
              </div>
              <Switch
                id="order-delivered"
                checked={preferences.order_delivered}
                onCheckedChange={(checked) => handleToggle("order_delivered", checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Marketing */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-3">Marketing & Promotions</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Stay updated with our latest offers and news
            </p>
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <Label htmlFor="marketing-emails" className="text-sm font-medium">
                  Promotional Emails
                </Label>
                <p className="text-xs text-muted-foreground">
                  Receive news about sales, new arrivals, and exclusive offers
                </p>
              </div>
            </div>
            <Switch
              id="marketing-emails"
              checked={preferences.marketing_emails}
              onCheckedChange={(checked) => handleToggle("marketing_emails", checked)}
            />
          </div>
        </div>

        <Separator />

        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Preferences"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
