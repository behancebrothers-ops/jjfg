import { useState, useEffect, useRef } from "react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, Eye, Calendar, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";

interface Advertisement {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  display_frequency: string;
  created_at: string;
}

const AdminAdvertisements = () => {
  const { toast } = useToast();
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    link_url: "",
    active: true,
    priority: 0,
    start_date: "",
    end_date: "",
    display_frequency: "once_per_session",
  });

  useEffect(() => {
    fetchAdvertisements();
  }, []);

  const fetchAdvertisements = async () => {
    try {
      const { data, error } = await supabase
        .from("advertisements")
        .select("*")
        .order("priority", { ascending: false });

      if (error) throw error;
      setAdvertisements(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10485760) {
      toast({
        title: "File too large",
        description: "Image must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `advertisements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleOpenDialog = (ad?: Advertisement) => {
    if (ad) {
      setEditingAd(ad);
      setFormData({
        title: ad.title,
        image_url: ad.image_url,
        link_url: ad.link_url || "",
        active: ad.active,
        priority: ad.priority,
        start_date: ad.start_date ? ad.start_date.split('T')[0] : "",
        end_date: ad.end_date ? ad.end_date.split('T')[0] : "",
        display_frequency: ad.display_frequency,
      });
    } else {
      setEditingAd(null);
      setFormData({
        title: "",
        image_url: "",
        link_url: "",
        active: true,
        priority: 0,
        start_date: "",
        end_date: "",
        display_frequency: "once_per_session",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.image_url) {
      toast({
        title: "Validation Error",
        description: "Title and image are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        title: formData.title,
        image_url: formData.image_url,
        link_url: formData.link_url || null,
        active: formData.active,
        priority: formData.priority,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        display_frequency: formData.display_frequency,
      };

      if (editingAd) {
        const { error } = await supabase
          .from("advertisements")
          .update(payload)
          .eq("id", editingAd.id);

        if (error) throw error;
        toast({ title: "Success", description: "Advertisement updated" });
      } else {
        const { error } = await supabase
          .from("advertisements")
          .insert(payload);

        if (error) throw error;
        toast({ title: "Success", description: "Advertisement created" });
      }

      setDialogOpen(false);
      fetchAdvertisements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this advertisement?")) return;

    try {
      const { error } = await supabase
        .from("advertisements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Advertisement deleted" });
      fetchAdvertisements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("advertisements")
        .update({ active })
        .eq("id", id);

      if (error) throw error;
      fetchAdvertisements();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <AdminNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Advertisements
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage popup flyers and promotional advertisements
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Advertisement
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Advertisements</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : advertisements.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No advertisements yet</p>
                <Button onClick={() => handleOpenDialog()} className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Ad
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advertisements.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell>
                        <div 
                          className="w-16 h-16 rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 ring-primary transition-all"
                          onClick={() => {
                            setPreviewImage(ad.image_url);
                            setPreviewOpen(true);
                          }}
                        >
                          <img
                            src={ad.image_url}
                            alt={ad.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{ad.title}</TableCell>
                      <TableCell>
                        {ad.link_url ? (
                          <a 
                            href={ad.link_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <LinkIcon className="h-3 w-3" />
                            Link
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted">
                          {ad.display_frequency.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell>{ad.priority}</TableCell>
                      <TableCell>
                        <Switch
                          checked={ad.active}
                          onCheckedChange={(checked) => handleToggleActive(ad.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPreviewImage(ad.image_url);
                              setPreviewOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(ad)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(ad.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAd ? "Edit Advertisement" : "Create Advertisement"}
            </DialogTitle>
            <DialogDescription>
              Upload a flyer image that will popup on the website
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Summer Sale 2024"
              />
            </div>

            <div className="space-y-2">
              <Label>Flyer Image *</Label>
              <div className="flex gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload Image"}
                </Button>
                {formData.image_url && (
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted border">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link URL (optional)</Label>
              <Input
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="e.g., /sale or https://example.com"
              />
              <p className="text-xs text-muted-foreground">
                Where users go when they click the ad
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Frequency</Label>
                <Select
                  value={formData.display_frequency}
                  onValueChange={(value) => setFormData({ ...formData, display_frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once_per_session">Once per session</SelectItem>
                    <SelectItem value="once_per_day">Once per day</SelectItem>
                    <SelectItem value="always">Always</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="Higher = shown first"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  End Date
                </Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Show this advertisement on the website
                </p>
              </div>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingAd ? "Save Changes" : "Create Advertisement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Advertisement Preview</DialogTitle>
          <DialogDescription className="sr-only">Preview of the advertisement image</DialogDescription>
          <img
            src={previewImage}
            alt="Advertisement preview"
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAdvertisements;
