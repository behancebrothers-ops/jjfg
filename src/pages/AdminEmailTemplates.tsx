import { useState } from "react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Plus, Edit, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Code, Send, Sparkles, Layout as LayoutIcon, Info } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  layout_id: string | null;
  created_at: string;
  updated_at: string;
}

interface EmailLayout {
  id: string;
  name: string;
  html_content: string;
  is_default: boolean;
}

export default function AdminEmailTemplates() {
  const [open, setOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    category: "",
    layout_id: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const { data: layouts } = useQuery({
    queryKey: ["email-layouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_layouts")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as EmailLayout[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("email_templates").insert([{
        name: data.name,
        subject: data.subject,
        body: data.body,
        category: data.category || null,
        layout_id: data.layout_id || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Success", description: "Template created successfully" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from("email_templates")
        .update({
          name: data.name,
          subject: data.subject,
          body: data.body,
          category: data.category || null,
          layout_id: data.layout_id || null,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Success", description: "Template updated successfully" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Success", description: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", subject: "", body: "", category: "", layout_id: "" });
    setEditingTemplate(null);
    setOpen(false);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category || "",
      layout_id: template.layout_id || "",
    });
    setOpen(true);
  };

  const sendTestMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-order-confirmation", {
        body: {
          type: "welcome",
          user_id: (await supabase.auth.getUser()).data.user?.id,
          test_mode: true,
          // Overriding content if possible for preview
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Test Sent", description: "Verification email sent to your inbox!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const getPreviewHtml = () => {
    const layout = layouts?.find(l => l.id === formData.layout_id) || layouts?.find(l => l.is_default);
    if (!layout) return formData.body;

    let html = layout.html_content.replace("{{content}}", formData.body);
    const variables = {
      userName: "Alex Luxee",
      orderNumber: "LX-9999",
      orderAmount: "$1,299.00",
      year: new Date().getFullYear().toString(),
    };

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      html = html.replace(regex, value);
    });

    return html;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTemplate) {
      updateMutation.mutate({ ...formData, id: editingTemplate.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <AdminNavigation />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                Email Templates
              </h1>
              <p className="text-muted-foreground mt-2">Create and manage reusable email templates</p>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="shadow-premium hover:scale-105 transition-all">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0">
                <div className="flex flex-col h-full">
                  <DialogHeader className="p-6 border-b">
                    <div className="flex items-center justify-between pr-8">
                      <div>
                        <DialogTitle className="text-2xl">{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
                        <DialogDescription>
                          Design a premium email experience for your customers.
                        </DialogDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => sendTestMutation.mutate()} disabled={sendTestMutation.isPending}>
                          <Send className="h-4 w-4 mr-2" /> Test
                        </Button>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="flex-1 flex overflow-hidden">
                    {/* Editor Side */}
                    <div className="w-1/2 flex flex-col border-r bg-muted/5">
                      <form onSubmit={handleSubmit} id="template-form" className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                              value={formData.category}
                              onValueChange={(value) => setFormData({ ...formData, category: value })}
                            >
                              <SelectTrigger id="category">
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="marketing">Marketing</SelectItem>
                                <SelectItem value="transactional">Transactional</SelectItem>
                                <SelectItem value="notification">Notification</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="layout">Master Layout</Label>
                            <Select
                              value={formData.layout_id}
                              onValueChange={(value) => setFormData({ ...formData, layout_id: value })}
                            >
                              <SelectTrigger id="layout">
                                <SelectValue placeholder="Default Layout" />
                              </SelectTrigger>
                              <SelectContent>
                                {layouts?.map(l => (
                                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="name">Internal Name</Label>
                          <Input
                            id="name"
                            placeholder="Welcome Email"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject Line</Label>
                          <Input
                            id="subject"
                            placeholder="Welcome to Luxee Store!"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            required
                          />
                        </div>

                        <div className="flex-1 flex flex-col space-y-2 min-h-[300px]">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="body">Email Body (HTML)</Label>
                            <div className="flex gap-2">
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded uppercase font-bold">HTML Supported</span>
                            </div>
                          </div>
                          <Textarea
                            id="body"
                            placeholder="<h2>Hello {{userName}}!</h2>..."
                            value={formData.body}
                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                            className="flex-1 font-mono text-sm resize-none bg-background border-primary/20"
                            required
                          />
                        </div>

                        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                          <h4 className="text-xs font-bold uppercase text-primary mb-2 flex items-center gap-2">
                            <Info className="h-3 w-3" /> Available Variables
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {["userName", "orderNumber", "orderAmount", "itemsList", "trackingLink"].map(v => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setFormData({ ...formData, body: formData.body + ` {{${v}}}` })}
                                className="text-[11px] px-2 py-1 bg-background border rounded hover:border-primary transition-colors"
                              >
                                {`{{${v}}}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      </form>
                    </div>

                    {/* Preview Side */}
                    <div className="w-1/2 bg-white flex flex-col">
                      <div className="p-2 border-b bg-muted/20 flex items-center justify-between px-4">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                          <Eye className="h-3 w-3" /> Live Preview
                        </span>
                        <Tabs defaultValue="desktop">
                          <TabsList className="h-8">
                            <TabsTrigger value="desktop" className="text-[10px] h-7 px-2">Desktop</TabsTrigger>
                            <TabsTrigger value="mobile" className="text-[10px] h-7 px-2">Mobile</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                      <div className="flex-1 overflow-hidden p-4 bg-muted/10 relative">
                        <div className="w-full h-full bg-white shadow-2xl rounded-lg overflow-hidden border">
                          <iframe
                            title="Preview"
                            srcDoc={getPreviewHtml()}
                            className="w-full h-full border-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t bg-muted/5 flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
                    <Button type="submit" form="template-form" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingTemplate ? "Save Changes" : "Create Template"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
          ) : templates?.length === 0 ? (
            <Card className="border-primary/20">
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
                <p className="text-muted-foreground mb-4">Create your first email template to get started</p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates?.map((template) => (
                <Card key={template.id} className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.category && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                            {template.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <CardDescription className="mt-2 font-semibold">
                      Subject: {template.subject}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {template.body}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(template.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedAdminRoute>
  );
}
