import { useState } from "react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Users, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminEmails() {
  const [searchQuery, setSearchQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const { toast } = useToast();

  const { data: subscribers, isLoading } = useQuery({
    queryKey: ["newsletter-subscribers", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("newsletter_subscribers")
        .select("*")
        .eq("subscribed", true);

      if (searchQuery) {
        query = query.ilike("email", `%${searchQuery}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setMessage(template.body);
    }
  };

  const handleSendBulkEmail = async () => {
    if (!subject || !message) {
      toast({
        title: "Error",
        description: "Please fill in both subject and message",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-bulk-email", {
        body: {
          subject,
          message,
          subscribers: subscribers?.map(s => s.email) || [],
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Email sent to ${subscribers?.length || 0} subscribers`,
      });

      setSubject("");
      setMessage("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send emails. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <AdminNavigation />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-3">
              <Mail className="h-8 w-8 text-primary" />
              Email Management
            </h1>
            <p className="text-muted-foreground mt-2">Send newsletters and manage email subscribers</p>
          </div>

          <Tabs defaultValue="compose" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="compose">Compose Email</TabsTrigger>
              <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
            </TabsList>

            <TabsContent value="compose">
              <Card className="border-primary/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Send Bulk Email
                  </CardTitle>
                  <CardDescription>
                    Compose and send emails to all newsletter subscribers ({subscribers?.length || 0} subscribers)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Use Template (Optional)</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                    >
                      <option value="">-- Select a template --</option>
                      {templates?.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      placeholder="Enter email subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <Textarea
                      placeholder="Enter your email message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={10}
                      className="resize-none"
                    />
                  </div>
                  <Button
                    onClick={handleSendBulkEmail}
                    disabled={sending || !subject || !message}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? "Sending..." : `Send to ${subscribers?.length || 0} Subscribers`}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscribers">
              <Card className="border-primary/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Newsletter Subscribers
                  </CardTitle>
                  <CardDescription>
                    View and manage your email subscribers
                  </CardDescription>
                  
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search subscribers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : subscribers?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No subscribers found</div>
                  ) : (
                    <div className="space-y-2">
                      {subscribers?.map((subscriber) => (
                        <div
                          key={subscriber.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xs font-semibold">
                              {subscriber.email.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{subscriber.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Subscribed {new Date(subscriber.created_at || "").toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedAdminRoute>
  );
}
